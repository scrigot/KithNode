"""User preferences API."""

import json

from fastapi import APIRouter
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/user", tags=["user"])


class PreferencesPayload(BaseModel):
    current_university: str | None = None
    target_universities: list[str] | None = None
    target_industries: list[str] | None = None
    target_companies: list[str] | None = None
    target_roles: list[str] | None = None
    greek_life: str | None = None
    target_locations: list[str] | None = None


@router.get("/preferences")
def get_preferences():
    """Return all user preferences."""
    return db.get_user_preferences()


@router.post("/preferences")
def save_preferences(payload: PreferencesPayload):
    """Save user preferences. Only provided fields are updated."""
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        db.save_user_preference(key, json.dumps(value))

    # Re-score all contacts with new preferences
    from scoring import score_contact

    prefs = db.get_user_preferences()
    all_contacts = db.get_scored_contacts(min_score=0, limit=9999)
    rescored = 0
    for c in all_contacts:
        scored = score_contact(c, prefs=prefs)
        db.save_score(
            c["id"],
            scored["fit_score"],
            scored["signal_score"],
            scored["engagement_score"],
            scored["priority_score"],
            scored["tier"],
        )
        rescored += 1

    return {
        "saved": len(data),
        "rescored": rescored,
        "preferences": db.get_user_preferences(),
    }
