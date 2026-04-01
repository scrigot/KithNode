from pydantic import BaseModel


class DraftRequest(BaseModel):
    contact_id: int


class DraftOut(BaseModel):
    contact_id: int
    subject: str
    body: str
    outreach_id: int


class StatusUpdateRequest(BaseModel):
    status: str  # drafted | sent | replied | bounced


class StatusUpdateOut(BaseModel):
    outreach_id: int
    status: str
    message: str
