"""add optional webhook bearer token

Revision ID: a6c9e2f31b74
Revises: 81a4d55f20b9
Create Date: 2026-11-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a6c9e2f31b74"
down_revision: Union[str, Sequence[str], None] = "81a4d55f20b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "webhook_endpoints",
        sa.Column("auth_token", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("webhook_endpoints", "auth_token")
