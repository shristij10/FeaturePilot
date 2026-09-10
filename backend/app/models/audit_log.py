from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.environment import Environment
    from app.models.feature_flag import FeatureFlag


class AuditLog(Base):
    """
    Records an immutable audit trail of state-changing actions in the system.

    Each row captures what action was taken, who performed it, which feature
    flag and environment were involved (when applicable), and what the resource
    state looked like before and after the change.

    Column history
    --------------
    old_value / new_value  — original plain-text columns, renamed in
                             Milestone 3 Task 2 to old_state / new_state.
                             The column type remains Text so existing
                             plain-text values are still valid; callers
                             are encouraged to store JSON going forward.

    Rows are append-only — no updates or deletes should ever be issued
    against this table.
    """

    __tablename__ = "audit_logs"

    # ------------------------------------------------------------------
    # Primary key
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # ------------------------------------------------------------------
    # Core identity fields (unchanged)
    # ------------------------------------------------------------------
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    performed_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Optional FK references — nullable so logs written without a
    # specific flag or environment context are still valid.
    # ------------------------------------------------------------------
    flag_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("feature_flags.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    environment_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("environments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # State snapshots (renamed from old_value / new_value)
    # Stored as Text to accommodate arbitrary JSON or plain strings.
    # ------------------------------------------------------------------
    old_state: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    new_state: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Timestamp (unchanged)
    # ------------------------------------------------------------------
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    # Many AuditLog rows → one FeatureFlag (optional)
    feature_flag: Mapped[Optional["FeatureFlag"]] = relationship(
        "FeatureFlag",
        foreign_keys=[flag_id],
        lazy="select",
    )

    # Many AuditLog rows → one Environment (optional)
    environment: Mapped[Optional["Environment"]] = relationship(
        "Environment",
        foreign_keys=[environment_id],
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id!r} "
            f"action={self.action!r} "
            f"performed_by={self.performed_by!r} "
            f"timestamp={self.timestamp!r}>"
        )
