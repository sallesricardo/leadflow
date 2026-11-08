from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.automation import AutomationRule
from app.models.user import User
from app.schemas.automation import AutomationCreate, AutomationResponse, AutomationUpdate

router = APIRouter(prefix="/automations", tags=["automations"])


@router.get("", response_model=list[AutomationResponse])
def list_automations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(AutomationRule)
        .where(AutomationRule.user_id == current_user.id)
        .order_by(AutomationRule.created_at.desc())
    ).all()


@router.post("", response_model=AutomationResponse, status_code=status.HTTP_201_CREATED)
def create_automation(
    payload: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data["trigger_status"] = payload.trigger_status.value
    rule = AutomationRule(**data, user_id=current_user.id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=AutomationResponse)
def update_automation(
    rule_id: int,
    payload: AutomationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.scalar(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.user_id == current_user.id,
        )
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Automation not found")
    rule.enabled = payload.enabled
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_automation(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rule = db.scalar(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.user_id == current_user.id,
        )
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Automation not found")
    db.delete(rule)
    db.commit()
