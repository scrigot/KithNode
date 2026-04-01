"""Extract discrete feature labels from contact data for preference learning.

Maps contact attributes into 5 dimensions used by the lift-factor algorithm:
  - affiliation: chi_phi, kenan_flagler, unc_alumni, duke, nc_local, consulting, ...
  - role: c_suite, vp_director, manager, recruiter, academic, individual_contributor
  - industry: fintech, ai, vc, saas, consulting, financial_services, other
  - geography: triangle_nc, charlotte, charleston, remote, other
  - company_stage: startup, growth, enterprise, unknown
"""

from __future__ import annotations

import json


def extract_features(contact: dict) -> dict[str, list[str]]:
    """Return {dimension: [feature_labels]} for all 5 fit dimensions."""
    return {
        "affiliation": _extract_affiliation(contact),
        "role": _extract_role(contact),
        "industry": _extract_industry(contact),
        "geography": _extract_geography(contact),
        "company_stage": _extract_company_stage(contact),
    }


def _extract_affiliation(contact: dict) -> list[str]:
    affs = contact.get("affiliation_list", [])
    if not affs:
        aff_str = str(contact.get("affiliations", "")).lower()
        if aff_str:
            affs = [a.strip() for a in aff_str.split(",")]

    mapping = {
        "chi phi": "chi_phi",
        "kenan-flagler": "kenan_flagler",
        "kenan flagler": "kenan_flagler",
        "unc alumni": "unc_alumni",
        "unc faculty": "unc_faculty",
        "duke": "duke",
        "nc state": "nc_state",
        "nc local": "nc_local",
        "charleston local": "charleston_local",
        "consulting background": "consulting",
    }
    features = []
    for aff in affs:
        key = mapping.get(aff.lower().strip())
        if key:
            features.append(key)
    return features


def _extract_role(contact: dict) -> list[str]:
    title = str(contact.get("title", "")).lower()
    if any(r in title for r in ["founder", "co-founder", "ceo", "cto", "coo", "cfo", "president"]):
        return ["c_suite"]
    if any(r in title for r in ["vp", "vice president", "head of", "managing director", "director", "partner"]):
        return ["vp_director"]
    if any(r in title for r in ["manager", "lead"]):
        return ["manager"]
    if any(r in title for r in ["recruiter", "talent", "hiring", "people operations", "hr"]):
        return ["recruiter"]
    if any(r in title for r in ["professor", "faculty", "lecturer", "dean"]):
        return ["academic"]
    return ["individual_contributor"]


def _extract_industry(contact: dict) -> list[str]:
    industry = str(contact.get("company_industry", "")).lower()
    tags = contact.get("company_industry_tags", [])
    if isinstance(tags, str):
        tags = json.loads(tags or "[]")
    text = industry + " " + " ".join(str(t).lower() for t in tags)
    text += " " + str(contact.get("title", "")).lower()

    features = []
    if "fintech" in text or "financial technology" in text:
        features.append("fintech")
    if any(kw in text for kw in ["ai", "artificial intelligence", "machine learning", "data science"]):
        features.append("ai")
    if "vc" in text or "venture capital" in text:
        features.append("vc")
    if "saas" in text:
        features.append("saas")
    if "consulting" in text:
        features.append("consulting")
    if "financial services" in text:
        features.append("financial_services")
    return features if features else ["other"]


def _extract_geography(contact: dict) -> list[str]:
    location = str(contact.get("company_location", "")).lower()
    linkedin_loc = str(contact.get("linkedin_location", "")).lower()
    text = location + " " + linkedin_loc

    if any(loc in text for loc in ["chapel hill", "durham", "raleigh", "research triangle"]):
        return ["triangle_nc"]
    if "charlotte" in text:
        return ["charlotte"]
    if "charleston" in text:
        return ["charleston"]
    if "north carolina" in text:
        return ["nc_other"]
    if "remote" in text:
        return ["remote"]
    return ["other"]


def _extract_company_stage(contact: dict) -> list[str]:
    industry = str(contact.get("company_industry", "")).lower()
    desc = str(contact.get("company_description", contact.get("description", ""))).lower()
    text = industry + " " + desc

    if "startup" in text or "early-stage" in text or "seed" in text:
        return ["startup"]
    if any(kw in text for kw in ["series a", "series b", "growth", "scale", "expanding"]):
        return ["growth"]
    if any(kw in text for kw in ["enterprise", "fortune", "global"]):
        return ["enterprise"]
    return ["unknown"]
