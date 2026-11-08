from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.lead_activity import LeadActivity
from app.repositories import lead_activity as activity_repository
from app.services.webhook_service import enqueue_lead_event
from app.services.automation_service import create_follow_up_tasks


def update_lead(
    db: Session,
    lead: Lead,
    changes: dict,
    user_id: int,
) -> Lead:
    old_status = lead.status

    for field, value in changes.items():
        setattr(lead, field, value)

    new_status = lead.status

    if (
        "status" in changes
        and old_status != new_status
    ):
        activity = LeadActivity(
            lead_id=lead.id,
            user_id=user_id,
            type="STATUS_CHANGE",
            content=(
                f"Status alterado de "
                f"{old_status} para {new_status}"
            ),
        )

        activity_repository.create(db, activity)

    if changes:
        db.flush()
        enqueue_lead_event(
            db,
            user_id=user_id,
            event_type="lead.status_changed" if old_status != new_status else "lead.updated",
            lead=lead,
        )

    if old_status != new_status:
        create_follow_up_tasks(db, lead, user_id)

    db.commit()
    db.refresh(lead)

    return lead
