from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.feature_flag import FeatureFlag


class TargetingRule(Base):
    """
    Stores a single targeting rule attached to a feature flag.

    A targeting rule specifies that the flag should be considered active
    (or inactive) for a particular user or group, regardless of the flag's
    global enabled state and environment overrides.

    rule_type must be one of:
        "user"  — rule_value holds a specific username.
        "group" — rule_value holds a UserGroup.group_name.

    Multiple rules can be attached to the same flag.  The evaluation engine
    checks these rules before falling back to the default_value.
    """

    __tablename__ = "targeting_rules"

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
    rule_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    rule_value: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Many TargetingRule records → one FeatureFlag
    feature_flag: Mapped["FeatureFlag"] = relationship(
        "FeatureFlag",
        back_populates="targeting_rules",
    )

    def __repr__(self) -> str:
        return (
            f"<TargetingRule id={self.id!r} "
            f"flag_id={self.flag_id!r} "
            f"rule_type={self.rule_type!r} "
            f"rule_value={self.rule_value!r}>"
        )
