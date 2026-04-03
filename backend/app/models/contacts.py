from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from app.models.signals import SignalOut


class CompanyOut(BaseModel):
    name: str
    domain: str
    website: str = ""
    location: str = ""
    industry_tags: list[str] = []
    description: str = ""


class ScoreOut(BaseModel):
    fit_score: float
    signal_score: float
    engagement_score: float
    total_score: float
    tier: str
    scored_at: str = ""


class AffiliationOut(BaseModel):
    id: int
    name: str
    boost: int = 0


class OutreachHistoryOut(BaseModel):
    id: int
    email_subject: str = ""
    email_body: str = ""
    status: str = "drafted"
    sent_at: Optional[str] = None
    replied_at: Optional[str] = None
    created_at: str = ""


class ContactRankedOut(BaseModel):
    id: int
    name: str
    title: str = ""
    email: str = ""
    email_status: str = ""
    linkedin_url: str = ""
    education: str = ""
    linkedin_location: str = ""
    why_now: str = ""
    warm_path: str = ""
    company: CompanyOut
    score: ScoreOut


class ContactDetailOut(BaseModel):
    id: int
    name: str
    title: str = ""
    email: str = ""
    email_status: str = ""
    email_confidence: str = ""
    linkedin_url: str = ""
    education: str = ""
    linkedin_location: str = ""
    source: str = ""
    company: CompanyOut
    score: Optional[ScoreOut] = None
    affiliations: list[AffiliationOut] = []
    outreach_history: list[OutreachHistoryOut] = []
    signals: list[SignalOut] = []
