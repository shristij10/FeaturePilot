from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnvironmentOverrideCreate(BaseModel):
    """
    Payload for creating a new environment override.

    Each (flag_id, environment_id) pair must be unique — a feature flag
    can only have one override per environment. The override value takes
    precedence over the flag's default_value for that specific environment.
    """

    flag_id: int = Field(
        ...,
        gt=0,
        description="ID of the feature flag to override.",
        examples=[1],
    )
    environment_id: int = Field(
        ...,
        gt=0,
        description="ID of the environment where this override applies.",
        examples=[2],
    )
    value: bool = Field(
        ...,
        description=(
            "Override value. True enables the flag in this environment, "
            "False disables it, regardless of the flag's default_value."
        ),
        examples=[True],
    )


class EnvironmentOverrideReplace(BaseModel):
    """
    Payload for fully replacing an existing environment override (PUT semantics).

    All fields are required. Every updatable field on the resource will be
    overwritten with the values supplied here.

    Use PATCH with EnvironmentOverrideUpdate for partial updates instead.
    """

    flag_id: int = Field(
        ...,
        gt=0,
        description="New feature flag ID for this override.",
        examples=[1],
    )
    environment_id: int = Field(
        ...,
        gt=0,
        description="New environment ID for this override.",
        examples=[2],
    )
    value: bool = Field(
        ...,
        description="New override value.",
        examples=[True],
    )


class EnvironmentOverrideUpdate(BaseModel):
    """
    Payload for partially updating an existing environment override (PATCH semantics).

    Only the value field can be updated. The (flag_id, environment_id) pair
    defines the identity of the override and cannot be changed via PATCH —
    to change either ID, delete the override and create a new one, or use PUT.
    """

    value: Optional[bool] = Field(
        None,
        description="Updated override value.",
        examples=[False],
    )


class EnvironmentOverrideResponse(BaseModel):
    """
    Schema returned by the API for any environment override resource.

    Populated directly from a SQLAlchemy EnvironmentOverride ORM instance via
    from_attributes=True (Pydantic v2 ORM mode).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    flag_id: int = Field(
        ...,
        description="ID of the feature flag being overridden.",
        examples=[1],
    )
    environment_id: int = Field(
        ...,
        description="ID of the environment where this override applies.",
        examples=[2],
    )
    value: bool = Field(
        ...,
        description="Override value for this flag in this environment.",
        examples=[True],
    )
