from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.lead import LeadStatus


class AutomationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    trigger_status: LeadStatus
    task_title: str = Field(min_length=1, max_length=160)
    task_description: str | None = Field(default=None, max_length=4000)
    due_in_days: int = Field(default=1, ge=0, le=365)


class AutomationUpdate(BaseModel):
    enabled: bool


class AutomationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    trigger_status: LeadStatus
    task_title: str
    task_description: str | None
    due_in_days: int
    enabled: bool
    created_at: datetime
