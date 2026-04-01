"""Preference learning insights and controls."""

from fastapi import APIRouter

import database as db

from app.models.training import (
    LearnedWeightOut,
    PreferencesOut,
    RatingsProgress,
    RecalculateResponse,
)

router = APIRouter(prefix="/api/preferences", tags=["preferences"])

LEARNING_THRESHOLD = 10
MIN_HIGH_VALUE = 3


@router.get("", response_model=PreferencesOut)
def get_preferences():
    """Return current learned weights and rating stats."""
    summary = db.get_ratings_summary()
    total = summary["total"]
    active = total >= LEARNING_THRESHOLD and summary["high_value"] >= MIN_HIGH_VALUE

    weights = db.get_learned_weights()

    return PreferencesOut(
        ratings_summary=RatingsProgress(
            total_ratings=total,
            high_value_count=summary["high_value"],
            skip_count=summary["skip"],
            not_interested_count=summary["not_interested"],
            learning_active=active,
            ratings_needed=max(0, LEARNING_THRESHOLD - total),
        ),
        learned_weights=[LearnedWeightOut(**w) for w in weights],
        learning_active=active,
    )


@router.post("/recalculate", response_model=RecalculateResponse)
def recalculate_preferences():
    """Force recalculate lift factors and re-score all contacts."""
    from preference_learner import recalculate_and_save
    from scoring import score_contact

    result = recalculate_and_save()

    contacts_rescored = 0
    if result["learning_active"]:
        weight_overrides = db.get_learned_weights_map()
        all_contacts = db.get_scored_contacts(min_score=0, limit=9999)

        for c in all_contacts:
            scored = score_contact(c, weight_overrides=weight_overrides)
            db.save_score(
                c["id"],
                scored["fit_score"],
                scored["signal_score"],
                scored["engagement_score"],
                scored["priority_score"],
                scored["tier"],
            )
            contacts_rescored += 1

    return RecalculateResponse(
        learning_active=result["learning_active"],
        weights_updated=result["weights_updated"],
        contacts_rescored=contacts_rescored,
        message=(
            "Preferences recalculated successfully"
            if result["learning_active"]
            else f"Need {LEARNING_THRESHOLD} ratings ({MIN_HIGH_VALUE}+ high_value) to activate learning"
        ),
    )


@router.post("/reset")
def reset_preferences():
    """Clear all learned weights (ratings are preserved)."""
    with db.get_db() as conn:
        conn.execute("DELETE FROM learned_weights")
    return {"message": "All learned weights cleared. Ratings preserved."}
