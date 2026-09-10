"""
app/schemas/analytics.py
------------------------
Pydantic response schemas for the analytics API.

All analytics are derived from existing tables — no new persistence layer
is introduced.  The schemas describe the shape of the JSON responses only.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Dashboard summary
# ---------------------------------------------------------------------------

class DashboardStatsResponse(BaseModel):
    """
    Aggregated numbers for the main dashboard.

    Data sources
    ------------
    total_flags       — COUNT(*) from feature_flags
    active_flags      — COUNT(*) from feature_flags WHERE enabled = true
    today_evaluations — COUNT(*) from audit_logs WHERE action LIKE 'Evaluate%'
                        AND timestamp >= start of today (UTC)
    audit_logs_today  — COUNT(*) from audit_logs WHERE timestamp >= start of
                        today (UTC)
    """

    model_config = ConfigDict(from_attributes=False)

    total_flags: int = Field(
        ...,
        description="Total number of feature flags in the system.",
        examples=[12],
    )
    active_flags: int = Field(
        ...,
        description="Number of feature flags that are currently enabled.",
        examples=[9],
    )
    today_evaluations: int = Field(
        ...,
        description=(
            "Number of feature flag evaluation events recorded today (UTC). "
            "Derived from audit_logs rows whose action starts with 'Evaluate'."
        ),
        examples=[142],
    )
    audit_logs_today: int = Field(
        ...,
        description="Total number of audit log entries created today (UTC).",
        examples=[38],
    )


# ---------------------------------------------------------------------------
# Per-flag evaluation counts
# ---------------------------------------------------------------------------

class FlagEvaluationCount(BaseModel):
    """One row in the per-flag evaluation breakdown."""

    model_config = ConfigDict(from_attributes=False)

    flag_id: Optional[int] = Field(
        None,
        description=(
            "Primary key of the feature flag. "
            "Null for evaluation logs that pre-date the flag_id FK column."
        ),
        examples=[3],
    )
    flag_key: Optional[str] = Field(
        None,
        description="The unique key of the feature flag (joined from feature_flags).",
        examples=["dark_mode"],
    )
    evaluation_count: int = Field(
        ...,
        description="Number of evaluation events recorded for this flag.",
        examples=[57],
    )


class FlagEvaluationStatsResponse(BaseModel):
    """Response for GET /analytics/flags."""

    model_config = ConfigDict(from_attributes=False)

    flags: List[FlagEvaluationCount] = Field(
        ...,
        description="Per-flag evaluation counts, ordered by evaluation_count descending.",
    )
    total_evaluations: int = Field(
        ...,
        description="Sum of all evaluation events across all flags.",
        examples=[312],
    )


# ---------------------------------------------------------------------------
# Per-environment evaluation counts
# ---------------------------------------------------------------------------

class EnvironmentUsageCount(BaseModel):
    """One row in the per-environment evaluation breakdown."""

    model_config = ConfigDict(from_attributes=False)

    environment_id: Optional[int] = Field(
        None,
        description=(
            "Primary key of the environment. "
            "Null for evaluation logs that pre-date the environment_id FK column."
        ),
        examples=[2],
    )
    environment_name: Optional[str] = Field(
        None,
        description="Name of the environment (joined from environments).",
        examples=["Production"],
    )
    evaluation_count: int = Field(
        ...,
        description="Number of evaluation events recorded for this environment.",
        examples=[204],
    )


class EnvironmentUsageResponse(BaseModel):
    """Response for GET /analytics/environment-usage."""

    model_config = ConfigDict(from_attributes=False)

    environments: List[EnvironmentUsageCount] = Field(
        ...,
        description="Per-environment evaluation counts, ordered by evaluation_count descending.",
    )
    total_evaluations: int = Field(
        ...,
        description="Sum of all evaluation events across all environments.",
        examples=[312],
    )


# ---------------------------------------------------------------------------
# Recent audit entries (reused from existing AuditLogResponse)
# ---------------------------------------------------------------------------

class RecentAuditEntry(BaseModel):
    """
    A single audit log row as returned by GET /analytics/recent-audit.
    Mirrors AuditLogResponse but is defined here to keep the analytics
    schema self-contained.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., examples=[101])
    action: str = Field(..., examples=["Create Flag"])
    performed_by: str = Field(..., examples=["shristi_dev"])
    flag_id: Optional[int] = Field(None, examples=[3])
    environment_id: Optional[int] = Field(None, examples=[1])
    old_state: Optional[str] = Field(None)
    new_state: Optional[str] = Field(None)
    timestamp: datetime = Field(..., examples=["2026-07-30T10:00:00Z"])


class RecentAuditResponse(BaseModel):
    """Response for GET /analytics/recent-audit."""

    model_config = ConfigDict(from_attributes=False)

    entries: List[RecentAuditEntry] = Field(
        ...,
        description="The most recent audit log entries, newest first.",
    )
    count: int = Field(
        ...,
        description="Number of entries returned.",
        examples=[10],
    )
