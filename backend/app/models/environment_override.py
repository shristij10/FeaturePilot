from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.environment import Environment
    from app.models.feature_flag import FeatureFlag


class EnvironmentOverride(Base):
    """
    Stores a per-environment override value for a specific feature flag.

    Each (flag_id, environment_id) pair must be unique — a flag can only
    have one override per environment.  The override value is a boolean
    that takes precedence over FeatureFlag.default_value for that
    environment.
    """

    __tablename__ = "environment_overrides"

    __table_args__ = (
        UniqueConstraint(
            "flag_id",
            "environment_id",
            name="uq_environment_overrides_flag_env",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    flag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("feature_flags.id"),
        nullable=False,
    )
    environment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("environments.id"),
        nullable=False,
    )
    value: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    # Many EnvironmentOverride records → one FeatureFlag
    feature_flag: Mapped["FeatureFlag"] = relationship(
        "FeatureFlag",
        back_populates="overrides",
    )

    # Many EnvironmentOverride records → one Environment
    environment: Mapped["Environment"] = relationship(
        "Environment",
        back_populates="overrides",
    )

    def __repr__(self) -> str:
        return (
            f"<EnvironmentOverride id={self.id!r} "
            f"flag_id={self.flag_id!r} "
            f"environment_id={self.environment_id!r} "
            f"value={self.value!r}>"
        )
