from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


# ─── Import Models ───────────────────────────────────────────────────

class LinkedInImportRequest(BaseModel):
    urls: list[str]


class ImportedContactOut(BaseModel):
    id: int = 0
    name: str = ""
    title: str = ""
    linkedin_url: str = ""
    company_name: str = ""
    company_domain: str = ""
    affiliations: list[str] = []
    total_score: float = 0
    tier: str = "cold"
    error: Optional[str] = None


class LinkedInImportResponse(BaseModel):
    imported: int
    failed: int
    contacts: list[ImportedContactOut]


# ─── Rating Models ───────────────────────────────────────────────────

class RateContactRequest(BaseModel):
    rating: str  # high_value | skip | not_interested


class RatingsProgress(BaseModel):
    total_ratings: int
    high_value_count: int
    skip_count: int
    not_interested_count: int
    learning_active: bool
    ratings_needed: int


class RateContactResponse(BaseModel):
    contact_id: int
    rating: str
    total_ratings: int
    learning_active: bool
    message: str = ""


# ─── Discover Models ─────────────────────────────────────────────────

class DiscoverContactOut(BaseModel):
    id: int
    name: str
    title: str = ""
    email: str = ""
    linkedin_url: str = ""
    education: str = ""
    linkedin_location: str = ""
    company_name: str = ""
    company_domain: str = ""
    company_location: str = ""
    company_industry_tags: list[str] = []
    affiliations: list[str] = []
    total_score: float = 0
    fit_score: float = 0
    signal_score: float = 0
    engagement_score: float = 0
    tier: str = "cold"
    signals: list[dict] = []


class DiscoverResponse(BaseModel):
    contacts: list[DiscoverContactOut]
    total_unrated: int
    ratings_progress: RatingsProgress


# ─── Preferences Models ─────────────────────────────────────────────

class LearnedWeightOut(BaseModel):
    dimension: str
    feature: str
    lift_factor: float
    sample_count: int
    updated_at: str = ""


class PreferencesOut(BaseModel):
    ratings_summary: RatingsProgress
    learned_weights: list[LearnedWeightOut]
    learning_active: bool


class RecalculateResponse(BaseModel):
    learning_active: bool
    weights_updated: int
    contacts_rescored: int
    message: str
