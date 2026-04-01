from fastapi import APIRouter

import database as db

from app.models.stats import StatsOut

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=StatsOut)
def get_stats():
    """Return summary statistics from the pipeline database."""
    return StatsOut(**db.get_stats())
