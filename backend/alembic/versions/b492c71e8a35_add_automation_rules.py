"""add lead status automation rules

Revision ID: b492c71e8a35
Revises: a6c9e2f31b74
Create Date: 2026-11-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b492c71e8a35"
down_revision: Union[str, Sequence[str], None] = "a6c9e2f31b74"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "automation_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("trigger_status", sa.String(length=30), nullable=False),
        sa.Column("task_title", sa.String(length=160), nullable=False),
        sa.Column("task_description", sa.Text(), nullable=True),
        sa.Column("due_in_days", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_automation_rules_user_id", "automation_rules", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_automation_rules_user_id", table_name="automation_rules")
    op.drop_table("automation_rules")
