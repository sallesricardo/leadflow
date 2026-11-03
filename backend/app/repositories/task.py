from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.task import Task


def list_by_user(db: Session, user_id: int) -> list[tuple[Task, str]]:
    statement = (
        select(Task, Lead.name)
        .join(Lead, Lead.id == Task.lead_id)
        .where(Task.user_id == user_id)
        .order_by(Task.completed.asc(), Task.due_at.asc(), Task.id.desc())
    )
    return list(db.execute(statement).all())


def get_by_id(db: Session, task_id: int, user_id: int) -> Task | None:
    return db.scalar(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )


def create(db: Session, task: Task) -> Task:
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update(db: Session, task: Task, changes: dict) -> Task:
    for key, value in changes.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task
