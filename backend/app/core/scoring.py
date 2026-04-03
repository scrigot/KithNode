"""Preference-driven multi-factor scoring engine for prospect ranking.

Scores contacts on three dimensions:
  - Fit Score (0-50): affiliation, role, company match, geography, industry
  - Signal Score (0-30): warm signals weighted by recency
  - Engagement Score (0-20): email quality, LinkedIn presence, mutual connections

All fit sub-scores read from user preferences stored in the database.
When no preferences are set, uses sensible defaults.

Tiers:
  - Hot (80-100): Immediate personalized outreach
  - Warm (60-79): Queue for outreach within 48 hours
  - Monitor (40-59): Watch for additional signals
  - Cold (<40): Skip or batch for later
"""

from __future__ import annotations

from datetime import datetime, timedelta

import database as db

# ─── Default preferences (used when no user prefs are set) ───────────

_DEFAULTS = {
    "current_university": "UNC Chapel Hill",
    "target_universities": ["UNC Chapel Hill", "Kenan-Flagler", "Duke", "NC State"],
    "target_industries": ["fintech", "AI", "consulting", "VC", "SaaS"],
    "target_companies": [],
    "target_roles": ["founder", "recruiter", "alumni"],
    "greek_life": "Chi Phi",
    "target_locations": ["Chapel Hill", "Durham", "Raleigh", "Charlotte", "Charleston", "Remote"],
}


def _get_prefs(prefs: dict | None = None) -> dict:
    """Get user preferences, falling back to defaults for missing keys."""
    if prefs is None:
        prefs = {}
    result = {}
    for key, default in _DEFAULTS.items():
        result[key] = prefs.get(key, default)
    return result


# ─── Fit Score Components (0-50) ──────────────────────────────────────

def _score_affiliation(contact: dict, prefs: dict) -> float:
    """Score based on shared university/org affiliations (max 15)."""
    affiliations = str(contact.get("affiliations", "")).lower()
    education = str(contact.get("education", "")).lower()
    text = affiliations + " " + education
    score = 0

    # Greek life match (highest)
    greek = prefs.get("greek_life", "")
    if greek and greek.lower() in text:
        score = max(score, 15)

    # Current university match
    current_uni = prefs.get("current_university", "")
    if current_uni:
        uni_lower = current_uni.lower()
        # Check both affiliations and education
        if uni_lower in text or "faculty" in affiliations:
            score = max(score, 14)

    # Target university matches
    for uni in prefs.get("target_universities", []):
        if uni.lower() in text:
            score = max(score, 12)
            break

    # Consulting background bonus
    if "consulting background" in affiliations or "consulting" in affiliations:
        score = min(score + 3, 15)

    return min(score, 15)


def _score_role_relevance(contact: dict, prefs: dict) -> float:
    """Score based on how relevant the role is (max 10)."""
    title = str(contact.get("title", "")).lower()
    target_roles = [r.lower() for r in prefs.get("target_roles", [])]

    # Boost roles the user specifically targets
    if "founder" in target_roles:
        if any(r in title for r in ["founder", "co-founder", "ceo"]):
            return 10

    if "recruiter" in target_roles:
        if any(r in title for r in ["recruiter", "talent", "hiring", "people operations", "hr"]):
            return 10

    if "alumni" in target_roles:
        if any(r in title for r in ["professor", "faculty", "lecturer", "dean"]):
            return 9

    # Standard role hierarchy
    if any(r in title for r in ["founder", "co-founder", "ceo"]):
        return 10
    if any(r in title for r in ["recruiter", "talent", "hiring", "people operations", "hr"]):
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


def _score_company_match(contact: dict, prefs: dict) -> float:
    """Score based on target company match (max 8)."""
    company_name = str(contact.get("company", contact.get("company_name", ""))).lower()
    company_domain = str(contact.get("company_domain", "")).lower()
    description = str(contact.get("description", contact.get("company_description", ""))).lower()
    text = company_name + " " + company_domain + " " + description

    target_companies = prefs.get("target_companies", [])
    if not target_companies:
        # Fallback: score by company stage (startup > enterprise)
        if "startup" in text or "early-stage" in text or "seed" in text:
            return 8
        if "series a" in text or "series b" in text:
            return 7
        if any(kw in text for kw in ["growth", "scale", "expanding"]):
            return 5
        if any(kw in text for kw in ["enterprise", "fortune", "global"]):
            return 2
        return 4

    # Check against target companies
    for target in target_companies:
        if target.lower() in text:
            return 8  # direct target company match

    # Not a target company — still give base score by stage
    if "startup" in text or "early-stage" in text:
        return 5
    return 3


def _score_geography(contact: dict, prefs: dict) -> float:
    """Score based on geographic proximity (max 8)."""
    location = str(contact.get("company_location", "")).lower()
    linkedin_location = str(contact.get("linkedin_location", "")).lower()
    text = location + " " + linkedin_location

    target_locations = prefs.get("target_locations", [])

    for loc in target_locations:
        if loc.lower() in text:
            return 8

    # Fallback scoring
    if "remote" in text:
        return 4
    return 1


def _score_industry_match(contact: dict, prefs: dict) -> float:
    """Score based on industry alignment with user interests (max 9)."""
    industry = str(contact.get("company_industry", "")).lower()
    tags = contact.get("company_industry_tags", [])
    if isinstance(tags, list):
        industry += " " + " ".join(str(t).lower() for t in tags)
    title = str(contact.get("title", "")).lower()
    text = industry + " " + title

    target_industries = prefs.get("target_industries", [])
    score = 0

    # Industry keyword mapping — normalize user input to search terms
    industry_keywords = {
        "fintech": ["fintech", "financial technology"],
        "ai": ["ai", "artificial intelligence", "machine learning", "data science", "deep learning"],
        "consulting": ["consulting", "advisory", "strategy"],
        "vc": ["vc", "venture capital", "venture fund"],
        "saas": ["saas", "software as a service"],
        "financial services": ["financial services", "wealth management", "asset management", "banking"],
        "real estate": ["real estate", "proptech", "property"],
        "startup": ["startup", "early-stage"],
    }

    for target in target_industries:
        keywords = industry_keywords.get(target.lower(), [target.lower()])
        if any(kw in text for kw in keywords):
            score += 5

    return min(score, 9)


# ─── Lift Factor Support ─────────────────────────────────────────────

def _get_max_lift(overrides: dict, dimension: str, features: list[str]) -> float:
    """Get the maximum lift factor for a contact's features in a dimension."""
    dim_overrides = overrides.get(dimension, {})
    if not dim_overrides or not features:
        return 1.0
    lifts = [dim_overrides.get(f, 1.0) for f in features]
    return max(lifts) if lifts else 1.0


def compute_fit_score(
    contact: dict,
    weight_overrides: dict | None = None,
    prefs: dict | None = None,
) -> float:
    """Compute the fit score (0-50) for a contact.

    prefs: user preferences dict (loaded from DB or passed directly).
    weight_overrides: optional lift factors from preference learning.
    """
    p = _get_prefs(prefs)

    affiliation = _score_affiliation(contact, p)
    role = _score_role_relevance(contact, p)
    company = _score_company_match(contact, p)
    geography = _score_geography(contact, p)
    industry = _score_industry_match(contact, p)

    if weight_overrides:
        from feature_extractor import extract_features

        features = extract_features(contact)
        affiliation *= _get_max_lift(weight_overrides, "affiliation", features.get("affiliation", []))
        role *= _get_max_lift(weight_overrides, "role", features.get("role", []))
        company *= _get_max_lift(weight_overrides, "company_stage", features.get("company_stage", []))
        geography *= _get_max_lift(weight_overrides, "geography", features.get("geography", []))
        industry *= _get_max_lift(weight_overrides, "industry", features.get("industry", []))

    total = affiliation + role + company + geography + industry
    return min(total, 50)


# ─── Signal Score (0-30) ──────────────────────────────────────────────

def _recency_multiplier(detected_at: str) -> float:
    """Compute recency multiplier for a signal based on when it was detected."""
    try:
        detected = datetime.fromisoformat(detected_at)
    except (ValueError, TypeError):
        return 0.5

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
    """Compute signal score (0-30) from warm signals."""
    signals = contact.get("signals", [])
    if not signals:
        return 0

    sorted_signals = sorted(signals, key=lambda s: s.get("strength", 0), reverse=True)
    total = 0
    for signal in sorted_signals[:3]:
        strength = signal.get("strength", 0)
        detected_at = signal.get("detected_at", "")
        multiplier = _recency_multiplier(detected_at)
        total += strength * multiplier

    return min(total, 30)


# ─── Engagement Score (0-20) ──────────────────────────────────────────

def compute_engagement_score(contact: dict, prefs: dict | None = None) -> float:
    """Compute engagement score (0-20) based on data quality and reachability."""
    p = _get_prefs(prefs)
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

    # Mutual connection potential — check if contact shares target university affiliations
    affiliations = str(contact.get("affiliations", "")).lower()
    education = str(contact.get("education", "")).lower()
    text = affiliations + " " + education

    current_uni = p.get("current_university", "").lower()
    greek = p.get("greek_life", "").lower()

    if greek and greek in text:
        score += 8  # Same fraternity/sorority = high mutual connection potential
    elif current_uni and current_uni in text:
        score += 6  # Same university
    elif any(uni.lower() in text for uni in p.get("target_universities", [])):
        score += 4  # Target university

    return min(score, 20)


# ─── Main Scoring Function ────────────────────────────────────────────

def score_contact(
    contact: dict,
    weight_overrides: dict | None = None,
    prefs: dict | None = None,
) -> dict:
    """Compute all scores for a contact.

    prefs: user preferences dict. If None, loads from DB.
    weight_overrides: optional learned lift factors.
    """
    if prefs is None:
        prefs = db.get_user_preferences()

    fit = compute_fit_score(contact, weight_overrides=weight_overrides, prefs=prefs)
    signal = compute_signal_score(contact)
    engagement = compute_engagement_score(contact, prefs=prefs)
    total = fit + signal + engagement

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


# ─── WHY NOW + Warm Path ─────────────────────────────────────────────

def generate_why_now(contact: dict, prefs: dict | None = None) -> str:
    """Generate a one-line 'WHY NOW' reason combining top signals.

    Example: "Kenan-Flagler alum at Ramp — hiring 8 roles — Durham, NC"
    """
    p = _get_prefs(prefs)
    parts = []

    # Affiliation match
    affiliations = str(contact.get("affiliations", "")).lower()
    education = str(contact.get("education", "")).lower()
    text = affiliations + " " + education

    greek = p.get("greek_life", "")
    if greek and greek.lower() in text:
        parts.append(f"{greek} brother")
    elif p.get("current_university", ""):
        uni = p["current_university"]
        if uni.lower() in text:
            parts.append(f"{uni} alum")
    if not parts:
        for uni in p.get("target_universities", []):
            if uni.lower() in text:
                parts.append(f"{uni} alum")
                break

    # Role
    title = contact.get("title", "")
    company = contact.get("company", contact.get("company_name", ""))
    if title and company:
        parts.append(f"{title} @ {company}")
    elif company:
        parts.append(f"@ {company}")

    # Signals
    signals = contact.get("signals", [])
    if signals:
        top = sorted(signals, key=lambda s: s.get("strength", 0), reverse=True)[0]
        parts.append(top.get("description", ""))

    # Location
    location = contact.get("company_location", contact.get("linkedin_location", ""))
    if location:
        parts.append(location)

    return " — ".join(parts[:4]) if parts else "Potential connection"


def generate_warm_path(contact: dict, prefs: dict | None = None) -> str:
    """Generate a text-based warm path showing shared signals.

    Example: "Connected via: UNC Alumni → Fintech → Durham, NC"
    """
    p = _get_prefs(prefs)
    shared = []

    affiliations = str(contact.get("affiliations", "")).lower()
    education = str(contact.get("education", "")).lower()
    text = affiliations + " " + education

    # University match
    greek = p.get("greek_life", "")
    if greek and greek.lower() in text:
        shared.append(greek)

    current_uni = p.get("current_university", "")
    if current_uni and current_uni.lower() in text:
        shared.append(current_uni)
    else:
        for uni in p.get("target_universities", []):
            if uni.lower() in text:
                shared.append(uni)
                break

    # Industry match
    industry = str(contact.get("company_industry", "")).lower()
    tags = contact.get("company_industry_tags", [])
    if isinstance(tags, list):
        industry += " " + " ".join(str(t).lower() for t in tags)
    for target_ind in p.get("target_industries", []):
        if target_ind.lower() in industry:
            shared.append(target_ind)
            break

    # Company match
    company_name = str(contact.get("company", contact.get("company_name", ""))).lower()
    for target_co in p.get("target_companies", []):
        if target_co.lower() in company_name:
            shared.append(f"Target: {target_co}")
            break

    # Location match
    location = str(contact.get("company_location", "")).lower()
    for loc in p.get("target_locations", []):
        if loc.lower() in location:
            shared.append(loc)
            break

    if shared:
        return "Connected via: " + " → ".join(shared)
    return ""


def score_contacts(contacts: list[dict], save_to_db: bool = True) -> list[dict]:
    """Score all contacts and optionally save to database."""
    prefs = db.get_user_preferences()

    for contact in contacts:
        score_contact(contact, prefs=prefs)

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

    contacts.sort(key=lambda c: c.get("priority_score", 0), reverse=True)

    tiers = {"hot": 0, "warm": 0, "monitor": 0, "cold": 0}
    for c in contacts:
        tiers[c.get("tier", "cold")] += 1

    print(f"\n  Scoring complete:")
    print(f"    Hot (80+):     {tiers['hot']}")
    print(f"    Warm (60-79):  {tiers['warm']}")
    print(f"    Monitor (40-59): {tiers['monitor']}")
    print(f"    Cold (<40):    {tiers['cold']}")

    return contacts
