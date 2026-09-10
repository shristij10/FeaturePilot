from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserGroup(Base):
    """
    Represents a named group that users can be assigned to.

    Groups are used by targeting rules to enable or disable feature flags
    for an entire segment of users without enumerating individual usernames.
    Each group name must be unique across the system.
    """

    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    group_name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    # One UserGroup → many User records
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="group",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<UserGroup id={self.id!r} group_name={self.group_name!r}>"
