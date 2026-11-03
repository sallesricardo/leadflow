from decimal import Decimal

from sqlalchemy.orm import Session

from app.domain.lead import LeadStatus
from app.repositories import dashboard as dashboard_repository
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    LeadSourceMetric,
    LeadStatusMetric,
)


def get_dashboard_metrics(db: Session, user_id: int) -> DashboardMetricsResponse:
    counts_by_status = dict(
        dashboard_repository.count_leads_by_status(db, user_id)
    )
    status_counts = [
        LeadStatusMetric(status=status, count=counts_by_status.get(status.value, 0))
        for status in LeadStatus
    ]
    total_leads = sum(item.count for item in status_counts)

    won_count = counts_by_status.get(LeadStatus.WON.value, 0)
    lost_count = counts_by_status.get(LeadStatus.LOST.value, 0)
    closed_count = won_count + lost_count
    conversion_rate = won_count / closed_count * 100 if closed_count else 0.0

    values_by_status = dict(
        dashboard_repository.sum_value_by_status(db, user_id)
    )
    won_value = values_by_status.get(LeadStatus.WON.value) or Decimal("0.00")
    lost_value = values_by_status.get(LeadStatus.LOST.value) or Decimal("0.00")

    source_metrics = []
    for source, lead_count, source_won_count, source_closed_count in (
        dashboard_repository.performance_by_source(db, user_id)
    ):
        source_conversion = (
            source_won_count / source_closed_count * 100
            if source_closed_count
            else 0.0
        )
        source_metrics.append(
            LeadSourceMetric(
                source=source,
                lead_count=lead_count,
                won_count=source_won_count,
                conversion_rate=source_conversion,
            )
        )

    return DashboardMetricsResponse(
        total_leads=total_leads,
        status_counts=status_counts,
        conversion_rate=conversion_rate,
        won_value=won_value,
        lost_value=lost_value,
        source_metrics=source_metrics,
    )
