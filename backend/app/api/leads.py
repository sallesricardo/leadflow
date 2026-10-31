from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.repositories import lead as lead_repository
from app.schemas.lead import LeadCreate, LeadResponse, LeadUpdate
from app.services import lead_service

from app.models.lead_activity import LeadActivity
from app.repositories import lead_activity as activity_repository
from app.schemas.lead_activity import (
    LeadActivityCreate,
    LeadActivityResponse,
)


router = APIRouter(
    prefix="/leads",
    tags=["leads"],
)


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lead(
    payload: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = Lead(
        **payload.model_dump(),
        user_id=current_user.id,
    )

    return lead_repository.create(db, lead)


@router.get(
    "",
    response_model=list[LeadResponse],
)
def list_leads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lead_repository.list_all(
        db,
        current_user.id,
    )


@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(
        db,
        lead_id,
        current_user.id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return lead


@router.patch(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(
        db,
        lead_id,
        current_user.id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    changes = payload.model_dump(exclude_unset=True)

    return lead_service.update_lead(
        db,
        lead,
        changes,
        current_user.id,
    )


@router.get(
    "/{lead_id}/activities",
    response_model=list[LeadActivityResponse],
)
def list_activities(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(
        db,
        lead_id,
        current_user.id,
    )

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    return activity_repository.list_by_lead(
        db,
        lead_id,
        current_user.id,
    )


@router.post(
    "/{lead_id}/activities",
    response_model=LeadActivityResponse,
    status_code=201,
)
def create_activity(
    lead_id: int,
    payload: LeadActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(
        db,
        lead_id,
        current_user.id,
    )

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    activity = LeadActivity(
        lead_id=lead_id,
        user_id=current_user.id,
        type=payload.type,
        content=payload.content,
    )

    return activity_repository.create(db, activity)
