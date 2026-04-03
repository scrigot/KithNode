"""Pipeline CRUD API — tracks contacts through outreach stages."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

VALID_STAGES = {"researched", "connected", "email_sent", "follow_up", "responded", "meeting_set"}


class AddToPipelineRequest(BaseModel):
    stage: str = "researched"
    notes: str = ""


class UpdateStageRequest(BaseModel):
    stage: str
    notes: str | None = None


# ─── Static routes FIRST (before {contact_id} param routes) ─────────

@router.get("")
def get_pipeline():
    """Return all pipeline contacts grouped by stage."""
    contacts = db.get_pipeline_contacts()

    grouped: dict[str, list] = {stage: [] for stage in db.PIPELINE_STAGES}
    for c in contacts:
        stage = c.get("stage", "researched")
        if stage in grouped:
            affs = db.get_affiliations_for_contact(c["id"])
            grouped[stage].append({
                "id": c["id"],
                "name": c.get("name", ""),
                "title": c.get("title", ""),
                "email": c.get("email", ""),
                "linkedin_url": c.get("linkedin_url", ""),
                "education": c.get("education", ""),
                "company_name": c.get("company_name", ""),
                "company_location": c.get("company_location", ""),
                "total_score": c.get("total_score", 0),
                "tier": c.get("tier", "cold"),
                "stage": stage,
                "notes": c.get("notes", ""),
                "added_at": c.get("added_at", ""),
                "affiliations": [a["name"] for a in affs],
            })

    return {
        "stages": db.PIPELINE_STAGES,
        "contacts": grouped,
        "total": len(contacts),
    }


@router.get("/reminders")
def get_reminders():
    """Return pipeline contacts that need follow-up action."""
    reminders = db.get_pipeline_reminders()
    return {"reminders": reminders, "total": len(reminders)}


# ─── Dynamic routes with {contact_id} ───────────────────────────────

@router.get("/{contact_id}/suggested-action")
def suggested_action(contact_id: int):
    """Get the suggested action + template for a pipeline contact."""
    from outreach_templates import get_suggested_action as get_action

    return get_action(contact_id)


@router.post("/{contact_id}")
def add_to_pipeline(contact_id: int, req: AddToPipelineRequest):
    """Add a contact to the pipeline."""
    if req.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    with db.get_db() as conn:
        row = conn.execute("SELECT id FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")

    pipeline_id = db.add_to_pipeline(contact_id, req.stage, req.notes)
    return {"contact_id": contact_id, "pipeline_id": pipeline_id, "stage": req.stage}


@router.patch("/{contact_id}")
def update_stage(contact_id: int, req: UpdateStageRequest):
    """Update the pipeline stage for a contact."""
    if req.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {VALID_STAGES}")

    if not db.is_in_pipeline(contact_id):
        raise HTTPException(status_code=404, detail="Contact not in pipeline")

    db.update_pipeline_stage(contact_id, req.stage, req.notes)
    return {"contact_id": contact_id, "stage": req.stage}


@router.delete("/{contact_id}")
def remove_from_pipeline(contact_id: int):
    """Remove a contact from the pipeline."""
    if not db.is_in_pipeline(contact_id):
        raise HTTPException(status_code=404, detail="Contact not in pipeline")

    db.remove_from_pipeline(contact_id)
    return {"contact_id": contact_id, "removed": True}
