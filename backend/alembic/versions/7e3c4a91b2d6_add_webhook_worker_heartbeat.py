"""add webhook worker heartbeat

Revision ID: 7e3c4a91b2d6
Revises: b492c71e8a35
Create Date: 2026-11-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7e3c4a91b2d6"
down_revision: Union[str, Sequence[str], None] = "b492c71e8a35"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "webhook_worker_heartbeats",
        sa.Column("worker_key", sa.String(length=80), nullable=False),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("worker_key"),
    )


def downgrade() -> None:
    op.drop_table("webhook_worker_heartbeats")
