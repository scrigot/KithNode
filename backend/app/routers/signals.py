from fastapi import APIRouter, HTTPException, Query

import database as db
from signal_detector import compute_signal_stack

from app.models.signals import CompanySignalsOut, SignalOut, SignalStackOut

router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("/{domain}", response_model=CompanySignalsOut)
def get_signals_for_domain(
    domain: str,
    max_age_days: int = Query(90, ge=1, le=365),
):
    """Return stored signals for a company domain, with signal stack analysis."""
    company = db.get_company_by_domain(domain)
    if not company:
        raise HTTPException(
            status_code=404,
            detail=f"Company with domain '{domain}' not found",
        )

    signals = db.get_signals_for_company(company["id"], max_age_days=max_age_days)
    stack = compute_signal_stack(signals)

    return CompanySignalsOut(
        company_name=company["name"],
        domain=domain,
        signals=[SignalOut(**s) for s in signals],
        signal_stack=SignalStackOut(**stack),
    )
