from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead


def create(db: Session, lead: Lead) -> Lead:
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


def get_by_id(db: Session, lead_id: int) -> Lead | None:
    return db.get(Lead, lead_id)


def list_all(db: Session) -> list[Lead]:
    statement = select(Lead).order_by(Lead.created_at.desc())

    return list(db.scalars(statement).all())
