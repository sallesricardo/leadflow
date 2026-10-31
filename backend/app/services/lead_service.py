from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.lead_activity import LeadActivity
from app.repositories import lead_activity as activity_repository


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

    db.commit()
    db.refresh(lead)

    return lead
