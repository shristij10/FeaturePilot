from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TargetingRuleCreate(BaseModel):
    """
    Payload for creating a new targeting rule on a feature flag.

    Each rule associates a feature flag with either a specific user or an
    entire user group.  The evaluation engine consults these rules before
    falling back to the flag's default_value.

    rule_type must be one of:
        "user"  — rule_value holds the exact username to target.
        "group" — rule_value holds the group_name of a UserGroup.

    Multiple rules may be attached to the same flag, allowing fine-grained
    per-user and per-group targeting to be combined.
    """

    flag_id: int = Field(
        ...,
        gt=0,
        description="ID of the feature flag this rule is attached to.",
        examples=[1],
    )
    rule_type: Literal["user", "group"] = Field(
        ...,
        description=(
            "Determines how rule_value is interpreted. "
            '"user" targets a single username; '
            '"group" targets all members of a UserGroup.'
        ),
        examples=["user"],
    )
    rule_value: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description=(
            "The username or group_name this rule applies to, "
            "depending on rule_type."
        ),
        examples=["shristi_dev"],
    )


class TargetingRuleResponse(BaseModel):
    """
    Schema returned by the API for any targeting rule resource.

    Populated directly from a SQLAlchemy TargetingRule ORM instance via
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
        description="ID of the feature flag this rule belongs to.",
        examples=[1],
    )
    rule_type: Literal["user", "group"] = Field(
        ...,
        description='Either "user" or "group".',
        examples=["user"],
    )
    rule_value: str = Field(
        ...,
        description="The username or group_name this rule targets.",
        examples=["shristi_dev"],
    )
