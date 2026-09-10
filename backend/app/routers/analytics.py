"""
app/routers/analytics.py
------------------------
Analytics endpoints.  All data is derived from existing tables — no new
persistence layer was introduced.

Endpoints
---------
GET /analytics/dashboard       — KPI summary (flags, evaluations today)
GET /analytics/flags           — evaluation counts grouped by feature flag
GET /analytics/environment-usage — evaluation counts grouped by environment
GET /analytics/recent-audit    — latest audit log entries
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.analytics import (
    DashboardStatsResponse,
    EnvironmentUsageResponse,
    FlagEvaluationStatsResponse,
    RecentAuditResponse,
)
from app.services.analytics_service import (
    get_dashboard_stats,
    get_environment_usage,
    get_flag_evaluation_counts,
    get_recent_audit_entries,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/dashboard",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Dashboard KPI summary",
    description=(
        "Returns the four top-level metrics shown on the main dashboard.\n\n"
        "**Data sources (all derived from existing tables — no new table):**\n"
        "- `total_flags` — `COUNT(*)` from `feature_flags`\n"
        "- `active_flags` — `COUNT(*)` from `feature_flags WHERE enabled = true`\n"
        "- `today_evaluations` — `COUNT(*)` from `audit_logs` where `action LIKE 'Evaluate%'`"
        " and `timestamp >= start of today UTC`\n"
        "- `audit_logs_today` — `COUNT(*)` from `audit_logs` where"
        " `timestamp >= start of today UTC`\n"
    ),
)
def dashboard_stats(
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    """
    Return aggregated KPIs for the dashboard.

    All four metrics are computed in separate lightweight COUNT queries
    against ``feature_flags`` and ``audit_logs``.  No evaluation history
    table is required because every flag evaluation is already recorded in
    ``audit_logs`` by the evaluation engine.
    """
    stats = get_dashboard_stats(db)
    return DashboardStatsResponse(**stats)


@router.get(
    "/flags",
    response_model=FlagEvaluationStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluation counts grouped by feature flag",
    description=(
        "Returns how many times each feature flag was evaluated.\n\n"
        "**Data source:** `audit_logs` rows whose `action` starts with `'Evaluate'`,\n"
        "grouped by `flag_id` and joined to `feature_flags` for the human-readable key.\n\n"
        "Rows with `flag_id = null` (evaluation logs written before the FK column was\n"
        "added) are included with `flag_key = null`."
    ),
)
def flag_evaluation_stats(
    db: Session = Depends(get_db),
) -> FlagEvaluationStatsResponse:
    """
    Return evaluation counts per feature flag, ordered by count descending.

    Uses a single GROUP BY query on audit_logs plus a secondary lookup to
    resolve flag keys — no N+1 query pattern.
    """
    data = get_flag_evaluation_counts(db)
    return FlagEvaluationStatsResponse(**data)


@router.get(
    "/environment-usage",
    response_model=EnvironmentUsageResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluation counts grouped by environment",
    description=(
        "Returns how many times each environment was used in a flag evaluation.\n\n"
        "**Data source:** `audit_logs` rows whose `action` starts with `'Evaluate'`,\n"
        "grouped by `environment_id` and joined to `environments` for the name.\n\n"
        "Rows with `environment_id = null` are included with `environment_name = null`."
    ),
)
def environment_usage_stats(
    db: Session = Depends(get_db),
) -> EnvironmentUsageResponse:
    """
    Return evaluation counts per environment, ordered by count descending.

    Uses a single GROUP BY query on audit_logs plus a secondary lookup to
    resolve environment names — no N+1 query pattern.
    """
    data = get_environment_usage(db)
    return EnvironmentUsageResponse(**data)


@router.get(
    "/recent-audit",
    response_model=RecentAuditResponse,
    status_code=status.HTTP_200_OK,
    summary="Most recent audit log entries",
    description=(
        "Returns the latest audit log entries, newest first.\n\n"
        "**Data source:** delegates to the existing `get_recent_audit_logs()` service\n"
        "function — no query duplication.\n\n"
        "Use the `limit` query parameter (1–100) to control how many entries\n"
        "are returned.  Defaults to 10."
    ),
)
def recent_audit_logs(
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of recent audit log entries to return.",
    ),
    db: Session = Depends(get_db),
) -> RecentAuditResponse:
    """
    Return the most recent *limit* audit log entries.

    Delegates to ``get_recent_audit_logs()`` from ``audit_log_service`` — the
    existing service function is reused without modification, so there is no
    duplicated query logic between the audit-log API and the analytics API.
    """
    entries = get_recent_audit_entries(db, limit=limit)
    return RecentAuditResponse(entries=entries, count=len(entries))
