from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.automation import AutomationRule
from app.models.lead import Lead
from app.models.task import Task
from app.services.webhook_service import enqueue_task_event


def create_follow_up_tasks(db: Session, lead: Lead, user_id: int) -> None:
    rules = db.scalars(
        select(AutomationRule).where(
            AutomationRule.user_id == user_id,
            AutomationRule.trigger_status == lead.status,
            AutomationRule.enabled.is_(True),
        )
    ).all()
    now = datetime.now(UTC)
    for rule in rules:
        task = Task(
            user_id=user_id,
            lead_id=lead.id,
            title=rule.task_title,
            description=rule.task_description,
            due_at=now + timedelta(days=rule.due_in_days),
            completed=False,
        )
        db.add(task)
        db.flush()
        db.refresh(task)
        enqueue_task_event(
            db,
            user_id=user_id,
            event_type="task.created",
            task=task,
        )
