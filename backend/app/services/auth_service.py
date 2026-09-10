from __future__ import annotations

from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserLogin, UserSignup
from app.services.audit_log_service import create_audit_log

# ---------------------------------------------------------------------------
# Password hashing context
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(plaintext: str) -> str:
    """Return the bcrypt hash of *plaintext*."""
    return _pwd_context.hash(plaintext)


def _verify_password(plaintext: str, hashed: str) -> bool:
    """Return True if *plaintext* matches *hashed*, False otherwise."""
    return _pwd_context.verify(plaintext, hashed)


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def signup(db: Session, payload: UserSignup) -> User:
    """
    Register a new user account and return the persisted User ORM instance.

    Raises:
        HTTPException 409: If the email is already registered.
        HTTPException 409: If the username is already taken.
    """
    email_taken = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )
    if email_taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    username_taken = (
        db.query(User)
        .filter(User.username == payload.username)
        .first()
    )
    if username_taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The username '{payload.username}' is already taken.",
        )

    new_user = User(
        username=payload.username,
        email=payload.email,
        password_hash=_hash_password(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def login(db: Session, payload: UserLogin) -> User:
    """
    Authenticate a user by email and password and return the User ORM instance.

    Raises:
        HTTPException 401: If the email is not registered or the password
                           does not match the stored hash.
    """
    db_user = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    _DUMMY_HASH = "$2b$12$KIXtW1qKqY1qZQn1qZQn1OqY1qZQn1qZQn1qZQn1qZQn1qZQn1qZ"  # noqa: S105

    password_ok = _verify_password(
        payload.password,
        db_user.password_hash if db_user else _DUMMY_HASH,
    )

    if not db_user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Audit: User Login — performed after the credential check succeeds.
    create_audit_log(
        db=db,
        action="User Login",
        performed_by=db_user.username,
        old_value=None,
        new_value="Logged in successfully",
    )

    return db_user
