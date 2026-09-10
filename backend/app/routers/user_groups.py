from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.schemas.user_group import UserGroupCreate, UserGroupResponse
from app.services.user_group_service import (
    add_user_to_group,
    create_group,
    get_all_groups,
    get_group_members,
    remove_user_from_group,
    delete_group,
)

router = APIRouter(
    prefix="/groups",
    tags=["User Groups"],
)


# ---------------------------------------------------------------------------
# Request body schema for POST /groups/{group_id}/users
# ---------------------------------------------------------------------------

class _AddUserPayload(BaseModel):
    """Request body for adding a user to a group."""

    username: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Username of the user to add to the group.",
        examples=["shristi_dev"],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=UserGroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user group",
)
def create_group_endpoint(
    payload: UserGroupCreate,
    db: Session = Depends(get_db),
) -> UserGroupResponse:
    """
    Create a new user group.

    - **group_name**: unique, 1–100 characters, required.

    Returns the created group including its generated `id`.

    Raises **409** if a group with the same `group_name` already exists.
    """
    return create_group(db, payload)


@router.get(
    "/",
    response_model=List[UserGroupResponse],
    status_code=status.HTTP_200_OK,
    summary="List all user groups",
)
def list_groups_endpoint(
    db: Session = Depends(get_db),
) -> List[UserGroupResponse]:
    """
    Return a list of all user groups ordered by id ascending.
    """
    return get_all_groups(db)


@router.get(
    "/{group_id}/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List members of a user group",
)
def list_group_members_endpoint(
    group_id: int,
    db: Session = Depends(get_db),
) -> List[UserResponse]:
    """
    Return all users that belong to the given group, ordered by username.

    Raises **404** if no group with the given `group_id` exists.
    """
    return get_group_members(db, group_id)


@router.post(
    "/{group_id}/users",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Add a user to a group",
)
def add_user_to_group_endpoint(
    group_id: int,
    payload: _AddUserPayload,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Assign an existing user to a user group.

    A user can only belong to one group at a time.  If the user is already
    a member of a different group, the assignment is replaced.
    Assigning a user who is already in this group is a no-op.

    - **username**: the username of the user to add.

    Raises **404** if the group or the user does not exist.
    """
    return add_user_to_group(db, group_id=group_id, username=payload.username)


@router.delete(
    "/{group_id}/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove a user from a group",
)
def remove_user_from_group_endpoint(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Remove a user from a user group by clearing their group assignment.

    Returns the updated user with their `group_id` set to `null`.

    Raises **404** if the group does not exist.
    Raises **404** if no user with the given `user_id` exists.
    Raises **409** if the user is not currently a member of this group.
    """
    # Resolve user_id → username so the service can identify the user.
    db_user: User | None = db.get(User, user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return remove_user_from_group(db, group_id=group_id, username=db_user.username)

@router.delete(
    "/{group_id}",
    response_model=UserGroupResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a user group",
)
def delete_user_group(
    group_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a user group.

    Returns the deleted group.

    Raises:
        HTTPException 404: Group not found.
        HTTPException 409: Group still contains users.
    """
    return delete_group(db, group_id)