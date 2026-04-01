from pydantic import BaseModel


class StatsOut(BaseModel):
    companies: int
    contacts: int
    signals: int
    scored: int
    affiliations: int
    emails_verified: int
    outreach_drafted: int
