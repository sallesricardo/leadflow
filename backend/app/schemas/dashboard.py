from decimal import Decimal

from pydantic import BaseModel

from app.domain.lead import LeadStatus


class LeadStatusMetric(BaseModel):
    status: LeadStatus
    count: int


class LeadSourceMetric(BaseModel):
    source: str
    lead_count: int
    won_count: int
    conversion_rate: float


class DashboardMetricsResponse(BaseModel):
    total_leads: int
    status_counts: list[LeadStatusMetric]
    conversion_rate: float
    won_value: Decimal
    lost_value: Decimal
    source_metrics: list[LeadSourceMetric]
