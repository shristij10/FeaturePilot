"""add rollout_percentage to feature_flags

Revision ID: a1b2c3d4e5f6
Revises: 7e76c6e15e98
Create Date: 2026-07-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7e76c6e15e98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add rollout_percentage column to feature_flags table.

    Defaults to 100 so all existing rows are treated as fully rolled out,
    preserving backward compatibility.
    """
    op.add_column(
        'feature_flags',
        sa.Column(
            'rollout_percentage',
            sa.Integer(),
            nullable=False,
            server_default='100',
        ),
    )


def downgrade() -> None:
    """Remove rollout_percentage column from feature_flags table."""
    op.drop_column('feature_flags', 'rollout_percentage')
