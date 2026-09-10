from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _serialise_state(
    value: Optional[Union[str, Dict[str, Any], list]],
) -> Optional[str]:
    """
    Coerce *value* into a plain string suitable for storing in the
    ``old_state`` / ``new_state`` Text column.

    Rules:
    - ``None``          → ``None``   (column stores NULL)
    - ``str``           → unchanged  (already a string)
    - ``dict`` / ``list`` → ``json.dumps(...)`` with compact separators

    This keeps the column type as plain Text (no DB-level JSON type needed)
    while still allowing structured state snapshots to round-trip cleanly.
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, separators=(",", ":"), default=str)


# ---------------------------------------------------------------------------
# Public service functions — write path
# ---------------------------------------------------------------------------

def create_audit_log(
    db: Session,
    action: str,
    performed_by: str,
    *,
    # New preferred parameters (Milestone 3 Task 2)
    flag_id: Optional[int] = None,
    environment_id: Optional[int] = None,
    old_state: Optional[Union[str, Dict[str, Any], list]] = None,
    new_state: Optional[Union[str, Dict[str, Any], list]] = None,
    # Legacy aliases kept so every existing caller continues to work
    # without any changes.  They map 1-to-1 onto old_state / new_state.
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> Optional[AuditLog]:
    """
    Insert a new audit log record and return the persisted ORM instance.

    This function must **never** raise an exception that propagates to the
    caller.  If the insert fails for any reason the error is logged
    internally and the function returns ``None`` so the primary operation
    continues unaffected.

    Parameter notes
    ---------------
    flag_id / environment_id
        Optional foreign keys that scope the log entry to a specific
        feature flag and/or environment.  Pass them when available so the
        audit trail can be filtered by resource.

    old_state / new_state (preferred)
        Capture the resource state before and after the change.  Accept
        either a plain ``str`` (e.g. a flag key) or a JSON-serialisable
        ``dict``/``list`` for structured snapshots.  Dicts and lists are
        serialised to a JSON string before storage.

    old_value / new_value (deprecated aliases)
        Legacy parameter names from the original implementation.  They
        map directly onto ``old_state`` / ``new_state`` so all existing
        callers remain fully backward-compatible without any changes.
        When **both** the new name and the legacy alias are supplied, the
        new name takes precedence.

    Args:
        db:             Active SQLAlchemy session shared with the caller.
        action:         Short label for the operation (e.g. "User Login").
        performed_by:   Username or identifier of the actor.
        flag_id:        PK of the affected FeatureFlag (optional).
        environment_id: PK of the affected Environment (optional).
        old_state:      Resource state before the change (preferred).
        new_state:      Resource state after the change (preferred).
        old_value:      Deprecated alias for old_state.
        new_value:      Deprecated alias for new_state.

    Returns:
        The persisted :class:`AuditLog` ORM instance, or ``None`` if the
        insert failed.
    """
    # Resolve: new names take precedence; fall back to legacy aliases.
    resolved_old = old_state if old_state is not None else old_value
    resolved_new = new_state if new_state is not None else new_value

    try:
        log_entry = AuditLog(
            action=action,
            performed_by=performed_by,
            flag_id=flag_id,
            environment_id=environment_id,
            old_state=_serialise_state(resolved_old),
            new_state=_serialise_state(resolved_new),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    except Exception as exc:  # noqa: BLE001
        # Roll back only the audit insert — do not propagate to caller.
        try:
            db.rollback()
        except Exception:  # noqa: BLE001
            pass
        logger.error(
            "Failed to insert audit log [action=%r performed_by=%r]: %s",
            action,
            performed_by,
            exc,
        )
        return None


# ---------------------------------------------------------------------------
# Public service functions — read path
# ---------------------------------------------------------------------------

def get_audit_log_by_id(db: Session, audit_log_id: int) -> Optional[AuditLog]:
    """
    Return a single audit log record by its primary key.

    Returns ``None`` when no record with *audit_log_id* exists.  The caller
    is responsible for converting ``None`` into an HTTP 404 response — this
    service function never raises HTTP exceptions so it remains reusable
    outside the API layer.

    Args:
        db:            Active SQLAlchemy session.
        audit_log_id:  Primary key of the audit log record to retrieve.

    Returns:
        The :class:`AuditLog` ORM instance, or ``None`` if not found.
    """
    return db.get(AuditLog, audit_log_id)


def get_filtered_audit_logs(
    db: Session,
    *,
    action: Optional[str] = None,
    performed_by: Optional[str] = None,
    flag_id: Optional[int] = None,
    environment_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[AuditLog]:
    """
    Return audit log records that match all supplied filters.

    Every filter is optional.  When a parameter is ``None`` the
    corresponding condition is **not** added to the query, so omitting a
    filter is equivalent to "match any value".  When multiple filters are
    provided they are combined with AND — only records that satisfy every
    supplied condition are returned.

    Results are always ordered by ``timestamp DESC`` (newest first).  An
    empty list is returned — never an exception — when no records match.

    Dynamic filter construction
    ---------------------------
    The query starts as a base ``SELECT * FROM audit_logs`` and each
    non-``None`` argument appends one additional ``.filter()`` clause:

        query = db.query(AuditLog)
        if action is not None:
            query = query.filter(AuditLog.action == action)
        ...

    SQLAlchemy accumulates these lazily; the single ``SELECT`` sent to the
    database contains exactly the ``WHERE`` conditions that were specified.

    Args:
        db:             Active SQLAlchemy session.
        action:         Exact match on the ``action`` column
                        (e.g. ``"Create Flag"``).
        performed_by:   Exact match on the ``performed_by`` column
                        (e.g. ``"admin"``).
        flag_id:        Exact match on the ``flag_id`` FK column.
        environment_id: Exact match on the ``environment_id`` FK column.
        start_date:     Lower bound (inclusive) on ``timestamp``.
                        Records with ``timestamp >= start_date`` are included.
        end_date:       Upper bound (inclusive) on ``timestamp``.
                        Records with ``timestamp <= end_date`` are included.

    Returns:
        List of :class:`AuditLog` ORM instances ordered by timestamp
        descending.  Empty list when nothing matches.
    """
    query = db.query(AuditLog)

    # --- Exact-match filters ------------------------------------------------
    # Each block is independent: only executed when the caller passed a value.
    if action is not None:
        query = query.filter(AuditLog.action == action)

    if performed_by is not None:
        query = query.filter(AuditLog.performed_by == performed_by)

    if flag_id is not None:
        query = query.filter(AuditLog.flag_id == flag_id)

    if environment_id is not None:
        query = query.filter(AuditLog.environment_id == environment_id)

    # --- Range filters on timestamp -----------------------------------------
    if start_date is not None:
        query = query.filter(AuditLog.timestamp >= start_date)

    if end_date is not None:
        query = query.filter(AuditLog.timestamp <= end_date)

    # --- Ordering and execution ---------------------------------------------
    return query.order_by(AuditLog.timestamp.desc()).all()


def get_all_audit_logs(db: Session) -> List[AuditLog]:
    """
    Return all audit log records ordered by timestamp descending (newest first).

    Thin wrapper around :func:`get_filtered_audit_logs` with no filters,
    kept for backward compatibility with existing call-sites.
    """
    return get_filtered_audit_logs(db)


def get_recent_audit_logs(db: Session, limit: int = 20) -> List[AuditLog]:
    """
    Return the most recent *limit* audit log records (default 20),
    ordered by timestamp descending.
    """
    return (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )


def get_audit_logs_by_user(
    db: Session,
    username: str,
    limit: int = 5,
) -> List[AuditLog]:
    """
    Return the most recent *limit* audit log records where
    ``performed_by`` matches *username*, ordered by timestamp descending.

    Used by the Profile page to populate the Recent Activity section
    with real data for the currently logged-in user.

    Args:
        db:       Active SQLAlchemy session.
        username: The username to filter on (exact match).
        limit:    Maximum number of records to return (default 5).

    Returns:
        List of :class:`AuditLog` ORM instances, newest first.
    """
    return (
        db.query(AuditLog)
        .filter(AuditLog.performed_by == username)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
