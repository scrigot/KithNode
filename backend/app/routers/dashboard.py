"""Dashboard endpoints — coverage tracker and overview stats."""

from fastapi import APIRouter

import database as db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/coverage")
def get_coverage():
    """Return firm coverage: which target companies have pipeline contacts."""
    prefs = db.get_user_preferences()
    target_companies = prefs.get("target_companies", [])

    if not target_companies:
        return {
            "covered": [],
            "uncovered": [],
            "total_target": 0,
            "total_covered": 0,
        }

    pipeline = db.get_pipeline_contacts()

    # Group pipeline contacts by company
    company_contacts: dict[str, list] = {}
    for c in pipeline:
        co = c.get("company_name", "Unknown")
        if co not in company_contacts:
            company_contacts[co] = []
        company_contacts[co].append({
            "name": c.get("name", ""),
            "stage": c.get("stage", ""),
        })

    covered = []
    uncovered = []

    for target in target_companies:
        # Check if any pipeline company matches this target
        matched = None
        for co_name, contacts in company_contacts.items():
            if target.lower() in co_name.lower():
                matched = co_name
                break

        if matched:
            covered.append({
                "company": target,
                "contacts": len(company_contacts[matched]),
                "stages": [c["stage"] for c in company_contacts[matched]],
            })
        else:
            uncovered.append(target)

    return {
        "covered": covered,
        "uncovered": uncovered,
        "total_target": len(target_companies),
        "total_covered": len(covered),
    }


@router.get("/overview")
def get_overview():
    """Return dashboard overview stats."""
    stats = db.get_stats()
    pipeline = db.get_pipeline_contacts()
    reminders = db.get_pipeline_reminders()
    ratings = db.get_ratings_summary()

    pipeline_by_stage: dict[str, int] = {}
    for c in pipeline:
        stage = c.get("stage", "")
        pipeline_by_stage[stage] = pipeline_by_stage.get(stage, 0) + 1

    return {
        "stats": stats,
        "pipeline_total": len(pipeline),
        "pipeline_by_stage": pipeline_by_stage,
        "reminders_count": len(reminders),
        "ratings": ratings,
    }
