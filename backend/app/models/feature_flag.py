from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.environment_override import EnvironmentOverride
    from app.models.targeting_rule import TargetingRule


class FeatureFlag(Base):
    """Represents a feature flag that can be toggled per environment."""

    __tablename__ = "feature_flags"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    default_value: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    owner_team: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    rollout_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # One FeatureFlag → many EnvironmentOverride records
    overrides: Mapped[List["EnvironmentOverride"]] = relationship(
        "EnvironmentOverride",
        back_populates="feature_flag",
        cascade="all, delete-orphan",
        lazy="select",
    )

    # One FeatureFlag → many TargetingRule records
    targeting_rules: Mapped[List["TargetingRule"]] = relationship(
        "TargetingRule",
        back_populates="feature_flag",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<FeatureFlag id={self.id!r} key={self.key!r} "
            f"type={self.type!r} enabled={self.enabled!r}>"
        )
