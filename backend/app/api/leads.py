from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.repositories import lead as lead_repository
from app.schemas.lead import LeadCreate, LeadResponse, LeadUpdate


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

    for field, value in changes.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return lead
