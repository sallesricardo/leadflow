import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.task import Task
from app.models.webhook import WebhookDelivery, WebhookEndpoint


def create_endpoint(
    db: Session,
    *,
    user_id: int,
    url: str,
    events: list[str],
    auth_token: str | None,
) -> tuple[WebhookEndpoint, str]:
    secret = secrets.token_urlsafe(32)
    endpoint = WebhookEndpoint(
        user_id=user_id,
        url=url,
        secret=secret,
        auth_token=auth_token,
        events=events,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint, secret


def _enqueue_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    data: dict,
) -> None:
    endpoints = db.scalars(
        select(WebhookEndpoint).where(
            WebhookEndpoint.user_id == user_id,
            WebhookEndpoint.enabled.is_(True),
        )
    ).all()
    matching = [endpoint for endpoint in endpoints if event_type in endpoint.events]
    if not matching:
        return

    event_id = str(uuid.uuid4())
    created_at = datetime.now(UTC).isoformat()
    payload = {
        "id": event_id,
        "type": event_type,
        "created_at": created_at,
        "data": data,
    }
    for endpoint in matching:
        db.add(
            WebhookDelivery(
                endpoint_id=endpoint.id,
                event_id=event_id,
                event_type=event_type,
                payload=payload,
            )
        )


def enqueue_lead_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    lead: Lead,
) -> None:
    _enqueue_event(
        db,
        user_id=user_id,
        event_type=event_type,
        data={
            "lead": {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "source": lead.source,
                "status": lead.status,
                "value": str(lead.value) if lead.value is not None else None,
                "notes": lead.notes,
                "created_at": lead.created_at.isoformat() if lead.created_at else None,
                "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
            }
        },
    )


def enqueue_task_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    task: Task,
) -> None:
    _enqueue_event(
        db,
        user_id=user_id,
        event_type=event_type,
        data={
            "task": {
                "id": task.id,
                "lead_id": task.lead_id,
                "title": task.title,
                "description": task.description,
                "due_at": task.due_at.isoformat(),
                "completed": task.completed,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            }
        },
    )


def delete_endpoint(db: Session, endpoint: WebhookEndpoint) -> None:
    db.delete(endpoint)
    db.commit()


def set_endpoint_enabled(
    db: Session,
    endpoint: WebhookEndpoint,
    *,
    enabled: bool | None,
    auth_token: str | None,
    update_auth_token: bool,
) -> WebhookEndpoint:
    if enabled is not None:
        endpoint.enabled = enabled
    if update_auth_token:
        endpoint.auth_token = auth_token
    db.commit()
    db.refresh(endpoint)
    return endpoint


def retry_delivery(db: Session, delivery: WebhookDelivery) -> WebhookDelivery:
    delivery.status = "pending"
    delivery.attempt_count = 0
    delivery.available_at = datetime.now(UTC)
    delivery.last_status_code = None
    delivery.last_error = None
    delivery.delivered_at = None
    db.commit()
    db.refresh(delivery)
    return delivery
