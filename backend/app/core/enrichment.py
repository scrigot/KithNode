"""Waterfall enrichment pipeline for contact data.

Chains multiple data sources to maximize coverage:
  1. Apollo.io free tier (primary — 275M contacts)
  2. LinkedIn meta tag scraping (free fallback)
  3. Hunter.io (email-specific, existing)

Each source fills in gaps the previous one missed.
"""

from __future__ import annotations

import os
import re
import time
import requests

import database as db
from config import HUNTER_API_KEY

# Apollo API key (optional, free tier gives 5 email credits/mo but unlimited search)
APOLLO_API_KEY = os.getenv("APOLLO_API_KEY", "")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}


# ─── Apollo.io Enrichment ─────────────────────────────────────────────

def _enrich_from_apollo(name: str, domain: str) -> dict:
    """
    Search Apollo.io for a contact by name + domain.
    Free tier: unlimited people search, 5 email credits/mo.

    Returns enriched data dict or empty dict.
    """
    if not APOLLO_API_KEY:
        return {}

    first = name.split()[0] if name.split() else ""
    last = name.split()[-1] if len(name.split()) > 1 else ""

    try:
        resp = requests.post(
            "https://api.apollo.io/v1/people/match",
            headers={
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Api-Key": APOLLO_API_KEY,
            },
            json={
                "first_name": first,
                "last_name": last,
                "organization_name": domain,
                "reveal_personal_emails": False,
            },
            timeout=15,
        )

        if resp.status_code != 200:
            return {}

        data = resp.json().get("person", {})
        if not data:
            return {}

        # Extract useful fields
        result = {
            "source": "apollo",
            "name": data.get("name", name),
            "title": data.get("title", ""),
            "email": data.get("email", ""),
            "linkedin_url": data.get("linkedin_url", ""),
            "city": data.get("city", ""),
            "state": data.get("state", ""),
            "country": data.get("country", ""),
            "headline": data.get("headline", ""),
            "seniority": data.get("seniority", ""),
            "departments": data.get("departments", []),
        }

        # Organization data
        org = data.get("organization", {})
        if org:
            result["company_size"] = org.get("estimated_num_employees", 0)
            result["company_industry"] = org.get("industry", "")
            result["company_keywords"] = org.get("keywords", [])
            result["company_founded_year"] = org.get("founded_year", 0)
            result["company_annual_revenue"] = org.get("annual_revenue_printed", "")

        # Employment history
        employment = data.get("employment_history", [])
        if employment:
            result["work_history"] = [
                {
                    "title": e.get("title", ""),
                    "organization_name": e.get("organization_name", ""),
                    "start_date": e.get("start_date", ""),
                    "end_date": e.get("end_date", ""),
                    "current": e.get("current", False),
                }
                for e in employment[:10]
            ]

        # Education
        education = data.get("education", [])
        if education:
            result["education"] = [
                {
                    "school": e.get("school", {}).get("name", ""),
                    "degree": e.get("degree", ""),
                    "field": e.get("field_of_study", ""),
                    "start_year": e.get("start_date", ""),
                    "end_year": e.get("end_date", ""),
                }
                for e in education
            ]

        return result

    except Exception:
        return {}


# ─── LinkedIn Meta Tag Enrichment ─────────────────────────────────────

def _enrich_from_linkedin_meta(linkedin_url: str) -> dict:
    """
    Fetch LinkedIn profile meta tags for basic enrichment.
    Works without authentication — LinkedIn serves meta tags publicly.
    """
    if not linkedin_url or "linkedin.com/in/" not in linkedin_url:
        return {}

    try:
        resp = requests.get(linkedin_url, headers=HEADERS, timeout=10, allow_redirects=True)
        if resp.status_code != 200:
            return {}

        html = resp.text
        result = {"source": "linkedin_meta"}

        # Extract meta description
        match = re.search(
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']',
            html, re.I
        )
        if not match:
            match = re.search(
                r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']',
                html, re.I
            )

        if match:
            desc = match.group(1)
            result["full_text"] = desc

            desc_lower = desc.lower()

            # Parse structured fields
            edu_match = re.search(r'education:\s*([^·]+)', desc_lower)
            if edu_match:
                result["education_text"] = edu_match.group(1).strip()

            loc_match = re.search(r'location:\s*([^·]+)', desc_lower)
            if loc_match:
                result["location"] = loc_match.group(1).strip()

            exp_match = re.search(r'experience:\s*([^·]+)', desc_lower)
            if exp_match:
                result["experience_text"] = exp_match.group(1).strip()

        # Extract og:title for headline
        og_title = re.search(
            r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\']',
            html, re.I
        )
        if og_title:
            result["headline"] = og_title.group(1).strip()

        return result

    except Exception:
        return {}


# ─── Waterfall Orchestrator ───────────────────────────────────────────

def enrich_contact(contact: dict, save_to_db: bool = True) -> dict:
    """
    Run the enrichment waterfall for a single contact.
    Updates the contact dict in-place with enriched data.
    """
    name = contact.get("name", "")
    domain = contact.get("company_domain", "")
    linkedin_url = contact.get("linkedin_url", "")

    enriched_data = {}

    # Source 1: Apollo.io (richest data)
    if APOLLO_API_KEY:
        apollo_data = _enrich_from_apollo(name, domain)
        if apollo_data:
            enriched_data["apollo"] = apollo_data

            # Fill in missing fields from Apollo
            if not contact.get("title") or contact["title"] == "Unknown":
                contact["title"] = apollo_data.get("title", contact.get("title", ""))

            if not linkedin_url and apollo_data.get("linkedin_url"):
                contact["linkedin_url"] = apollo_data["linkedin_url"]
                linkedin_url = apollo_data["linkedin_url"]

            if apollo_data.get("email") and not contact.get("email"):
                contact["email"] = apollo_data["email"]
                contact["email_verified"] = "apollo_found"
                contact["email_confidence"] = "apollo"

            # Store education for affiliation matching
            if apollo_data.get("education"):
                schools = [e["school"] for e in apollo_data["education"] if e.get("school")]
                contact["education_full"] = apollo_data["education"]
                contact["education"] = ", ".join(schools) if schools else contact.get("education", "")

            # Store work history
            if apollo_data.get("work_history"):
                contact["work_history"] = apollo_data["work_history"]

            # Store company metadata
            if apollo_data.get("company_size"):
                contact["company_size"] = apollo_data["company_size"]

            # Location
            if apollo_data.get("city"):
                loc = apollo_data["city"]
                if apollo_data.get("state"):
                    loc += f", {apollo_data['state']}"
                contact["linkedin_location"] = loc

            time.sleep(0.3)

    # Source 2: LinkedIn meta tags (free, always available)
    if linkedin_url:
        meta_data = _enrich_from_linkedin_meta(linkedin_url)
        if meta_data:
            enriched_data["linkedin_meta"] = meta_data

            # Fill in gaps
            if not contact.get("education") and meta_data.get("education_text"):
                contact["education"] = meta_data["education_text"].title()

            if not contact.get("linkedin_location") and meta_data.get("location"):
                contact["linkedin_location"] = meta_data["location"].title()

    # Save enrichment data to DB
    if save_to_db and enriched_data:
        contact_id = contact.get("db_id")
        if contact_id:
            for source, data in enriched_data.items():
                db.save_enrichment(contact_id, source, data)

    contact["enrichment_sources"] = list(enriched_data.keys())
    return contact


def enrich_contacts(contacts: list[dict], save_to_db: bool = True) -> list[dict]:
    """Run enrichment waterfall for a batch of contacts."""
    apollo_count = 0
    meta_count = 0

    for i, contact in enumerate(contacts):
        name = contact.get("name", "")
        print(f"  [{i+1}/{len(contacts)}] Enriching {name}...", end="")

        enrich_contact(contact, save_to_db=save_to_db)

        sources = contact.get("enrichment_sources", [])
        if "apollo" in sources:
            apollo_count += 1
        if "linkedin_meta" in sources:
            meta_count += 1

        if sources:
            print(f" -> {', '.join(sources)}")
        else:
            print(f" -> no enrichment data")

        # Rate limiting
        if i < len(contacts) - 1:
            time.sleep(0.5)

    print(f"\n  Enrichment complete:")
    print(f"    Apollo.io:       {apollo_count}/{len(contacts)}")
    print(f"    LinkedIn meta:   {meta_count}/{len(contacts)}")

    return contacts


# ─── Enhanced Affiliation Detection ───────────────────────────────────

# Extended school list for affiliation matching
SCHOOL_AFFILIATIONS = {
    "university of north carolina at chapel hill": ("UNC Alumni", 20),
    "unc chapel hill": ("UNC Alumni", 20),
    "unc-chapel hill": ("UNC Alumni", 20),
    "kenan-flagler": ("Kenan-Flagler", 25),
    "kenan flagler": ("Kenan-Flagler", 25),
    "duke university": ("Duke", 10),
    "fuqua": ("Duke", 10),
    "north carolina state": ("NC State", 10),
    "nc state": ("NC State", 10),
}

FRATERNITY_KEYWORDS = {
    "chi phi": ("Chi Phi", 30),
}


def detect_affiliations_enhanced(contact: dict) -> list[dict]:
    """
    Enhanced affiliation detection using all available enrichment data.
    Checks full education history (from Apollo), LinkedIn meta, and text signals.
    """
    affiliations = []
    found_names = set()

    # Check full education array (from Apollo enrichment)
    education_full = contact.get("education_full", [])
    for edu in education_full:
        school = edu.get("school", "").lower()
        for keyword, (aff_name, boost) in SCHOOL_AFFILIATIONS.items():
            if keyword in school and aff_name not in found_names:
                affiliations.append({"name": aff_name, "boost": boost})
                found_names.add(aff_name)

    # Check education text string (from LinkedIn meta or other)
    education_text = str(contact.get("education", "")).lower()
    for keyword, (aff_name, boost) in SCHOOL_AFFILIATIONS.items():
        if keyword in education_text and aff_name not in found_names:
            affiliations.append({"name": aff_name, "boost": boost})
            found_names.add(aff_name)

    # Check full profile text for fraternity mentions
    full_text_sources = [
        str(contact.get("education", "")),
        str(contact.get("headline", "")),
    ]
    # Include Apollo data if available
    for source in contact.get("enrichment_sources", []):
        if source == "linkedin_meta":
            full_text_sources.append(str(contact.get("linkedin_meta_full_text", "")))

    full_text = " ".join(full_text_sources).lower()
    for keyword, (aff_name, boost) in FRATERNITY_KEYWORDS.items():
        if keyword in full_text and aff_name not in found_names:
            affiliations.append({"name": aff_name, "boost": boost})
            found_names.add(aff_name)

    # Work history connections (worked at same company as Sam's targets)
    work_history = contact.get("work_history", [])
    consulting_firms = [
        "deloitte", "mckinsey", "bcg", "boston consulting", "bain",
        "accenture", "pwc", "ey", "kpmg", "booz allen", "oliver wyman",
    ]
    for job in work_history:
        org = job.get("organization_name", "").lower()
        # UNC employer
        if any(kw in org for kw in ["university of north carolina", "unc", "kenan-flagler"]):
            title = job.get("title", "").lower()
            if any(kw in title for kw in ["professor", "faculty", "lecturer", "dean"]):
                if "UNC Faculty" not in found_names:
                    affiliations.append({"name": "UNC Faculty", "boost": 28})
                    found_names.add("UNC Faculty")
        # Consulting background
        if any(firm in org for firm in consulting_firms):
            if "Consulting Background" not in found_names:
                affiliations.append({"name": "Consulting Background", "boost": 12})
                found_names.add("Consulting Background")

    # Location affinity
    location = str(contact.get("linkedin_location", "")).lower()
    nc_locations = ["raleigh", "durham", "chapel hill", "charlotte",
                    "research triangle", "north carolina", "cary"]
    if any(loc in location for loc in nc_locations):
        if "NC Local" not in found_names:
            # Don't add NC Local if already have a school affiliation there
            if not any(n in found_names for n in ["UNC Alumni", "Kenan-Flagler", "Duke", "NC State"]):
                affiliations.append({"name": "NC Local", "boost": 10})
                found_names.add("NC Local")
    elif "charleston" in location:
        if "Charleston Local" not in found_names:
            affiliations.append({"name": "Charleston Local", "boost": 5})
            found_names.add("Charleston Local")

    # Deduplicate: Kenan-Flagler implies UNC, Chi Phi implies UNC
    if "Kenan-Flagler" in found_names or "Chi Phi" in found_names or "UNC Faculty" in found_names:
        affiliations = [a for a in affiliations if a["name"] != "UNC Alumni"]

    return affiliations


if __name__ == "__main__":
    # Test with Apollo-like enriched data
    test = {
        "name": "Jane Doe",
        "title": "VP Engineering",
        "company_domain": "example.com",
        "linkedin_url": "",
        "education_full": [
            {"school": "University of North Carolina at Chapel Hill", "degree": "BS", "field": "Business"},
            {"school": "MIT Sloan School of Management", "degree": "MBA", "field": ""},
        ],
        "work_history": [
            {"organization_name": "McKinsey & Company", "title": "Associate", "current": False},
            {"organization_name": "Example Corp", "title": "VP Engineering", "current": True},
        ],
        "linkedin_location": "Durham, NC",
    }
    affs = detect_affiliations_enhanced(test)
    for a in affs:
        print(f"  {a['name']} (+{a['boost']})")
