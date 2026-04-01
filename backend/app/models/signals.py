from pydantic import BaseModel


class SignalOut(BaseModel):
    id: int
    signal_type: str
    description: str = ""
    strength: int
    source_url: str = ""
    detected_at: str = ""


class SignalStackOut(BaseModel):
    should_outreach: bool
    reason: str
    combined_strength: int


class CompanySignalsOut(BaseModel):
    company_name: str
    domain: str
    signals: list[SignalOut]
    signal_stack: SignalStackOut
