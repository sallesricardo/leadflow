from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.webhook import (
    WebhookDelivery,
    WebhookEndpoint,
    WebhookWorkerHeartbeat,
)
from app.schemas.webhook import (
    WebhookCreate,
    WebhookCreated,
    WebhookDeliveryResponse,
    WebhookDeliverySummary,
    WebhookResponse,
    WebhookUpdate,
)
from app.services import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
STALE_QUEUE_AFTER = timedelta(minutes=2)
WEBHOOK_WORKER_KEY = "webhook-delivery"
HEARTBEAT_STALE_AFTER_SECONDS = 30


@router.get("", response_model=list[WebhookResponse])
def list_webhooks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(WebhookEndpoint)
        .where(WebhookEndpoint.user_id == current_user.id)
        .order_by(WebhookEndpoint.created_at.desc())
    ).all()


@router.post("", response_model=WebhookCreated, status_code=status.HTTP_201_CREATED)
def create_webhook(
    payload: WebhookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.events:
        raise HTTPException(status_code=422, detail="Select at least one event")
    endpoint, secret = webhook_service.create_endpoint(
        db,
        user_id=current_user.id,
        url=str(payload.url),
        events=list(dict.fromkeys(payload.events)),
        auth_token=payload.auth_token.get_secret_value() if payload.auth_token else None,
    )
    return {
        "id": endpoint.id,
        "url": endpoint.url,
        "events": endpoint.events,
        "enabled": endpoint.enabled,
        "has_auth_token": endpoint.auth_token is not None,
        "created_at": endpoint.created_at,
        "secret": secret,
    }


@router.get("/summary", response_model=WebhookDeliverySummary)
def webhook_delivery_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(UTC)
    pending_status = WebhookDelivery.status.in_(("pending", "processing"))
    due_pending_status = (
        WebhookEndpoint.enabled.is_(True)
        & pending_status
        & (WebhookDelivery.available_at <= now)
    )
    paused_pending_status = (
        WebhookEndpoint.enabled.is_(False)
        & (WebhookDelivery.status == "pending")
    )
    stale_pending_status = due_pending_status & (
        WebhookDelivery.created_at <= now - STALE_QUEUE_AFTER
    )
    result = db.execute(
        select(
            func.count(WebhookDelivery.id).label("total"),
            func.sum(case((WebhookDelivery.status == "pending", 1), else_=0)).label(
                "pending"
            ),
            func.sum(case((paused_pending_status, 1), else_=0)).label("paused_pending"),
            func.sum(case((WebhookDelivery.status == "processing", 1), else_=0)).label(
                "processing"
            ),
            func.sum(case((WebhookDelivery.status == "delivered", 1), else_=0)).label(
                "delivered"
            ),
            func.sum(case((WebhookDelivery.status == "failed", 1), else_=0)).label(
                "failed"
            ),
            func.min(case((pending_status, WebhookDelivery.created_at), else_=None)).label(
                "oldest_pending_at"
            ),
            func.min(case((due_pending_status, WebhookDelivery.created_at), else_=None)).label(
                "oldest_due_pending_at"
            ),
            func.sum(case((stale_pending_status, 1), else_=0)).label("stale_pending_count"),
            func.max(WebhookDelivery.created_at).label("latest_delivery_at"),
        )
        .join(WebhookEndpoint, WebhookEndpoint.id == WebhookDelivery.endpoint_id)
        .where(WebhookEndpoint.user_id == current_user.id)
    ).one()
    heartbeat = db.execute(
        select(
            WebhookWorkerHeartbeat.heartbeat_at,
            (
                WebhookWorkerHeartbeat.heartbeat_at
                >= now - timedelta(seconds=HEARTBEAT_STALE_AFTER_SECONDS)
            ).label("active"),
        ).where(WebhookWorkerHeartbeat.worker_key == WEBHOOK_WORKER_KEY)
    ).one_or_none()
    return {
        "pending": result.pending or 0,
        "paused_pending": result.paused_pending or 0,
        "processing": result.processing or 0,
        "delivered": result.delivered or 0,
        "failed": result.failed or 0,
        "total": result.total or 0,
        "oldest_pending_at": result.oldest_pending_at,
        "oldest_due_pending_at": result.oldest_due_pending_at,
        "stale_pending": bool(result.stale_pending_count),
        "latest_delivery_at": result.latest_delivery_at,
        "worker_active": bool(heartbeat and heartbeat.active),
        "worker_last_heartbeat_at": heartbeat.heartbeat_at if heartbeat else None,
    }


@router.delete("/{endpoint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    endpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    endpoint = db.scalar(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.user_id == current_user.id,
        )
    )
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    webhook_service.delete_endpoint(db, endpoint)


@router.patch("/{endpoint_id}", response_model=WebhookResponse)
def update_webhook(
    endpoint_id: int,
    payload: WebhookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    endpoint = db.scalar(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.user_id == current_user.id,
        )
    )
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    fields = payload.model_fields_set
    if not fields:
        raise HTTPException(status_code=422, detail="No webhook changes provided")
    auth_token = payload.auth_token.get_secret_value() if payload.auth_token else None
    return webhook_service.set_endpoint_enabled(
        db,
        endpoint,
        enabled=payload.enabled,
        auth_token=auth_token,
        update_auth_token="auth_token" in fields,
    )


@router.get(
    "/{endpoint_id}/deliveries",
    response_model=list[WebhookDeliveryResponse],
)
def list_deliveries(
    endpoint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    endpoint = db.scalar(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.user_id == current_user.id,
        )
    )
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return db.scalars(
        select(WebhookDelivery)
        .where(WebhookDelivery.endpoint_id == endpoint.id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(100)
    ).all()


@router.post(
    "/{endpoint_id}/deliveries/{delivery_id}/retry",
    response_model=WebhookDeliveryResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_webhook_delivery(
    endpoint_id: int,
    delivery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    endpoint = db.scalar(
        select(WebhookEndpoint).where(
            WebhookEndpoint.id == endpoint_id,
            WebhookEndpoint.user_id == current_user.id,
        )
    )
    if endpoint is None:
        raise HTTPException(status_code=404, detail="Webhook not found")

    delivery = db.scalar(
        select(WebhookDelivery).where(
            WebhookDelivery.id == delivery_id,
            WebhookDelivery.endpoint_id == endpoint.id,
        )
    )
    if delivery is None:
        raise HTTPException(status_code=404, detail="Webhook delivery not found")
    if delivery.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed deliveries can be retried",
        )
    return webhook_service.retry_delivery(db, delivery)
