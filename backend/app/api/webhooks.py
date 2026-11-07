from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.webhook import WebhookDelivery, WebhookEndpoint
from app.schemas.webhook import (
    WebhookCreate,
    WebhookCreated,
    WebhookDeliveryResponse,
    WebhookResponse,
)
from app.services import webhook_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


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
    )
    return {**endpoint.__dict__, "secret": secret}


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
