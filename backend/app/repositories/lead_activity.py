from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead_activity import LeadActivity


def create(
    db: Session,
    activity: LeadActivity,
) -> LeadActivity:
    db.add(activity)
    db.flush()

    return activity


def list_by_lead(
    db: Session,
    lead_id: int,
    user_id: int,
) -> list[LeadActivity]:
    statement = (
        select(LeadActivity)
        .where(
            LeadActivity.lead_id == lead_id,
            LeadActivity.user_id == user_id,
        )
        .order_by(LeadActivity.created_at.desc())
    )

    return list(db.scalars(statement).all())
