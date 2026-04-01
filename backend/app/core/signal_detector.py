"""Warm signal detection for companies.

Detects buying/engagement signals that indicate a company is more likely
to be receptive to outreach: funding rounds, hiring surges, tech stack,
news, and career page activity.
"""

from __future__ import annotations

import re
import time
import requests
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from ddgs import DDGS

import database as db


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# Greenhouse/Lever/Ashby job board URL patterns
ATS_PATTERNS = [
    "boards.greenhouse.io/{slug}",
    "jobs.lever.co/{slug}",
    "jobs.ashbyhq.com/{slug}",
    "{domain}/careers",
    "{domain}/jobs",
    "{domain}/open-positions",
]


# ─── Funding Signal Detection ─────────────────────────────────────────

def _detect_funding(company_name: str, domain: str) -> list[dict]:
    """Search for recent funding announcements via DuckDuckGo news."""
    signals = []

    queries = [
        f'"{company_name}" funding OR raised OR "series a" OR "series b" OR "seed round"',
        f'"{company_name}" investment OR financing OR valuation',
    ]

    for query in queries:
        try:
            results = list(DDGS().news(query, max_results=5, timelimit="m"))  # last month
        except Exception:
            try:
                results = list(DDGS().text(query + " funding 2026", max_results=5))
            except Exception:
                continue

        for r in results:
            title = r.get("title", "")
            body = r.get("body", r.get("excerpt", ""))
            url = r.get("url", r.get("href", ""))
            text = (title + " " + body).lower()

            # Must mention the company
            if company_name.lower() not in text and domain.split(".")[0] not in text:
                continue

            # Look for funding patterns
            amount_match = re.search(r'\$(\d+(?:\.\d+)?)\s*(million|m|billion|b)', text)
            series_match = re.search(r'series\s+([a-e])', text)
            seed_match = re.search(r'seed\s+(?:round|funding|investment)', text)

            if amount_match or series_match or seed_match:
                # Determine strength based on round type
                strength = 6  # default
                description_parts = []

                if amount_match:
                    amount = amount_match.group(0).upper()
                    description_parts.append(f"raised {amount}")

                if series_match:
                    series = series_match.group(1).upper()
                    description_parts.append(f"Series {series}")
                    strength_map = {"A": 7, "B": 8, "C": 8, "D": 9, "E": 9}
                    strength = strength_map.get(series, 7)
                elif seed_match:
                    description_parts.append("Seed round")
                    strength = 5
                elif "pre-seed" in text:
                    description_parts.append("Pre-seed")
                    strength = 4

                description = f"Funding: {', '.join(description_parts)}" if description_parts else f"Funding activity detected"

                signals.append({
                    "signal_type": "funding",
                    "description": description,
                    "strength": strength,
                    "source_url": url,
                })
                break  # One funding signal per company is enough

        if signals:
            break

    return signals


# ─── Hiring Signal Detection ──────────────────────────────────────────

def _check_ats_boards(company_name: str, domain: str) -> list[dict]:
    """Check common ATS platforms (Greenhouse, Lever, Ashby) for open roles."""
    signals = []

    # Generate slug from company name (lowercase, no spaces)
    slug = company_name.lower().replace(" ", "").replace(".", "").replace("&", "and")
    slug_hyphen = company_name.lower().replace(" ", "-").replace(".", "").replace("&", "and")

    urls_to_check = []
    for pattern in ATS_PATTERNS:
        for s in [slug, slug_hyphen]:
            url = pattern.format(slug=s, domain=f"https://{domain}")
            if not url.startswith("http"):
                url = "https://" + url
            urls_to_check.append(url)

    for url in urls_to_check:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
            if resp.status_code != 200:
                continue

            html = resp.text
            soup = BeautifulSoup(html, "html.parser")

            # Count job listings
            job_count = 0

            # Greenhouse pattern
            for opening in soup.find_all("div", class_=re.compile(r"opening", re.I)):
                job_count += 1

            # Lever pattern
            for posting in soup.find_all("div", class_=re.compile(r"posting", re.I)):
                job_count += 1

            # Ashby pattern
            for job in soup.find_all(["a", "div"], class_=re.compile(r"job|position|role", re.I)):
                job_count += 1

            # Generic career page — count links/items that look like job postings
            if job_count == 0:
                for link in soup.find_all("a"):
                    text = link.get_text(strip=True).lower()
                    if any(kw in text for kw in ["engineer", "manager", "analyst", "designer",
                                                  "developer", "intern", "associate", "director"]):
                        job_count += 1

            if job_count > 0:
                # Determine strength based on count
                if job_count >= 20:
                    strength = 9
                elif job_count >= 10:
                    strength = 8
                elif job_count >= 5:
                    strength = 7
                elif job_count >= 2:
                    strength = 5
                else:
                    strength = 3

                # Check for intern-specific roles
                page_text = soup.get_text().lower()
                has_intern = "intern" in page_text

                description = f"Hiring: {job_count} open roles"
                if has_intern:
                    description += " (including internships)"
                    strength = min(strength + 1, 10)

                signals.append({
                    "signal_type": "hiring",
                    "description": description,
                    "strength": strength,
                    "source_url": url,
                })
                break  # Found a career page, no need to check more URLs

        except Exception:
            continue

    return signals


def _detect_hiring_from_search(company_name: str, domain: str) -> list[dict]:
    """Fallback: search for hiring signals via DuckDuckGo."""
    signals = []

    query = f'"{company_name}" hiring OR careers OR "open positions" OR "join our team" site:{domain}'
    try:
        results = list(DDGS().text(query, max_results=3))
    except Exception:
        return signals

    for r in results:
        body = r.get("body", "").lower()
        if any(kw in body for kw in ["hiring", "careers", "open positions", "join"]):
            signals.append({
                "signal_type": "hiring",
                "description": "Active career page detected",
                "strength": 4,
                "source_url": r.get("href", ""),
            })
            break

    return signals


# ─── Tech Stack Detection ─────────────────────────────────────────────

def _detect_tech_stack(domain: str) -> list[dict]:
    """Detect company tech stack by checking their website headers and scripts."""
    signals = []

    try:
        resp = requests.get(f"https://{domain}", headers=HEADERS, timeout=10,
                            allow_redirects=True)
        if resp.status_code != 200:
            return signals

        html = resp.text.lower()
        headers_str = str(resp.headers).lower()

        # Detect interesting technologies
        tech_detected = []

        # AI/ML indicators
        if any(kw in html for kw in ["openai", "anthropic", "hugging face", "tensorflow",
                                      "pytorch", "machine learning", "artificial intelligence"]):
            tech_detected.append("AI/ML")

        # Modern frameworks
        if "react" in html or "next.js" in html or "_next/" in html:
            tech_detected.append("React/Next.js")
        if "vue" in html or "nuxt" in html:
            tech_detected.append("Vue/Nuxt")

        # Cloud providers
        if any(kw in html or kw in headers_str for kw in ["amazonaws.com", "aws"]):
            tech_detected.append("AWS")
        if "google" in headers_str and "cloud" in html:
            tech_detected.append("GCP")

        # Analytics/tools that suggest growth stage
        if "segment.com" in html or "segment.io" in html:
            tech_detected.append("Segment")
        if "intercom" in html:
            tech_detected.append("Intercom")
        if "hubspot" in html:
            tech_detected.append("HubSpot")
        if "stripe" in html:
            tech_detected.append("Stripe")

        if tech_detected:
            # Higher strength if AI/ML is in their stack (aligned with Sam's interests)
            strength = 5
            if "AI/ML" in tech_detected:
                strength = 7

            signals.append({
                "signal_type": "tech_stack",
                "description": f"Tech stack: {', '.join(tech_detected[:5])}",
                "strength": strength,
                "source_url": f"https://{domain}",
            })

    except Exception:
        pass

    return signals


# ─── News/Content Signal Detection ────────────────────────────────────

def _detect_news(company_name: str, domain: str) -> list[dict]:
    """Search for recent company news that indicates good timing for outreach."""
    signals = []

    query = f'"{company_name}" launch OR announce OR partnership OR award OR expansion'
    try:
        results = list(DDGS().news(query, max_results=5, timelimit="m"))
    except Exception:
        try:
            results = list(DDGS().text(query + " 2026", max_results=5))
        except Exception:
            return signals

    for r in results:
        title = r.get("title", "")
        body = r.get("body", r.get("excerpt", ""))
        url = r.get("url", r.get("href", ""))
        text = (title + " " + body).lower()

        if company_name.lower() not in text and domain.split(".")[0] not in text:
            continue

        # Categorize the news
        if any(kw in text for kw in ["launch", "new product", "released", "introduces"]):
            description = f"Product launch: {title[:80]}"
            strength = 6
        elif any(kw in text for kw in ["partnership", "partner", "collaboration"]):
            description = f"Partnership: {title[:80]}"
            strength = 5
        elif any(kw in text for kw in ["award", "recognized", "named", "top ", "best "]):
            description = f"Recognition: {title[:80]}"
            strength = 4
        elif any(kw in text for kw in ["expand", "new office", "new market", "growth"]):
            description = f"Expansion: {title[:80]}"
            strength = 6
        else:
            continue

        signals.append({
            "signal_type": "news",
            "description": description,
            "strength": strength,
            "source_url": url,
        })
        break  # One news signal is enough

    return signals


# ─── Signal Stacking Logic ────────────────────────────────────────────

def compute_signal_stack(signals: list[dict]) -> dict:
    """
    Evaluate signal stacking rules to determine outreach priority.

    Returns:
        {"should_outreach": bool, "reason": str, "combined_strength": int}
    """
    if not signals:
        return {"should_outreach": False, "reason": "No signals detected", "combined_strength": 0}

    # Sort by strength descending
    sorted_signals = sorted(signals, key=lambda s: s.get("strength", 0), reverse=True)
    top_strength = sorted_signals[0].get("strength", 0)
    combined = sum(s.get("strength", 0) for s in sorted_signals[:3])

    # Rule 1: Any single signal with strength >= 8
    if top_strength >= 8:
        return {
            "should_outreach": True,
            "reason": f"Strong signal: {sorted_signals[0]['description']}",
            "combined_strength": combined,
        }

    # Rule 2: Two or more signals with combined strength >= 12
    if len(sorted_signals) >= 2 and combined >= 12:
        descriptions = [s["description"] for s in sorted_signals[:2]]
        return {
            "should_outreach": True,
            "reason": f"Signal stack: {' + '.join(descriptions)}",
            "combined_strength": combined,
        }

    # Rule 3: Three or more signals of any strength
    if len(sorted_signals) >= 3:
        return {
            "should_outreach": True,
            "reason": f"Multiple signals ({len(sorted_signals)} detected)",
            "combined_strength": combined,
        }

    return {
        "should_outreach": False,
        "reason": f"Weak signals (strength: {combined})",
        "combined_strength": combined,
    }


# ─── Main Detection Pipeline ──────────────────────────────────────────

def detect_signals(company: dict, save_to_db: bool = True) -> list[dict]:
    """
    Run all signal detectors for a company.
    Returns list of signal dicts and optionally saves to database.
    """
    name = company["name"]
    domain = company["domain"]
    all_signals = []

    # 1. Funding
    try:
        funding = _detect_funding(name, domain)
        all_signals.extend(funding)
    except Exception as e:
        print(f"    Warning: funding detection failed for {name}: {e}")

    time.sleep(0.5)

    # 2. Hiring (ATS boards first, then search fallback)
    try:
        hiring = _check_ats_boards(name, domain)
        if not hiring:
            hiring = _detect_hiring_from_search(name, domain)
        all_signals.extend(hiring)
    except Exception as e:
        print(f"    Warning: hiring detection failed for {name}: {e}")

    time.sleep(0.5)

    # 3. Tech stack
    try:
        tech = _detect_tech_stack(domain)
        all_signals.extend(tech)
    except Exception as e:
        print(f"    Warning: tech stack detection failed for {name}: {e}")

    # 4. News
    try:
        news = _detect_news(name, domain)
        all_signals.extend(news)
    except Exception as e:
        print(f"    Warning: news detection failed for {name}: {e}")

    # Save to database
    if save_to_db and all_signals:
        company_row = db.get_company_by_domain(domain)
        if company_row:
            company_id = company_row["id"]
            for signal in all_signals:
                db.add_signal(
                    company_id,
                    signal["signal_type"],
                    signal["description"],
                    signal["strength"],
                    signal.get("source_url", ""),
                )

    return all_signals


def detect_signals_batch(companies: list[dict], save_to_db: bool = True) -> dict[str, list[dict]]:
    """
    Run signal detection for a batch of companies.
    Returns {domain: [signals]} mapping.
    """
    results = {}

    for i, company in enumerate(companies):
        name = company["name"]
        domain = company["domain"]
        print(f"  [{i+1}/{len(companies)}] Detecting signals for {name}...")

        signals = detect_signals(company, save_to_db=save_to_db)
        results[domain] = signals

        if signals:
            stack = compute_signal_stack(signals)
            signal_summary = ", ".join(f"{s['signal_type']}({s['strength']})" for s in signals)
            status = "OUTREACH" if stack["should_outreach"] else "monitor"
            print(f"    -> {signal_summary} [{status}]")
        else:
            print(f"    -> no signals")

        # Rate limiting between companies
        if i < len(companies) - 1:
            time.sleep(1)

    # Summary
    total_signals = sum(len(s) for s in results.values())
    companies_with_signals = sum(1 for s in results.values() if s)
    outreach_ready = sum(
        1 for s in results.values()
        if s and compute_signal_stack(s)["should_outreach"]
    )

    print(f"\n  Signal detection complete:")
    print(f"    {total_signals} signals across {companies_with_signals}/{len(companies)} companies")
    print(f"    {outreach_ready} companies ready for outreach (signal stack triggered)")

    return results


if __name__ == "__main__":
    # Quick test with a known company
    test = {"name": "Ramp", "domain": "ramp.com", "website": "https://ramp.com"}
    print(f"Testing signal detection for {test['name']}...")
    signals = detect_signals(test, save_to_db=False)
    for s in signals:
        print(f"  [{s['signal_type']}] {s['description']} (strength: {s['strength']})")
    stack = compute_signal_stack(signals)
    print(f"\nSignal stack: {stack}")
