"""Enhanced multi-factor scoring engine for prospect ranking.

Scores contacts on three dimensions:
  - Fit Score (0-50): affiliation, role relevance, company stage, geography, industry
  - Signal Score (0-30): warm signals weighted by recency
  - Engagement Score (0-20): email quality, LinkedIn presence, mutual connections

Tiers:
  - Hot (80-100): Immediate personalized outreach
  - Warm (60-79): Queue for outreach within 48 hours
  - Monitor (40-59): Watch for additional signals
  - Cold (<40): Skip or batch for later
"""

from __future__ import annotations

from datetime import datetime, timedelta

import database as db


# ─── Fit Score Components (0-50) ──────────────────────────────────────

def _score_affiliation(contact: dict) -> float:
    """Score based on shared affiliations (max 15)."""
    affiliations = str(contact.get("affiliations", "")).lower()
    score = 0

    if "chi phi" in affiliations:
        score = max(score, 15)
    elif "kenan-flagler" in affiliations:
        score = max(score, 12)
    elif "unc faculty" in affiliations:
        score = max(score, 14)
    elif "unc alumni" in affiliations:
        score = max(score, 10)
    elif "duke" in affiliations or "nc state" in affiliations:
        score = max(score, 5)

    # Bonus for consulting background
    if "consulting background" in affiliations:
        score += 3

    return min(score, 15)


def _score_role_relevance(contact: dict) -> float:
    """Score based on how reachable/relevant the role is (max 10)."""
    title = str(contact.get("title", "")).lower()

    # Hiring-related roles are highest value for internship outreach
    if any(r in title for r in ["recruiter", "talent", "hiring", "people operations", "hr"]):
        return 10
    if any(r in title for r in ["founder", "co-founder", "ceo"]):
        return 10
    if any(r in title for r in ["professor", "faculty", "lecturer", "dean"]):
        return 9
    if any(r in title for r in ["cto", "coo", "cfo", "president"]):
        return 8
    if any(r in title for r in ["vp", "vice president", "head of", "managing director"]):
        return 7
    if any(r in title for r in ["director", "partner"]):
        return 6
    if any(r in title for r in ["manager", "lead"]):
        return 4
    if any(r in title for r in ["engineer", "analyst", "associate"]):
        return 2
    return 1


def _score_company_stage(contact: dict) -> float:
    """Score based on company stage — startups more accessible (max 8)."""
    industry = str(contact.get("company_industry", "")).lower()
    description = str(contact.get("description", "")).lower()
    text = industry + " " + description

    score = 0
    if "startup" in text or "early-stage" in text or "seed" in text:
        score = 8
    elif "series a" in text or "series b" in text:
        score = 7
    elif "vc" in industry:
        score = 6
    elif any(kw in text for kw in ["growth", "scale", "expanding"]):
        score = 5
    elif any(kw in text for kw in ["enterprise", "fortune", "global"]):
        score = 2
    else:
        score = 4  # Unknown = mid-range

    return score


def _score_geography(contact: dict) -> float:
    """Score based on geographic proximity (max 8)."""
    location = str(contact.get("company_location", "")).lower()
    linkedin_location = str(contact.get("linkedin_location", "")).lower()
    text = location + " " + linkedin_location

    if any(loc in text for loc in ["chapel hill", "durham", "raleigh"]):
        return 8
    if "research triangle" in text:
        return 8
    if "charlotte" in text:
        return 5
    if "charleston" in text:
        return 6
    if "north carolina" in text:
        return 5
    if "remote" in text:
        return 4
    return 1


def _score_industry_match(contact: dict) -> float:
    """Score based on industry alignment with Sam's interests (max 9)."""
    industry = str(contact.get("company_industry", "")).lower()
    title = str(contact.get("title", "")).lower()
    text = industry + " " + title

    score = 0

    # Fintech — top match
    if "fintech" in text or "financial technology" in text:
        score += 5

    # AI — top match
    if any(kw in text for kw in ["ai", "artificial intelligence", "machine learning",
                                  "data science", "deep learning"]):
        score += 5

    # VC — strategic for portfolio intros
    if "vc" in text or "venture capital" in text:
        score += 4

    # SaaS/startup — good cultural fit
    if "saas" in text or "startup" in text:
        score += 3

    # Consulting — aligned with strategy interest
    if "consulting" in text:
        score += 3

    # Financial services — tangentially aligned
    if "financial services" in text:
        score += 3

    return min(score, 9)


def _get_max_lift(overrides: dict, dimension: str, features: list[str]) -> float:
    """Get the maximum lift factor for a contact's features in a dimension."""
    dim_overrides = overrides.get(dimension, {})
    if not dim_overrides or not features:
        return 1.0
    lifts = [dim_overrides.get(f, 1.0) for f in features]
    return max(lifts) if lifts else 1.0


def compute_fit_score(contact: dict, weight_overrides: dict | None = None) -> float:
    """Compute the fit score (0-50) for a contact.

    weight_overrides: optional {dimension: {feature: lift_factor}} from
    preference learning. Each sub-score is multiplied by the max lift
    among the contact's matching features for that dimension.
    """
    affiliation = _score_affiliation(contact)
    role = _score_role_relevance(contact)
    stage = _score_company_stage(contact)
    geography = _score_geography(contact)
    industry = _score_industry_match(contact)

    if weight_overrides:
        from feature_extractor import extract_features

        features = extract_features(contact)
        affiliation *= _get_max_lift(weight_overrides, "affiliation", features.get("affiliation", []))
        role *= _get_max_lift(weight_overrides, "role", features.get("role", []))
        stage *= _get_max_lift(weight_overrides, "company_stage", features.get("company_stage", []))
        geography *= _get_max_lift(weight_overrides, "geography", features.get("geography", []))
        industry *= _get_max_lift(weight_overrides, "industry", features.get("industry", []))

    total = affiliation + role + stage + geography + industry
    return min(total, 50)


# ─── Signal Score (0-30) ──────────────────────────────────────────────

def _recency_multiplier(detected_at: str) -> float:
    """Compute recency multiplier for a signal based on when it was detected."""
    try:
        detected = datetime.fromisoformat(detected_at)
    except (ValueError, TypeError):
        return 0.5  # Unknown date = moderate weight

    age = datetime.now() - detected
    if age <= timedelta(days=7):
        return 1.0
    elif age <= timedelta(days=30):
        return 0.7
    elif age <= timedelta(days=90):
        return 0.4
    else:
        return 0.1


def compute_signal_score(contact: dict) -> float:
    """
    Compute signal score (0-30) from warm signals.
    Uses top 3 signals weighted by recency.
    """
    signals = contact.get("signals", [])
    if not signals:
        return 0

    # Sort by strength descending
    sorted_signals = sorted(signals, key=lambda s: s.get("strength", 0), reverse=True)

    # Take top 3 signals, weight by recency
    total = 0
    for signal in sorted_signals[:3]:
        strength = signal.get("strength", 0)
        detected_at = signal.get("detected_at", "")
        multiplier = _recency_multiplier(detected_at)
        total += strength * multiplier

    return min(total, 30)


# ─── Engagement Score (0-20) ──────────────────────────────────────────

def compute_engagement_score(contact: dict) -> float:
    """Compute engagement score (0-20) based on data quality and reachability."""
    score = 0

    # Email quality
    email_status = str(contact.get("email_verified", contact.get("email_status", ""))).lower()
    if email_status == "hunter_found":
        score += 8
    elif email_status == "pattern_match":
        score += 4
    elif contact.get("email"):
        score += 2

    # LinkedIn presence
    if contact.get("linkedin_url"):
        score += 4

    # Mutual connection potential (if we have affiliation data, there may be mutual connections)
    affiliations = str(contact.get("affiliations", "")).lower()
    if any(kw in affiliations for kw in ["chi phi", "kenan-flagler", "unc"]):
        score += 8  # High chance of mutual connections through UNC network

    return min(score, 20)


# ─── Main Scoring Function ────────────────────────────────────────────

def score_contact(contact: dict, weight_overrides: dict | None = None) -> dict:
    """
    Compute all scores for a contact.

    Returns the contact dict updated with:
      - fit_score, signal_score, engagement_score, total_score, tier

    weight_overrides: optional learned preference weights from preference_learner.
    """
    fit = compute_fit_score(contact, weight_overrides=weight_overrides)
    signal = compute_signal_score(contact)
    engagement = compute_engagement_score(contact)
    total = fit + signal + engagement

    # Determine tier
    if total >= 80:
        tier = "hot"
    elif total >= 60:
        tier = "warm"
    elif total >= 40:
        tier = "monitor"
    else:
        tier = "cold"

    contact["fit_score"] = round(fit, 1)
    contact["signal_score"] = round(signal, 1)
    contact["engagement_score"] = round(engagement, 1)
    contact["priority_score"] = round(total, 1)
    contact["tier"] = tier

    return contact


def score_contacts(contacts: list[dict], save_to_db: bool = True) -> list[dict]:
    """Score all contacts and optionally save to database."""
    for contact in contacts:
        score_contact(contact)

    # Save to DB if contact IDs are available
    if save_to_db:
        for contact in contacts:
            contact_id = contact.get("db_id")
            if contact_id:
                db.save_score(
                    contact_id,
                    contact["fit_score"],
                    contact["signal_score"],
                    contact["engagement_score"],
                    contact["priority_score"],
                    contact["tier"],
                )

    # Sort by total score descending
    contacts.sort(key=lambda c: c.get("priority_score", 0), reverse=True)

    # Summary
    tiers = {"hot": 0, "warm": 0, "monitor": 0, "cold": 0}
    for c in contacts:
        tiers[c.get("tier", "cold")] += 1

    print(f"\n  Scoring complete:")
    print(f"    Hot (80+):     {tiers['hot']}")
    print(f"    Warm (60-79):  {tiers['warm']}")
    print(f"    Monitor (40-59): {tiers['monitor']}")
    print(f"    Cold (<40):    {tiers['cold']}")

    return contacts


if __name__ == "__main__":
    # Test scoring with a mock contact
    test_contact = {
        "name": "Jane Doe",
        "title": "CEO",
        "company": "FinAI Corp",
        "company_industry": "fintech, AI",
        "company_location": "Durham, NC",
        "description": "AI-powered financial analytics startup",
        "affiliations": "Kenan-Flagler",
        "affiliation_boost": 25,
        "email": "jane@finaicorp.com",
        "email_verified": "hunter_found",
        "linkedin_url": "https://linkedin.com/in/janedoe",
        "signals": [
            {"signal_type": "funding", "description": "Raised $5M Series A", "strength": 7, "detected_at": "2026-03-20"},
            {"signal_type": "hiring", "description": "Hiring: 8 open roles", "strength": 7, "detected_at": "2026-03-25"},
        ],
    }

    result = score_contact(test_contact)
    print(f"Contact: {result['name']}")
    print(f"  Fit:        {result['fit_score']}/50")
    print(f"  Signal:     {result['signal_score']}/30")
    print(f"  Engagement: {result['engagement_score']}/20")
    print(f"  TOTAL:      {result['priority_score']}/100")
    print(f"  Tier:       {result['tier']}")
