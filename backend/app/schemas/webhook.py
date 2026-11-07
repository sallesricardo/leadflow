from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

WebhookEvent = Literal["lead.created", "lead.updated", "lead.status_changed"]


class WebhookCreate(BaseModel):
    url: HttpUrl
    events: list[WebhookEvent]

    @field_validator("url")
    @classmethod
    def require_https(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https":
            raise ValueError("Webhook URLs must use HTTPS")
        return value


class WebhookUpdate(BaseModel):
    enabled: bool


class WebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    events: list[str]
    enabled: bool
    created_at: datetime


class WebhookCreated(WebhookResponse):
    secret: str


class WebhookDeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    event_type: str
    status: str
    attempt_count: int
    last_status_code: int | None
    last_error: str | None
    delivered_at: datetime | None
    created_at: datetime
