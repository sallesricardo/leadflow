from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.services.webhook_service import enqueue_lead_event


def create(db: Session, lead: Lead) -> Lead:
    db.add(lead)
    db.flush()
    enqueue_lead_event(
        db,
        user_id=lead.user_id,
        event_type="lead.created",
        lead=lead,
    )
    db.commit()
    db.refresh(lead)

    return lead


def get_by_id(
    db: Session,
    lead_id: int,
    user_id: int,
) -> Lead | None:
    statement = select(Lead).where(
        Lead.id == lead_id,
        Lead.user_id == user_id,
    )

    return db.scalar(statement)


def list_all(
    db: Session,
    user_id: int,
) -> list[Lead]:
    statement = (
        select(Lead)
        .where(Lead.user_id == user_id)
        .order_by(Lead.created_at.desc())
    )

    return list(db.scalars(statement).all())
