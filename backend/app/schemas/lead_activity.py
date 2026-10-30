from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeadActivityCreate(BaseModel):
    type: str
    content: str | None = None


class LeadActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    user_id: int
    type: str
    content: str | None
    created_at: datetime
