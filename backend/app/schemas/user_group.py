from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class UserGroupCreate(BaseModel):
    """
    Payload for creating a new user group.

    group_name must be unique across all groups (enforced at the database
    level) and is capped at 100 characters to match the column definition.
    Groups are used by targeting rules to apply feature flag overrides to
    an entire segment of users at once.
    """

    group_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description=(
            "Unique name for the group (e.g. beta_testers, internal_team). "
            "Used to reference the group in targeting rules."
        ),
        examples=["beta_testers"],
    )


class UserGroupResponse(BaseModel):
    """
    Schema returned by the API for any user group resource.

    Populated directly from a SQLAlchemy UserGroup ORM instance via
    from_attributes=True (Pydantic v2 ORM mode).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(
        ...,
        description="Auto-generated primary key.",
        examples=[1],
    )
    group_name: str = Field(
        ...,
        description="Unique name of the group.",
        examples=["beta_testers"],
    )
