"""Discover (swipe) and contact rating endpoints."""

from fastapi import APIRouter, HTTPException, Query

import database as db

from app.models.training import (
    DiscoverContactOut,
    DiscoverResponse,
    RateContactRequest,
    RateContactResponse,
    RatingsProgress,
)

router = APIRouter(prefix="/api", tags=["discover"])

LEARNING_THRESHOLD = 10
MIN_HIGH_VALUE = 3


def _build_ratings_progress() -> RatingsProgress:
    summary = db.get_ratings_summary()
    total = summary["total"]
    hv = summary["high_value"]
    active = total >= LEARNING_THRESHOLD and hv >= MIN_HIGH_VALUE
    return RatingsProgress(
        total_ratings=total,
        high_value_count=hv,
        skip_count=summary["skip"],
        not_interested_count=summary["not_interested"],
        learning_active=active,
        ratings_needed=max(0, LEARNING_THRESHOLD - total),
    )


@router.get("/discover", response_model=DiscoverResponse)
def get_discover_contacts(limit: int = Query(10, ge=1, le=50)):
    """Return unrated contacts for the swipe/discover UI."""
    rows = db.get_unrated_contacts(limit=limit)

    contacts = []
    for r in rows:
        affs = db.get_affiliations_for_contact(r["id"])
        signals = db.get_signals_for_company(r.get("company_id", 0))

        contacts.append(DiscoverContactOut(
            id=r["id"],
            name=r.get("name", ""),
            title=r.get("title", ""),
            email=r.get("email", ""),
            linkedin_url=r.get("linkedin_url", ""),
            education=r.get("education", ""),
            linkedin_location=r.get("linkedin_location", ""),
            company_name=r.get("company_name", ""),
            company_domain=r.get("company_domain", ""),
            company_location=r.get("company_location", ""),
            company_industry_tags=r.get("company_industry_tags", []),
            affiliations=[a["name"] for a in affs],
            total_score=r.get("total_score", 0),
            fit_score=r.get("fit_score", 0),
            signal_score=r.get("signal_score", 0),
            engagement_score=r.get("engagement_score", 0),
            tier=r.get("tier", "cold"),
            signals=[
                {"type": s["signal_type"], "description": s["description"]}
                for s in signals[:3]
            ],
        ))

    # Count total unrated
    all_unrated = db.get_unrated_contacts(limit=9999)

    return DiscoverResponse(
        contacts=contacts,
        total_unrated=len(all_unrated),
        ratings_progress=_build_ratings_progress(),
    )


@router.post("/contacts/{contact_id}/rate", response_model=RateContactResponse)
def rate_contact(contact_id: int, req: RateContactRequest):
    """Rate a contact as high_value, skip, or not_interested."""
    valid = {"high_value", "skip", "not_interested"}
    if req.rating not in valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid rating. Must be one of: {valid}",
        )

    with db.get_db() as conn:
        row = conn.execute(
            "SELECT id FROM contacts WHERE id = ?", (contact_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.save_rating(contact_id, req.rating)

    summary = db.get_ratings_summary()
    total = summary["total"]
    active = total >= LEARNING_THRESHOLD and summary["high_value"] >= MIN_HIGH_VALUE

    # Auto-recalculate at threshold and every 5 ratings after
    message = ""
    if active and (total == LEARNING_THRESHOLD or total % 5 == 0):
        from preference_learner import recalculate_and_save

        result = recalculate_and_save()
        message = f"Learning updated! {result['weights_updated']} weights recalculated."

    return RateContactResponse(
        contact_id=contact_id,
        rating=req.rating,
        total_ratings=total,
        learning_active=active,
        message=message,
    )
