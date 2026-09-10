from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnvironmentCreate(BaseModel):
    """
    Payload for creating a new environment.

    Both fields are required.  Name must be unique across all environments
    (enforced at the database level) and is capped at 100 characters to
    match the column definition.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique name for the environment (e.g. Development, UAT, Production).",
        examples=["Development"],
    )
    description: Optional[str] = Field(
        None,
        max_length=255,
        description="Human-readable description of the environment's purpose.",
        examples=["Used by developers for testing new features."],
    )


class EnvironmentUpdate(BaseModel):
    """
    Payload for a partial update of an existing environment (PATCH semantics).

    All fields are optional — only the fields that are provided will be
    applied.  Omitted fields retain their current values.
    """

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="New unique name for the environment.",
        examples=["Staging"],
    )
    description: Optional[str] = Field(
        None,
        max_length=255,
        description="Updated description of the environment.",
        examples=["Pre-production staging environment."],
    )


class EnvironmentReplace(BaseModel):
    """
    Payload for a full replacement of an existing environment (PUT semantics).

    Both fields are required.  Every updatable field on the resource will be
    overwritten with the values supplied here — there is no partial update.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="New unique name for the environment.",
        examples=["Staging"],
    )
    description: Optional[str] = Field(
        None,
        max_length=255,
        description="Updated description of the environment.",
        examples=["Pre-production staging environment."],
    )


class EnvironmentResponse(BaseModel):
    """
    Schema returned by the API for any environment resource.

    Populated directly from a SQLAlchemy Environment ORM instance via
    from_attributes=True (Pydantic v2 ORM mode).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    name: str = Field(
        ...,
        description="Unique name of the environment.",
        examples=["Development"],
    )
    description: Optional[str] = Field(
        None,
        description="Description of the environment's purpose.",
        examples=["Used by developers for testing new features."],
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the environment was created.",
        examples=["2024-01-15T08:30:00Z"],
    )
