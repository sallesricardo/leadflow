from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr

from app.domain.lead import LeadStatus


class LeadCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    source: str | None = None
    value: Decimal | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    source: str | None = None
    status: LeadStatus | None = None
    value: Decimal | None = None
    notes: str | None = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None
    source: str | None
    status: LeadStatus
    value: Decimal | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
