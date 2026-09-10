from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class FlagEvaluationRequest(BaseModel):
    """
    Payload for evaluating a feature flag in a given environment.

    Accepts human-readable string identifiers (flag_key, environment) rather
    than database primary keys, making it suitable for client SDKs and external
    consumers who should not need to know internal IDs.

    Task 3 adds explicit `user_id` and `groups` fields alongside the existing
    `user_context` freeform dict.  Either approach works — `user_id`/`groups`
    take priority when provided; `user_context["username"]` is used as a
    fallback so all existing callers remain fully backward-compatible.
    """

    flag_key: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_]+$",
        description=(
            "Unique key of the feature flag to evaluate. "
            "Lowercase alphanumeric and underscores only (e.g. dark_mode)."
        ),
        examples=["dark_mode"],
    )
    environment: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description=(
            "Name of the environment to evaluate the flag in "
            "(e.g. Development, UAT, Production)."
        ),
        examples=["Production"],
    )
    user_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description=(
            "Optional identifier of the requesting user. "
            "Used for user-level targeting and percentage rollout bucketing. "
            "Takes priority over user_context['username'] when both are provided."
        ),
        examples=["user_101"],
    )
    groups: Optional[List[str]] = Field(
        None,
        description=(
            "Optional list of group names the requesting user belongs to. "
            "Used for group-level targeting rules. "
            "An empty list is treated the same as None (no groups)."
        ),
        examples=[["beta_users", "internal"]],
    )
    user_context: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Optional arbitrary key-value context about the requesting user or session. "
            "Legacy field kept for backward compatibility. "
            "user_id and groups take priority when provided."
        ),
        examples=[{"username": "alice", "plan": "pro", "region": "us-east-1"}],
    )
    performed_by: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description=(
            "Username of the authenticated user performing this evaluation from the UI. "
            "Used solely to populate the audit log's performed_by field. "
            "Has no effect on evaluation logic, targeting, or rollout."
        ),
        examples=["alice"],
    )


class FlagEvaluationResponse(BaseModel):
    """
    Result of evaluating a feature flag for a specific environment.

    The `source` field indicates which path the legacy evaluation took.
    The `reason` field (Task 3) carries the simplified reason string used
    by the enhanced evaluation endpoint.

    source values (legacy):
    - "override"           — EnvironmentOverride record was found.
    - "default"            — flag's default_value was used.
    - "disabled"           — flag is globally inactive.
    - "targeting_rule"     — a user or group TargetingRule matched.
    - "percentage_rollout" — SHA-256 bucket was below rollout threshold.

    reason values (Task 3 enhanced):
    - "user_targeting"       — user was explicitly targeted.
    - "group_targeting"      — user's group was explicitly targeted.
    - "percentage_rollout"   — deterministic rollout bucket decided.
    - "environment_override" — environment-level override applied.
    - "default_value"        — flag's configured default was used.
    """

    model_config = ConfigDict(from_attributes=False)

    flag_key: str = Field(
        ...,
        description="Key of the evaluated feature flag.",
        examples=["dark_mode"],
    )
    environment: str = Field(
        ...,
        description="Name of the environment used for evaluation.",
        examples=["Production"],
    )
    enabled: bool = Field(
        ...,
        description=(
            "Whether the feature flag is globally active. "
            "Consumers should check this before acting on value."
        ),
        examples=[True],
    )
    value: Union[bool, int, float, str, Dict[str, Any], List[Any]] = Field(
        ...,
        description=(
            "Resolved value of the flag in this environment. "
            "The type depends on the flag's configured type: "
            "boolean flags return bool; "
            "number flags return int (whole numbers) or float (decimals); "
            "string flags return str; "
            "json flags return dict or list. "
            "When source is 'override', value is always bool."
        ),
        examples=[True],
    )
    source: Literal["override", "default", "disabled", "targeting_rule", "percentage_rollout"] = Field(
        ...,
        description=(
            '"override"            — value was resolved from an EnvironmentOverride record. '
            '"default"             — value was resolved from the flag\'s default_value. '
            '"disabled"            — the flag is globally inactive (enabled=False). '
            '"targeting_rule"      — value was resolved from a matching TargetingRule. '
            '"percentage_rollout"  — value was resolved via SHA-256 bucket assignment.'
        ),
        examples=["override"],
    )
    reason: Literal[
        "user_targeting",
        "group_targeting",
        "percentage_rollout",
        "environment_override",
        "default_value",
    ] = Field(
        ...,
        description=(
            "Human-readable reason for the evaluation decision (Task 3 field). "
            '"user_targeting"       — the user was explicitly targeted by a rule. '
            '"group_targeting"      — the user\'s group was targeted by a rule. '
            '"percentage_rollout"   — SHA-256 bucket was below rollout threshold. '
            '"environment_override" — an environment-level override was applied. '
            '"default_value"        — the flag\'s configured default was returned. '
        ),
        examples=["user_targeting"],
    )
    bucket: Optional[int] = Field(
        None,
        ge=0,
        le=99,
        description=(
            "SHA-256 derived bucket number (0–99) assigned to the requesting user. "
            "Only present when source is 'percentage_rollout'."
        ),
        examples=[12],
    )
    rollout_percentage: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description=(
            "The rollout_percentage threshold configured on the flag at evaluation time. "
            "Only present when source is 'percentage_rollout'."
        ),
        examples=[25],
    )
