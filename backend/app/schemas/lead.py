from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class LeadCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    source: str | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    source: str | None = None
    status: str | None = None
    notes: str | None = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None
    source: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
