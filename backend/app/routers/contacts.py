import json

from fastapi import APIRouter, HTTPException, Query

import database as db
from scoring import generate_why_now, generate_warm_path

from app.models.contacts import (
    AffiliationOut,
    CompanyOut,
    ContactDetailOut,
    ContactRankedOut,
    OutreachHistoryOut,
    ScoreOut,
)
from app.models.signals import SignalOut

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


def _parse_company(row: dict) -> CompanyOut:
    tags = row.get("company_industry_tags", "[]")
    if isinstance(tags, str):
        tags = json.loads(tags or "[]")
    return CompanyOut(
        name=row.get("company_name", ""),
        domain=row.get("company_domain", ""),
        website=row.get("company_website", ""),
        location=row.get("company_location", ""),
        industry_tags=tags,
        description=row.get("company_description", ""),
    )


def _parse_score(row: dict) -> ScoreOut:
    return ScoreOut(
        fit_score=row.get("fit_score", 0),
        signal_score=row.get("signal_score", 0),
        engagement_score=row.get("engagement_score", 0),
        total_score=row.get("total_score", 0),
        tier=row.get("tier", "cold"),
        scored_at=row.get("scored_at", ""),
    )


@router.get("/ranked", response_model=list[ContactRankedOut])
def get_ranked_contacts(
    min_score: float = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    curated: bool = Query(False),
):
    """Return contacts ranked by priority score, with scores and tiers.

    curated=true: only return contacts rated 'high_value' (for Warm Signals tab).
    """
    rows = db.get_scored_contacts(min_score=min_score, limit=limit)

    # Filter to curated-only (high_value rated contacts)
    if curated:
        high_value_ids = set()
        with db.get_db() as conn:
            rated = conn.execute(
                "SELECT contact_id FROM contact_ratings WHERE rating = 'high_value'"
            ).fetchall()
            high_value_ids = {dict(r)["contact_id"] for r in rated}
        rows = [r for r in rows if r["id"] in high_value_ids]

    prefs = db.get_user_preferences()

    results = []
    for r in rows:
        results.append(
            ContactRankedOut(
                id=r["id"],
                name=r.get("name", ""),
                title=r.get("title", ""),
                email=r.get("email", ""),
                email_status=r.get("email_status", ""),
                linkedin_url=r.get("linkedin_url", ""),
                education=r.get("education", ""),
                linkedin_location=r.get("linkedin_location", ""),
                why_now=generate_why_now(r, prefs),
                warm_path=generate_warm_path(r, prefs),
                company=_parse_company(r),
                score=_parse_score(r),
            )
        )
    return results


@router.get("/{contact_id}", response_model=ContactDetailOut)
def get_contact_detail(contact_id: int):
    """Return full contact detail with scores, signals, affiliations, and outreach history."""
    # Fetch contact + company
    with db.get_db() as conn:
        row = conn.execute(
            """
            SELECT c.*,
                   co.name as company_name, co.domain as company_domain,
                   co.website as company_website, co.location as company_location,
                   co.industry_tags as company_industry_tags,
                   co.description as company_description
            FROM contacts c
            JOIN companies co ON c.company_id = co.id
            WHERE c.id = ?
            """,
            (contact_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact = dict(row)

    # Fetch related data
    affiliations = db.get_affiliations_for_contact(contact_id)
    outreach = db.get_outreach_for_contact(contact_id)
    signals = db.get_signals_for_company(contact["company_id"])

    # Fetch score
    with db.get_db() as conn:
        score_row = conn.execute(
            "SELECT * FROM scores WHERE contact_id = ?", (contact_id,)
        ).fetchone()

    score = _parse_score(dict(score_row)) if score_row else None

    return ContactDetailOut(
        id=contact["id"],
        name=contact.get("name", ""),
        title=contact.get("title", ""),
        email=contact.get("email", ""),
        email_status=contact.get("email_status", ""),
        email_confidence=contact.get("email_confidence", ""),
        linkedin_url=contact.get("linkedin_url", ""),
        education=contact.get("education", ""),
        linkedin_location=contact.get("linkedin_location", ""),
        source=contact.get("source", ""),
        company=_parse_company(contact),
        score=score,
        affiliations=[AffiliationOut(**a) for a in affiliations],
        outreach_history=[OutreachHistoryOut(**o) for o in outreach],
        signals=[SignalOut(**s) for s in signals],
    )
