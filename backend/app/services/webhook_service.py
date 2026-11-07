import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.webhook import WebhookDelivery, WebhookEndpoint


def create_endpoint(
    db: Session,
    *,
    user_id: int,
    url: str,
    events: list[str],
) -> tuple[WebhookEndpoint, str]:
    secret = secrets.token_urlsafe(32)
    endpoint = WebhookEndpoint(
        user_id=user_id,
        url=url,
        secret=secret,
        events=events,
    )
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint, secret


def enqueue_lead_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    lead: Lead,
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
        "data": {
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


def delete_endpoint(db: Session, endpoint: WebhookEndpoint) -> None:
    db.delete(endpoint)
    db.commit()
