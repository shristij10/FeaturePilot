from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSignup(BaseModel):
    """
    Payload for registering a new user account.

    The plaintext password is accepted here and must be hashed by the
    service layer before it is written to the database — it is never
    stored or returned in plaintext.
    """

    username: str = Field(
        ...,
        min_length=3,
        max_length=100,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username. Alphanumeric characters, hyphens, and underscores only.",
        examples=["shristi_dev"],
    )
    email: EmailStr = Field(
        ...,
        description="Unique email address used for login and notifications.",
        examples=["shristi@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plaintext password. Minimum 8 characters. Hashed before storage.",
        examples=["Str0ng!Pass"],
    )


class UserLogin(BaseModel):
    """
    Payload for authenticating an existing user.

    Email and password are the only credentials required.  On success the
    auth service will return a JWT access token.
    """

    email: EmailStr = Field(
        ...,
        description="Registered email address.",
        examples=["shristi@example.com"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Plaintext password to verify against the stored hash.",
        examples=["Str0ng!Pass"],
    )


class UserUpdate(BaseModel):
    """
    Payload for updating a user's profile.

    Only username can be changed via this schema.
    Email, password, and created_at are not updatable through this endpoint.
    """

    username: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="New unique username for the account.",
        examples=["shristi_updated"],
    )


class UserResponse(BaseModel):
    """
    Schema returned by the API for any user resource.

    Populated directly from a SQLAlchemy User ORM instance.
    The password_hash field is deliberately excluded — it is never
    returned to the client under any circumstance.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    username: str = Field(
        ...,
        description="Unique username of the account.",
        examples=["shristi_dev"],
    )
    email: EmailStr = Field(
        ...,
        description="Registered email address of the account.",
        examples=["shristi@example.com"],
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the account was created.",
        examples=["2024-01-15T08:30:00Z"],
    )
