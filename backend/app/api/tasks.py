from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.task import Task
from app.models.user import User
from app.repositories import task as task_repository
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        {**task.__dict__, "lead_name": lead_name}
        for task, lead_name in task_repository.list_by_user(db, current_user.id)
    ]


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.get(Lead, payload.lead_id)
    if lead is None or lead.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    task = Task(**payload.model_dump(), user_id=current_user.id)
    task_repository.create(db, task)
    return {**task.__dict__, "lead_name": lead.name}


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = task_repository.get_by_id(db, task_id, current_user.id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    changes = payload.model_dump(exclude_unset=True)
    task_repository.update(db, task, changes)
    lead = db.get(Lead, task.lead_id)
    return {**task.__dict__, "lead_name": lead.name}
