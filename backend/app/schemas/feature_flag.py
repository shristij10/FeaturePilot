from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class FeatureFlagCreate(BaseModel):
    """
    Payload for creating a new feature flag.

    `key` must be unique across all flags (enforced at the database level).
    `type` must be one of: boolean, string, number, json.
    `default_value` is always stored as a string — the application layer
    is responsible for casting it to the correct type based on `type`.
    """

    key: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_]+$",
        description=(
            "Unique identifier for the flag. "
            "Lowercase alphanumeric and underscores only (e.g. dark_mode)."
        ),
        examples=["dark_mode"],
    )
    description: Optional[str] = Field(
        None,
        description="Human-readable description of what the flag controls.",
        examples=["Enable Dark Mode UI"],
    )
    type: Literal["boolean", "string", "number", "json"] = Field(
        ...,
        description="Value type of the flag. Must be one of: boolean, string, number, json.",
        examples=["boolean"],
    )
    default_value: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description=(
            "Default value applied when no environment override exists. "
            "Always stored as a string regardless of flag type."
        ),
        examples=["false"],
    )
    enabled: bool = Field(
        ...,
        description="Whether this flag is globally active.",
        examples=[True],
    )
    owner_team: Optional[str] = Field(
        None,
        max_length=100,
        description="Name of the team responsible for this flag.",
        examples=["UI Team"],
    )
    rollout_percentage: int = Field(
        100,
        ge=0,
        le=100,
        description=(
            "Percentage of users (0–100) who will receive this flag as enabled "
            "when no targeting rule matches.  Defaults to 100 (fully rolled out). "
            "Uses deterministic SHA-256 bucketing so the same user always gets "
            "the same result."
        ),
        examples=[100],
    )


class FeatureFlagReplace(BaseModel):
    """
    Payload for fully replacing an existing feature flag (PUT semantics).

    All non-optional fields are required. Every updatable field on the
    resource will be overwritten with the values supplied here — this is
    a full replacement, not a partial update.

    Use PATCH with FeatureFlagUpdate for partial updates instead.
    """

    key: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_]+$",
        description=(
            "New unique identifier for the flag. "
            "Lowercase alphanumeric and underscores only."
        ),
        examples=["dark_mode"],
    )
    description: Optional[str] = Field(
        None,
        description="Updated description of what the flag controls.",
        examples=["Enable Dark Mode UI"],
    )
    type: Literal["boolean", "string", "number", "json"] = Field(
        ...,
        description="Value type of the flag. Must be one of: boolean, string, number, json.",
        examples=["boolean"],
    )
    default_value: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="New default value. Always stored as a string.",
        examples=["false"],
    )
    enabled: bool = Field(
        ...,
        description="Whether this flag is globally active.",
        examples=[True],
    )
    owner_team: Optional[str] = Field(
        None,
        max_length=100,
        description="Name of the team responsible for this flag.",
        examples=["UI Team"],
    )
    rollout_percentage: int = Field(
        100,
        ge=0,
        le=100,
        description="Percentage of users (0–100) who receive the flag as enabled.",
        examples=[100],
    )


class FeatureFlagUpdate(BaseModel):
    """
    Payload for partially updating an existing feature flag (PATCH semantics).

    All fields are optional — only the fields that are provided will be
    applied. Omitted fields retain their current values unchanged.

    Use PUT with FeatureFlagReplace if you need to replace the full resource.
    """

    key: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_]+$",
        description="New unique identifier for the flag.",
        examples=["dark_mode_v2"],
    )
    description: Optional[str] = Field(
        None,
        description="Updated description of what the flag controls.",
        examples=["Enable Dark Mode UI across all pages"],
    )
    type: Optional[Literal["boolean", "string", "number", "json"]] = Field(
        None,
        description="Updated value type. Must be one of: boolean, string, number, json.",
        examples=["boolean"],
    )
    default_value: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Updated default value. Always stored as a string.",
        examples=["true"],
    )
    enabled: Optional[bool] = Field(
        None,
        description="Updated global active state of the flag.",
        examples=[False],
    )
    owner_team: Optional[str] = Field(
        None,
        max_length=100,
        description="Updated team responsible for this flag.",
        examples=["Design System Team"],
    )
    rollout_percentage: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="Updated rollout percentage (0–100).",
        examples=[50],
    )


class FeatureFlagResponse(BaseModel):
    """
    Schema returned by the API for any feature flag resource.

    Populated directly from a SQLAlchemy FeatureFlag ORM instance via
    from_attributes=True (Pydantic v2 ORM mode).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    key: str = Field(
        ...,
        description="Unique identifier of the feature flag.",
        examples=["dark_mode"],
    )
    description: Optional[str] = Field(
        None,
        description="Description of what the flag controls.",
        examples=["Enable Dark Mode UI"],
    )
    type: Literal["boolean", "string", "number", "json"] = Field(
        ...,
        description="Value type of the flag (boolean, string, number, json).",
        examples=["boolean"],
    )
    default_value: str = Field(
        ...,
        description="Default value when no environment override exists.",
        examples=["false"],
    )
    enabled: bool = Field(
        ...,
        description="Whether this flag is globally active.",
        examples=[True],
    )
    owner_team: Optional[str] = Field(
        None,
        description="Team responsible for this flag.",
        examples=["UI Team"],
    )
    rollout_percentage: int = Field(
        ...,
        description="Percentage of users (0–100) who receive the flag as enabled.",
        examples=[100],
    )
    created_at: datetime = Field(
        ...,
        description="UTC timestamp of when the flag was created.",
        examples=["2024-01-15T08:30:00Z"],
    )
