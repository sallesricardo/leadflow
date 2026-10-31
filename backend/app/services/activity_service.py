from sqlalchemy.orm import Session

from app.models.lead_activity import LeadActivity
from app.repositories import lead_activity as activity_repository


def create_activity(
    db: Session,
    activity: LeadActivity,
) -> LeadActivity:
    activity_repository.create(db, activity)

    db.commit()
    db.refresh(activity)

    return activity
