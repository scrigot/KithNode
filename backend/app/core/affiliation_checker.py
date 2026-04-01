"""Check contacts for UNC, Kenan-Flagler, Chi Phi, and other shared affiliations.

v3: Uses LinkedIn meta description tags as primary source of truth for education
and location data. Falls back to targeted web search only when LinkedIn data
is unavailable.
"""

from __future__ import annotations

import re
import time
import requests

# Affiliations to detect, with keywords to match in LinkedIn education field
AFFILIATIONS = [
    {"name": "Chi Phi", "education_keywords": [], "general_keywords": ["chi phi"], "boost": 30},
    {"name": "Kenan-Flagler", "education_keywords": ["kenan-flagler", "kenan flagler"], "general_keywords": [], "boost": 25},
    {"name": "UNC Alumni", "education_keywords": ["university of north carolina at chapel hill", "unc chapel hill", "unc-chapel hill"], "general_keywords": [], "boost": 20},
    {"name": "Duke", "education_keywords": ["duke university", "fuqua"], "general_keywords": [], "boost": 10},
    {"name": "NC State", "education_keywords": ["nc state", "north carolina state university"], "general_keywords": [], "boost": 10},
]

MAJOR_CONSULTING_FIRMS = [
    "deloitte", "mckinsey", "bcg", "boston consulting",
    "bain", "accenture", "pwc", "pricewaterhousecoopers",
    "ey", "ernst & young", "ernst and young",
    "kpmg", "booz allen", "oliver wyman", "roland berger",
]

UNC_EMPLOYER_KEYWORDS = [
    "university of north carolina", "unc", "kenan-flagler",
    "unc chapel hill", "unc-chapel hill",
]

FACULTY_TITLE_KEYWORDS = [
    "professor", "faculty", "lecturer", "department chair",
    "dean", "associate dean", "assistant dean",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}


def _fetch_linkedin_meta(url: str) -> dict:
    """
    Fetch a LinkedIn profile page and extract education, location, and
    experience from the meta description tag.

    LinkedIn serves meta tags even behind the auth wall, e.g.:
    "experience: Cofounders Capital · education: Babson College · location: Atlanta"
    """
    result = {"education": "", "location": "", "experience": "", "full_text": ""}

    if not url or "linkedin.com/in/" not in url:
        return result

    try:
        resp = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        if resp.status_code != 200:
            return result

        html = resp.text

        # Extract meta description (two possible orderings of name/content attributes)
        match = re.search(
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']',
            html, re.I
        )
        if not match:
            match = re.search(
                r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']',
                html, re.I
            )

        if not match:
            return result

        desc = match.group(1).lower()
        result["full_text"] = desc

        # Parse structured fields (separated by ·)
        edu_match = re.search(r'education:\s*([^·]+)', desc)
        if edu_match:
            result["education"] = edu_match.group(1).strip()

        loc_match = re.search(r'location:\s*([^·]+)', desc)
        if loc_match:
            result["location"] = loc_match.group(1).strip()

        exp_match = re.search(r'experience:\s*([^·]+)', desc)
        if exp_match:
            result["experience"] = exp_match.group(1).strip()

    except Exception:
        pass

    return result


def _check_affiliations_from_linkedin(linkedin_data: dict) -> list[dict]:
    """Check affiliations based on LinkedIn meta data."""
    found = []
    education = linkedin_data.get("education", "").lower()
    full_text = linkedin_data.get("full_text", "").lower()

    for aff in AFFILIATIONS:
        # Check education field for school affiliations
        for keyword in aff.get("education_keywords", []):
            if keyword in education:
                found.append({"name": aff["name"], "boost": aff["boost"]})
                break

        # Check full profile text for non-education affiliations (e.g., Chi Phi)
        for keyword in aff.get("general_keywords", []):
            if keyword in full_text:
                found.append({"name": aff["name"], "boost": aff["boost"]})
                break

    return found


def _detect_location_affinity(linkedin_data: dict) -> dict | None:
    """Check if the person is in NC (location-based connection)."""
    location = linkedin_data.get("location", "").lower()
    nc_locations = ["raleigh", "durham", "chapel hill", "charlotte",
                    "research triangle", "north carolina", "cary"]

    for loc in nc_locations:
        if loc in location:
            return {"name": "NC Local", "boost": 10}

    if "charleston" in location:
        return {"name": "Charleston Local", "boost": 5}

    return None


def _detect_consulting_background(linkedin_data: dict) -> dict | None:
    """Check if person has past experience at a major consulting firm."""
    experience = linkedin_data.get("experience", "").lower()
    full_text = linkedin_data.get("full_text", "").lower()
    text = experience + " " + full_text
    for firm in MAJOR_CONSULTING_FIRMS:
        if firm in text:
            return {"name": "Consulting Background", "boost": 12}
    return None


def _detect_unc_faculty(linkedin_data: dict, contact_title: str) -> dict | None:
    """Check if person is current UNC/KF faculty or academic staff."""
    experience = linkedin_data.get("experience", "").lower()
    full_text = linkedin_data.get("full_text", "").lower()
    text = experience + " " + full_text
    title_lower = contact_title.lower()

    works_at_unc = any(kw in text for kw in UNC_EMPLOYER_KEYWORDS)
    has_faculty_title = any(kw in title_lower or kw in text for kw in FACULTY_TITLE_KEYWORDS)

    if works_at_unc and has_faculty_title:
        return {"name": "UNC Faculty", "boost": 28}
    return None


def check_affiliations(contacts: list[dict]) -> list[dict]:
    """
    For each contact, check for UNC/Chi Phi/Kenan-Flagler affiliations
    by reading their LinkedIn meta description.
    """
    for i, contact in enumerate(contacts):
        name = contact.get("name", "")
        linkedin_url = contact.get("linkedin_url", "") or ""

        print(f"  [{i+1}/{len(contacts)}] Checking {name}...", end="")

        affiliations = []

        if linkedin_url and "linkedin.com/in/" in linkedin_url:
            # Primary method: fetch LinkedIn meta tags
            meta = _fetch_linkedin_meta(linkedin_url)

            if meta["education"] or meta["full_text"]:
                affiliations = _check_affiliations_from_linkedin(meta)

                # Also check location
                loc_aff = _detect_location_affinity(meta)
                if loc_aff:
                    affiliations.append(loc_aff)

                # Check for consulting background
                consulting_aff = _detect_consulting_background(meta)
                if consulting_aff:
                    affiliations.append(consulting_aff)

                # Check for UNC faculty/staff
                faculty_aff = _detect_unc_faculty(meta, contact.get("title", ""))
                if faculty_aff:
                    affiliations.append(faculty_aff)

                # Store raw education for the notes column
                if meta["education"]:
                    contact["education"] = meta["education"].title()
                if meta["location"]:
                    contact["linkedin_location"] = meta["location"].title()
            else:
                print(" (no meta data)", end="")
        else:
            print(" (no LinkedIn URL)", end="")

        # Deduplicate
        names_found = set()
        deduped = []
        for a in affiliations:
            if a["name"] in names_found:
                continue
            names_found.add(a["name"])
            # Kenan-Flagler implies UNC
            if a["name"] == "Kenan-Flagler":
                names_found.add("UNC Alumni")
            if a["name"] == "Chi Phi":
                names_found.add("UNC Alumni")
            # UNC Faculty supersedes UNC Alumni
            if a["name"] == "UNC Faculty":
                names_found.add("UNC Alumni")
            # Don't add NC Local if we already have a school affiliation in NC
            if a["name"] == "NC Local" and any(n in names_found for n in ["UNC Alumni", "Kenan-Flagler", "Duke", "NC State"]):
                continue
            deduped.append(a)

        contact["affiliations"] = ", ".join(a["name"] for a in deduped) if deduped else ""
        contact["affiliation_boost"] = sum(a["boost"] for a in deduped)

        if deduped:
            edu = contact.get("education", "")
            print(f" -> {contact['affiliations']} (edu: {edu})")
        else:
            print(f" -> none (edu: {contact.get('education', 'unknown')})")

        # Rate limiting for LinkedIn
        if i < len(contacts) - 1:
            time.sleep(0.5)

    affiliated = sum(1 for c in contacts if c.get("affiliations"))
    print(f"\n  Affiliations found: {affiliated}/{len(contacts)} contacts")
    return contacts


if __name__ == "__main__":
    test = [
        # Should NOT be flagged (UVA grad)
        {"name": "Tommy Nicholas", "company": "Alloy", "linkedin_url": "https://www.linkedin.com/in/tommynicholas"},
        # Should NOT be flagged (Babson grad)
        {"name": "Daniel Coley", "company": "Cofounders Capital", "linkedin_url": "https://www.linkedin.com/in/danielacoley"},
        # Should be flagged as Duke (Fuqua)
        {"name": "Zach Herak", "company": "Idea Fund Partners", "linkedin_url": "https://www.linkedin.com/in/zach-herak-2681b24a"},
        # Should NOT be flagged
        {"name": "Ginni Rometty", "company": "IBM", "linkedin_url": ""},
    ]
    check_affiliations(test)
    print("\n=== RESULTS ===")
    for c in test:
        aff = c.get("affiliations", "") or "NONE"
        edu = c.get("education", "unknown")
        print(f"  {c['name']:25s} | Affiliation: {aff:20s} | Education: {edu}")
