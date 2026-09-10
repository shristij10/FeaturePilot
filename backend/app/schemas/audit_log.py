from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class AuditLogCreate(BaseModel):
    """
    Payload used internally by service functions to insert an audit record.

    Never exposed as a public API endpoint — audit records are created only
    by backend services after successful state-changing operations.

    Field notes
    -----------
    old_state / new_state
        Renamed from old_value / new_value (Milestone 3 Task 2).
        Accept either a plain string or a JSON-serialisable dict/list so
        callers can pass structured state snapshots.

    flag_id / environment_id
        Optional foreign keys.  Provide them when the action is scoped to
        a specific feature flag or environment; omit them for user-level
        actions such as login or profile update.
    """

    action: str = Field(
        ...,
        max_length=100,
        description="Short label describing the operation (e.g. 'User Login').",
        examples=["Create Feature Flag"],
    )
    performed_by: str = Field(
        ...,
        max_length=100,
        description="Username or identifier of the actor who triggered the action.",
        examples=["shristi_dev"],
    )
    flag_id: Optional[int] = Field(
        None,
        description="Primary key of the related FeatureFlag, if applicable.",
        examples=[3],
    )
    environment_id: Optional[int] = Field(
        None,
        description="Primary key of the related Environment, if applicable.",
        examples=[1],
    )
    old_state: Optional[Union[str, Dict[str, Any], list]] = Field(
        None,
        description=(
            "Serialised resource state before the change. "
            "Pass a dict/list for structured JSON or a plain string for "
            "simple values (e.g. a flag key)."
        ),
        examples=[{"key": "dark_mode", "enabled": True}],
    )
    new_state: Optional[Union[str, Dict[str, Any], list]] = Field(
        None,
        description=(
            "Serialised resource state after the change. "
            "Pass a dict/list for structured JSON or a plain string."
        ),
        examples=[{"key": "dark_mode", "enabled": False}],
    )


class AuditLogResponse(BaseModel):
    """
    Schema returned by the API for a single audit log record.

    Populated directly from a SQLAlchemy AuditLog ORM instance via
    from_attributes=True (Pydantic v2 ORM mode).

    Field notes
    -----------
    old_state / new_state
        Renamed from old_value / new_value in Milestone 3 Task 2.
        The database column type is Text, so the value is always a string
        when read back from the ORM.  Callers that stored JSON will
        receive it as a JSON string that they can parse themselves.

    flag_id / environment_id
        Nullable integer foreign keys.  Populated when the audit record
        was created with a specific flag or environment context.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    action: str = Field(
        ...,
        description="Label describing the operation that was performed.",
        examples=["Create Feature Flag"],
    )
    performed_by: str = Field(
        ...,
        description="Username or identifier of the actor.",
        examples=["shristi_dev"],
    )
    flag_id: Optional[int] = Field(
        None,
        description="Primary key of the related FeatureFlag, or null.",
        examples=[3],
    )
    environment_id: Optional[int] = Field(
        None,
        description="Primary key of the related Environment, or null.",
        examples=[1],
    )
    old_state: Optional[str] = Field(
        None,
        description="Resource state before the change (string or serialised JSON).",
        examples=['{"key": "dark_mode", "enabled": true}'],
    )
    new_state: Optional[str] = Field(
        None,
        description="Resource state after the change (string or serialised JSON).",
        examples=['{"key": "dark_mode", "enabled": false}'],
    )
    timestamp: datetime = Field(
        ...,
        description="UTC timestamp of when the action was recorded.",
        examples=["2024-01-15T08:30:00Z"],
    )
