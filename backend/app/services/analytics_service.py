"""
app/services/analytics_service.py
-----------------------------------
Analytics queries derived entirely from existing tables.

Data sources
------------
All analytics are computed from data that already exists in the database —
no new table, model, or migration is introduced.

+-----------------------------+------------------------------------------+
| Metric                      | Source table / query                     |
+-----------------------------+------------------------------------------+
| total_flags                 | COUNT(*) feature_flags                   |
| active_flags                | COUNT(*) feature_flags WHERE enabled     |
| today_evaluations           | COUNT(*) audit_logs WHERE action starts  |
|                             | with "Evaluate" AND ts >= today_start    |
| audit_logs_today            | COUNT(*) audit_logs WHERE ts >= today    |
| per-flag evaluations        | COUNT(*) audit_logs GROUP BY flag_id     |
|                             | joined to feature_flags for the key      |
| per-environment evaluations | COUNT(*) audit_logs GROUP BY env_id      |
|                             | joined to environments for the name      |
| recent audit entries        | get_recent_audit_logs() (existing svc)   |
+-----------------------------+------------------------------------------+

Why audit_logs for evaluation counts?
--------------------------------------
The flag evaluation engine (flag_evaluation_engine.py) already writes one
audit log entry for every evaluation call, with action strings such as:

    "Evaluate Feature Flag"
    "Evaluate Feature Flag (Enhanced)"
    "Evaluate Feature Flag (Targeting Rule)"
    "Evaluate Feature Flag (Percentage Rollout)"

These rows carry flag_id and environment_id FKs (added in Milestone 3
Task 2 Step 1).  Counting and grouping these rows gives accurate evaluation
metrics without any new persistence.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.environment import Environment
from app.models.feature_flag import FeatureFlag
from app.services.audit_log_service import get_recent_audit_logs

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# All evaluation action strings share this prefix — used with LIKE filtering
# so the query remains robust to minor naming changes in the engine.
_EVAL_ACTION_PREFIX = "Evaluate%"


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _today_start_utc() -> datetime:
    """
    Return a timezone-aware datetime for the start of today in UTC
    (i.e. midnight, 00:00:00.000000+00:00).

    Using UTC avoids ambiguity across deployments in different time zones
    and matches the timezone used by the audit_log timestamp column.
    """
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


# ---------------------------------------------------------------------------
# Public analytics functions
# ---------------------------------------------------------------------------

def get_dashboard_stats(db: Session) -> Dict[str, int]:
    """
    Return the four KPIs shown on the main dashboard.

    Queries
    -------
    1. total_flags
       SELECT COUNT(*) FROM feature_flags

    2. active_flags
       SELECT COUNT(*) FROM feature_flags WHERE enabled = true

    3. today_evaluations
       SELECT COUNT(*) FROM audit_logs
       WHERE action LIKE 'Evaluate%'
         AND timestamp >= <start of today UTC>

    4. audit_logs_today
       SELECT COUNT(*) FROM audit_logs
       WHERE timestamp >= <start of today UTC>

    Returns
    -------
    Dict with keys: total_flags, active_flags, today_evaluations,
    audit_logs_today.  All values are non-negative integers.
    """
    today = _today_start_utc()

    total_flags: int = db.query(func.count(FeatureFlag.id)).scalar() or 0

    active_flags: int = (
        db.query(func.count(FeatureFlag.id))
        .filter(FeatureFlag.enabled == True)  # noqa: E712
        .scalar()
    ) or 0

    today_evaluations: int = (
        db.query(func.count(AuditLog.id))
        .filter(
            AuditLog.action.like(_EVAL_ACTION_PREFIX),
            AuditLog.timestamp >= today,
        )
        .scalar()
    ) or 0

    audit_logs_today: int = (
        db.query(func.count(AuditLog.id))
        .filter(AuditLog.timestamp >= today)
        .scalar()
    ) or 0

    return {
        "total_flags":       total_flags,
        "active_flags":      active_flags,
        "today_evaluations": today_evaluations,
        "audit_logs_today":  audit_logs_today,
    }


def get_flag_evaluation_counts(db: Session) -> Dict[str, Any]:
    """
    Return evaluation counts grouped by feature flag.

    Query
    -----
    SELECT flag_id, COUNT(*) AS evaluation_count
    FROM audit_logs
    WHERE action LIKE 'Evaluate%'
    GROUP BY flag_id
    ORDER BY evaluation_count DESC

    The flag_id is then joined to feature_flags to retrieve the human-
    readable key.  Rows with flag_id = NULL (older evaluation logs written
    before the FK column was added) are included in the result with
    flag_key = None.

    Returns
    -------
    Dict with keys:
        flags            — list of dicts: {flag_id, flag_key, evaluation_count}
        total_evaluations — int

    Data source: audit_logs (evaluation rows) + feature_flags (key lookup)
    """
    # GROUP BY query — returns (flag_id, count) pairs
    rows = (
        db.query(
            AuditLog.flag_id,
            func.count(AuditLog.id).label("evaluation_count"),
        )
        .filter(AuditLog.action.like(_EVAL_ACTION_PREFIX))
        .group_by(AuditLog.flag_id)
        .order_by(func.count(AuditLog.id).desc())
        .all()
    )

    # Build a flag_id → key lookup dict (one query for all flags at once)
    flag_ids = {r.flag_id for r in rows if r.flag_id is not None}
    flag_key_map: Dict[int, str] = {}
    if flag_ids:
        flags = db.query(FeatureFlag).filter(FeatureFlag.id.in_(flag_ids)).all()
        flag_key_map = {f.id: f.key for f in flags}

    result_flags = [
        {
            "flag_id":          row.flag_id,
            "flag_key":         flag_key_map.get(row.flag_id) if row.flag_id is not None else None,
            "evaluation_count": row.evaluation_count,
        }
        for row in rows
    ]

    total = sum(r["evaluation_count"] for r in result_flags)

    return {
        "flags":             result_flags,
        "total_evaluations": total,
    }


def get_environment_usage(db: Session) -> Dict[str, Any]:
    """
    Return evaluation counts grouped by environment.

    Query
    -----
    SELECT environment_id, COUNT(*) AS evaluation_count
    FROM audit_logs
    WHERE action LIKE 'Evaluate%'
    GROUP BY environment_id
    ORDER BY evaluation_count DESC

    The environment_id is then joined to environments to retrieve the
    human-readable name.  Rows with environment_id = NULL (older logs
    written before the FK column was added) are included with name = None.

    Returns
    -------
    Dict with keys:
        environments      — list of dicts: {environment_id, environment_name,
                            evaluation_count}
        total_evaluations — int

    Data source: audit_logs (evaluation rows) + environments (name lookup)
    """
    rows = (
        db.query(
            AuditLog.environment_id,
            func.count(AuditLog.id).label("evaluation_count"),
        )
        .filter(AuditLog.action.like(_EVAL_ACTION_PREFIX))
        .group_by(AuditLog.environment_id)
        .order_by(func.count(AuditLog.id).desc())
        .all()
    )

    # Build an environment_id → name lookup dict
    env_ids = {r.environment_id for r in rows if r.environment_id is not None}
    env_name_map: Dict[int, str] = {}
    if env_ids:
        envs = db.query(Environment).filter(Environment.id.in_(env_ids)).all()
        env_name_map = {e.id: e.name for e in envs}

    result_envs = [
        {
            "environment_id":   row.environment_id,
            "environment_name": env_name_map.get(row.environment_id) if row.environment_id is not None else None,
            "evaluation_count": row.evaluation_count,
        }
        for row in rows
    ]

    total = sum(r["evaluation_count"] for r in result_envs)

    return {
        "environments":      result_envs,
        "total_evaluations": total,
    }


def get_recent_audit_entries(db: Session, limit: int = 10) -> List[AuditLog]:
    """
    Return the most recent *limit* audit log entries.

    Delegates entirely to the existing ``get_recent_audit_logs()`` service
    function — no query duplication.

    Args:
        db:    Active SQLAlchemy session.
        limit: Maximum number of entries to return (default 10).

    Returns:
        List of AuditLog ORM instances, newest first.

    Data source: audit_logs (via existing get_recent_audit_logs service)
    """
    return get_recent_audit_logs(db, limit=limit)
