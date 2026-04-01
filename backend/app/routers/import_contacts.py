"""LinkedIn batch import endpoint."""

import re
import time

from fastapi import APIRouter

import database as db
from affiliation_checker import (
    _fetch_linkedin_meta,
    _check_affiliations_from_linkedin,
    _detect_consulting_background,
    _detect_location_affinity,
    _detect_unc_faculty,
)
from scoring import score_contact

from app.models.training import (
    ImportedContactOut,
    LinkedInImportRequest,
    LinkedInImportResponse,
)

router = APIRouter(prefix="/api/import", tags=["import"])

_LINKEDIN_URL_RE = re.compile(r"https?://(www\.)?linkedin\.com/in/[\w-]+/?")


@router.post("/linkedin", response_model=LinkedInImportResponse)
def import_linkedin_urls(req: LinkedInImportRequest):
    """Import contacts from a batch of LinkedIn profile URLs."""
    results = []
    imported = 0
    failed = 0

    for url in req.urls:
        url = url.strip()
        if not url:
            continue

        if not _LINKEDIN_URL_RE.match(url):
            results.append(ImportedContactOut(
                linkedin_url=url,
                error=f"Invalid LinkedIn URL format",
            ))
            failed += 1
            continue

        try:
            # Scrape LinkedIn meta tags
            meta = _fetch_linkedin_meta(url)
            if not meta.get("full_text"):
                results.append(ImportedContactOut(
                    linkedin_url=url,
                    error="Could not fetch LinkedIn profile data",
                ))
                failed += 1
                continue

            # Extract name from experience field or use URL slug
            name = "Unknown"
            experience = meta.get("experience", "")
            if experience:
                # LinkedIn meta: "Company Name" — the name is in og:title, not meta desc
                # Use the LinkedIn URL slug as a fallback name
                slug = url.rstrip("/").split("/")[-1]
                name = slug.replace("-", " ").title()

            # Build contact dict
            contact = {
                "name": name,
                "title": "",
                "linkedin_url": url,
                "source": "linkedin_import",
                "email": "",
                "email_status": "",
            }

            if meta.get("education"):
                contact["education"] = meta["education"].title()
            if meta.get("location"):
                contact["linkedin_location"] = meta["location"].title()

            # Detect affiliations
            affiliations = _check_affiliations_from_linkedin(meta)
            loc_aff = _detect_location_affinity(meta)
            if loc_aff:
                affiliations.append(loc_aff)
            consulting_aff = _detect_consulting_background(meta)
            if consulting_aff:
                affiliations.append(consulting_aff)
            faculty_aff = _detect_unc_faculty(meta, contact.get("title", ""))
            if faculty_aff:
                affiliations.append(faculty_aff)

            contact["affiliations"] = ", ".join(a["name"] for a in affiliations)
            contact["affiliation_boost"] = sum(a["boost"] for a in affiliations)

            # Create a placeholder company from experience or domain
            company_name = experience.split(" · ")[0].strip() if experience else "Unknown"
            company_domain = company_name.lower().replace(" ", "").replace(",", "") + ".com"

            contact["company"] = company_name
            contact["company_domain"] = company_domain
            contact["company_location"] = meta.get("location", "")
            contact["company_industry"] = ""

            company_id = db.upsert_company({
                "name": company_name,
                "domain": company_domain,
                "location": contact.get("company_location", ""),
                "industry_tags": [],
                "source": "linkedin_import",
            })

            # Create contact
            contact_id = db.upsert_contact(contact, company_id)

            # Save affiliations
            if affiliations:
                db.save_affiliations(contact_id, affiliations)

            # Score with learned weights if available
            weight_overrides = db.get_learned_weights_map() or None
            scored = score_contact(contact, weight_overrides=weight_overrides)

            db.save_score(
                contact_id,
                scored["fit_score"],
                scored["signal_score"],
                scored["engagement_score"],
                scored["priority_score"],
                scored["tier"],
            )

            results.append(ImportedContactOut(
                id=contact_id,
                name=name,
                title=contact.get("title", ""),
                linkedin_url=url,
                company_name=company_name,
                company_domain=company_domain,
                affiliations=[a["name"] for a in affiliations],
                total_score=scored["priority_score"],
                tier=scored["tier"],
            ))
            imported += 1

            time.sleep(0.5)  # rate limiting

        except Exception as e:
            results.append(ImportedContactOut(
                linkedin_url=url,
                error=str(e),
            ))
            failed += 1

    return LinkedInImportResponse(
        imported=imported,
        failed=failed,
        contacts=results,
    )
