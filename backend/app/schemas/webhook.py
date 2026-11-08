from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, SecretStr, field_validator

WebhookEvent = Literal[
    "lead.created",
    "lead.updated",
    "lead.status_changed",
    "task.created",
    "task.completed",
    "task.reopened",
]


class WebhookCreate(BaseModel):
    url: HttpUrl
    events: list[WebhookEvent]
    auth_token: SecretStr | None = Field(default=None, max_length=1024)

    @field_validator("url")
    @classmethod
    def require_https(cls, value: HttpUrl) -> HttpUrl:
        if value.scheme != "https":
            raise ValueError("Webhook URLs must use HTTPS")
        return value

    @field_validator("auth_token")
    @classmethod
    def reject_token_whitespace(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None:
            token = value.get_secret_value()
            if not token or any(character.isspace() for character in token):
                raise ValueError("Bearer tokens must be non-empty and contain no whitespace")
        return value


class WebhookUpdate(BaseModel):
    enabled: bool | None = None
    auth_token: SecretStr | None = Field(default=None, max_length=1024)

    @field_validator("auth_token")
    @classmethod
    def reject_token_whitespace(cls, value: SecretStr | None) -> SecretStr | None:
        if value is not None:
            token = value.get_secret_value()
            if not token or any(character.isspace() for character in token):
                raise ValueError("Bearer tokens must be non-empty and contain no whitespace")
        return value


class WebhookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    events: list[str]
    enabled: bool
    has_auth_token: bool
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


class WebhookDeliverySummary(BaseModel):
    pending: int
    paused_pending: int
    processing: int
    delivered: int
    failed: int
    total: int
    oldest_pending_at: datetime | None
    oldest_due_pending_at: datetime | None
    stale_pending: bool
    latest_delivery_at: datetime | None
    worker_active: bool
    worker_last_heartbeat_at: datetime | None
