from fastapi import APIRouter, HTTPException

import database as db
from email_drafter import _draft_with_claude_v2

from app.models.outreach import (
    DraftOut,
    DraftRequest,
    StatusUpdateOut,
    StatusUpdateRequest,
)

router = APIRouter(prefix="/api/outreach", tags=["outreach"])

VALID_STATUSES = {"drafted", "sent", "replied", "bounced"}


@router.post("/draft", response_model=DraftOut)
def draft_outreach(req: DraftRequest):
    """Generate an AI email draft for a contact using Claude (or template fallback)."""
    # Build the rich contact dict that email_drafter expects
    with db.get_db() as conn:
        row = conn.execute(
            """
            SELECT c.*,
                   co.name as company, co.domain as company_domain,
                   co.website as company_website, co.location as company_location,
                   co.industry_tags as company_industry,
                   co.description as description
            FROM contacts c
            JOIN companies co ON c.company_id = co.id
            WHERE c.id = ?
            """,
            (req.contact_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact = dict(row)

    # Attach signals
    signals = db.get_signals_for_company(contact["company_id"])
    contact["signals"] = signals
    if signals:
        contact["signal_context"] = "; ".join(
            s["description"] for s in sorted(signals, key=lambda x: x["strength"], reverse=True)
        )
    else:
        contact["signal_context"] = ""

    # Attach affiliations
    affs = db.get_affiliations_for_contact(req.contact_id)
    contact["affiliations"] = ", ".join(a["name"] for a in affs)

    # Get tier from score
    with db.get_db() as conn:
        score_row = conn.execute(
            "SELECT tier FROM scores WHERE contact_id = ?", (req.contact_id,)
        ).fetchone()
    contact["tier"] = dict(score_row)["tier"] if score_row else "unknown"

    # Generate draft
    result = _draft_with_claude_v2(contact)
    outreach_id = db.save_outreach(req.contact_id, result["subject"], result["body"])

    return DraftOut(
        contact_id=req.contact_id,
        subject=result["subject"],
        body=result["body"],
        outreach_id=outreach_id,
    )


@router.post("/{outreach_id}/status", response_model=StatusUpdateOut)
def update_outreach_status(outreach_id: int, req: StatusUpdateRequest):
    """Update outreach status. Used by the AutoGuard state machine."""
    if req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: {VALID_STATUSES}",
        )

    found = db.update_outreach_status(outreach_id, req.status)
    if not found:
        raise HTTPException(status_code=404, detail="Outreach record not found")

    return StatusUpdateOut(
        outreach_id=outreach_id,
        status=req.status,
        message=f"Outreach {outreach_id} status updated to '{req.status}'",
    )
