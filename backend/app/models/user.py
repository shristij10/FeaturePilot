from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user_group import UserGroup


class User(Base):
    """
    Represents an authenticated user of the system.

    password_hash stores the bcrypt (or equivalent) hash of the user's
    password — the plaintext password is never persisted.

    group_id is nullable — a user does not need to belong to a group.
    When set, it links the user to a UserGroup for targeting-rule purposes.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    group_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("user_groups.id"),
        nullable=True,
    )

    # Many User records → one UserGroup (optional)
    group: Mapped[Optional["UserGroup"]] = relationship(
        "UserGroup",
        back_populates="users",
    )

    def __repr__(self) -> str:
        return (
            f"<User id={self.id!r} username={self.username!r} email={self.email!r}>"
        )
