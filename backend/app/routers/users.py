from __future__ import annotations

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import update_profile

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


class ProfileUpdateRequest(BaseModel):
    """
    Request body for PATCH /users/profile.

    Includes the user_id from the client's localStorage session
    (no JWT auth yet — user identifies themselves).
    """
    user_id: int = Field(..., gt=0, description="ID of the user to update.")
    username: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="New username.",
        examples=["shristi_updated"],
    )


@router.patch(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update the current user's profile",
)
def update_profile_endpoint(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Update the username for the authenticated user.

    Accepts the user_id from the client session (stored in localStorage)
    alongside the new username.  Only username is updated — email,
    password, and created_at are immutable through this endpoint.

    Returns the full updated UserResponse.

    Raises **404** if the user does not exist.
    Raises **409** if the username is already taken by another account.
    """
    update_payload = UserUpdate(username=payload.username)
    return update_profile(db, payload.user_id, update_payload)
