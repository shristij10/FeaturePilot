from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.user import UserLogin, UserResponse, UserSignup
from app.services.auth_service import login, signup

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def signup_endpoint(
    payload: UserSignup,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Create a new user account.

    - **username**: unique, 3–100 characters, alphanumeric/hyphens/underscores.
    - **email**: unique, valid email format.
    - **password**: plaintext, minimum 8 characters. Hashed with bcrypt before storage —
      the plaintext password is never persisted or returned.

    Returns the created user profile (without password hash).

    Raises **409** if the email or username is already registered.
    """
    return signup(db, payload)


@router.post(
    "/login",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and log in",
)
def login_endpoint(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Authenticate a user with email and password.

    Verifies the provided password against the stored bcrypt hash.
    Both "email not found" and "wrong password" return the same **401**
    response to prevent user enumeration.

    Returns the authenticated user profile (without password hash).

    > **Note:** JWT token issuance will be added in a future task.
      For now this endpoint confirms valid credentials and returns the user object.

    Raises **401** if the credentials are invalid.
    """
    return login(db, payload)
