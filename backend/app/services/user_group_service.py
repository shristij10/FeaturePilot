from __future__ import annotations

from typing import List

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_group import UserGroup
from app.schemas.user_group import UserGroupCreate
from app.services.audit_log_service import create_audit_log


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _require_group(db: Session, group_id: int) -> UserGroup:
    """Return the UserGroup with *group_id* or raise 404."""
    db_group = db.get(UserGroup, group_id)
    if db_group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User group with id {group_id} not found.",
        )
    return db_group


def _require_user(db: Session, username: str) -> User:
    """Return the User with *username* or raise 404."""
    db_user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found.",
        )
    return db_user


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def create_group(db: Session, payload: UserGroupCreate) -> UserGroup:
    """
    Insert a new user group and return the persisted ORM instance.

    Raises:
        HTTPException 409: If a group with the same group_name already exists.
    """
    existing = (
        db.query(UserGroup)
        .filter(
            func.lower(UserGroup.group_name) == payload.group_name.strip().lower()
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user group named '{payload.group_name}' already exists.",
        )

    clean_name = payload.group_name.strip()

    db_group = UserGroup(group_name=clean_name)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)

    # Audit: Create User Group
    create_audit_log(
        db=db,
        action="Create User Group",
        performed_by="system",
        old_value=None,
        new_value=db_group.group_name,
    )

    return db_group


def get_all_groups(db: Session) -> List[UserGroup]:
    """Return all user group rows ordered by id ascending."""
    return db.query(UserGroup).order_by(UserGroup.id).all()


def add_user_to_group(
    db: Session,
    group_id: int,
    username: str,
) -> User:
    """
    Assign an existing user to a user group and return the updated User instance.

    A user can only belong to one group at a time.  If the user is already
    a member of a different group, the assignment is replaced silently.
    Assigning a user who is already in *this* group is a no-op.

    Raises:
        HTTPException 404: If the group does not exist.
        HTTPException 404: If the user does not exist.
    """
    db_group = _require_group(db, group_id)
    db_user  = _require_user(db, username)

    # No-op if the user is already in this group
    if db_user.group_id == group_id:
        return db_user

    old_value = (
        f"group_id={db_user.group_id}" if db_user.group_id is not None else None
    )

    db_user.group_id = group_id
    db.commit()
    db.refresh(db_user)

    # Audit: Add User to Group
    create_audit_log(
        db=db,
        action="Add User to Group",
        performed_by="system",
        old_value=old_value,
        new_value=f"username={db_user.username}, group={db_group.group_name}",
    )

    return db_user


def remove_user_from_group(
    db: Session,
    group_id: int,
    username: str,
) -> User:
    """
    Remove a user from a user group by clearing their group_id.

    Returns the updated User instance with group_id set to None.

    Raises:
        HTTPException 404: If the group does not exist.
        HTTPException 404: If the user does not exist.
        HTTPException 409: If the user is not currently a member of this group.
    """
    db_group = _require_group(db, group_id)
    db_user  = _require_user(db, username)

    if db_user.group_id != group_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"User '{username}' is not a member of group "
                f"'{db_group.group_name}'."
            ),
        )

    db_user.group_id = None
    db.commit()
    db.refresh(db_user)

    # Audit: Remove User from Group
    create_audit_log(
        db=db,
        action="Remove User from Group",
        performed_by="system",
        old_value=f"username={db_user.username}, group={db_group.group_name}",
        new_value=None,
    )

    return db_user


def get_group_members(db: Session, group_id: int) -> List[User]:
    """
    Return all users that belong to a given group, ordered by username.

    Raises:
        HTTPException 404: If the group does not exist.
    """
    _require_group(db, group_id)

    return (
        db.query(User)
        .filter(User.group_id == group_id)
        .order_by(User.username)
        .all()
    )

def delete_group(
    db: Session,
    group_id: int,
) -> UserGroup:
    """
    Delete a user group.

    Raises:
        HTTPException 404: If the group does not exist.
        HTTPException 409: If users still belong to the group.
    """
    db_group = _require_group(db, group_id)

    members = (
        db.query(User)
        .filter(User.group_id == group_id)
        .first()
    )

    if members:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a group that still has members.",
        )

    db.delete(db_group)
    db.commit()

    create_audit_log(
        db=db,
        action="Delete User Group",
        performed_by="system",
        old_value=db_group.group_name,
        new_value=None,
    )

    return db_group