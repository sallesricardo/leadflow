from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.lead import Lead
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
    db: Session = Depends(get_db),
):
    lead = Lead(**payload.model_dump())

    return lead_repository.create(db, lead)


@router.get(
    "",
    response_model=list[LeadResponse],
)
def list_leads(
    db: Session = Depends(get_db),
):
    return lead_repository.list_all(db)


@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(db, lead_id)

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
    db: Session = Depends(get_db),
):
    lead = lead_repository.get_by_id(db, lead_id)

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
