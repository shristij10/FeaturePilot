from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserUpdate
from app.services.audit_log_service import create_audit_log


def update_profile(db: Session, user_id: int, payload: UserUpdate) -> User:
    """
    Update the username of an existing user account.

    Steps:
    1. Find the user by primary key — raises 404 if not found.
    2. Check for username conflict with a different account — raises 409.
    3. Update only the username field.
    4. Commit, refresh, and return the updated User ORM instance.

    Raises:
        HTTPException 404: If no user with the given user_id exists.
        HTTPException 409: If the requested username is already taken.
    """
    db_user: User | None = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    username_taken = (
        db.query(User)
        .filter(User.username == payload.username, User.id != user_id)
        .first()
    )
    if username_taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    old_username = db_user.username
    db_user.username = payload.username

    db.commit()
    db.refresh(db_user)

    # Audit: Update Profile — record old and new username.
    create_audit_log(
        db=db,
        action="Update Profile",
        performed_by=db_user.username,   # new username after save
        old_value=old_username,
        new_value=db_user.username,
    )

    return db_user
