"""Extend audit_logs: rename old/new_value, add flag_id, environment_id

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-07-30 00:00:00.000000

What this migration does
------------------------
Milestone 3 – Task 2: extend the existing ``audit_logs`` table in-place.

1. Rename ``old_value``  → ``old_state``
2. Rename ``new_value``  → ``new_state``
3. Add ``flag_id``        — nullable FK → feature_flags.id  (SET NULL on delete)
4. Add ``environment_id`` — nullable FK → environments.id   (SET NULL on delete)

No data is lost.  All existing rows get NULL for the two new FK columns,
which is valid because both are nullable.  The Text values in old_value /
new_value are preserved under their new column names.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision:       str                         = "b3c4d5e6f7a8"
down_revision:  Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels:  Union[str, Sequence[str], None] = None
depends_on:     Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Upgrade
# ---------------------------------------------------------------------------

def upgrade() -> None:
    """
    1. Rename old_value  → old_state
    2. Rename new_value  → new_state
    3. Add flag_id        (nullable FK → feature_flags.id,  SET NULL)
    4. Add environment_id (nullable FK → environments.id,   SET NULL)
    """

    # -- 1 & 2: column renames -------------------------------------------
    # SQLite does not support ALTER TABLE … RENAME COLUMN in older versions,
    # but the version bundled with Python 3.8+ (SQLite ≥ 3.25) does support
    # it.  Alembic's op.alter_column with new_column_name handles this.
    with op.batch_alter_table("audit_logs") as batch_op:
        batch_op.alter_column(
            "old_value",
            new_column_name="old_state",
            existing_type=sa.Text(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "new_value",
            new_column_name="new_state",
            existing_type=sa.Text(),
            existing_nullable=True,
        )

        # -- 3: add flag_id ------------------------------------------------
        batch_op.add_column(
            sa.Column(
                "flag_id",
                sa.Integer(),
                sa.ForeignKey(
                    "feature_flags.id",
                    name="fk_audit_logs_flag_id",
                    ondelete="SET NULL",
                ),
                nullable=True,
            )
        )

        # -- 4: add environment_id -----------------------------------------
        batch_op.add_column(
            sa.Column(
                "environment_id",
                sa.Integer(),
                sa.ForeignKey(
                    "environments.id",
                    name="fk_audit_logs_environment_id",
                    ondelete="SET NULL",
                ),
                nullable=True,
            )
        )

        # -- Indexes on the new FK columns (improves filter-by-flag queries)
        batch_op.create_index(
            "ix_audit_logs_flag_id",
            ["flag_id"],
        )
        batch_op.create_index(
            "ix_audit_logs_environment_id",
            ["environment_id"],
        )


# ---------------------------------------------------------------------------
# Downgrade
# ---------------------------------------------------------------------------

def downgrade() -> None:
    """
    Reverse the upgrade:
    1. Drop indexes on flag_id and environment_id
    2. Drop flag_id and environment_id columns
    3. Rename old_state → old_value
    4. Rename new_state → new_value
    """

    with op.batch_alter_table("audit_logs") as batch_op:
        # Drop indexes first (required before dropping columns)
        batch_op.drop_index("ix_audit_logs_flag_id")
        batch_op.drop_index("ix_audit_logs_environment_id")

        # Drop the FK columns
        batch_op.drop_column("environment_id")
        batch_op.drop_column("flag_id")

        # Rename state columns back to value columns
        batch_op.alter_column(
            "new_state",
            new_column_name="new_value",
            existing_type=sa.Text(),
            existing_nullable=True,
        )
        batch_op.alter_column(
            "old_state",
            new_column_name="old_value",
            existing_type=sa.Text(),
            existing_nullable=True,
        )
