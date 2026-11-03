from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.lead import Lead


def count_leads_by_status(db: Session, user_id: int) -> list[tuple[str, int]]:
    statement = (
        select(Lead.status, func.count(Lead.id))
        .where(Lead.user_id == user_id)
        .group_by(Lead.status)
    )
    return list(db.execute(statement).all())


def sum_value_by_status(
    db: Session,
    user_id: int,
) -> list[tuple[str, Decimal | None]]:
    statement = (
        select(Lead.status, func.sum(Lead.value))
        .where(Lead.user_id == user_id)
        .group_by(Lead.status)
    )
    return list(db.execute(statement).all())


def performance_by_source(
    db: Session,
    user_id: int,
) -> list[tuple[str, int, int, int]]:
    source = func.coalesce(
        func.nullif(func.trim(Lead.source), ""),
        "Sem origem",
    ).label("source")
    won_count = func.sum(case((Lead.status == "WON", 1), else_=0))
    closed_count = func.sum(
        case((Lead.status.in_(("WON", "LOST")), 1), else_=0)
    )
    statement = (
        select(
            source,
            func.count(Lead.id),
            won_count,
            closed_count,
        )
        .where(Lead.user_id == user_id)
        .group_by(source)
        .order_by(func.count(Lead.id).desc(), source.asc())
    )
    return list(db.execute(statement).all())
