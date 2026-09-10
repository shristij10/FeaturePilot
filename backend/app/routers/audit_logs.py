from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_log_service import (
    get_audit_log_by_id,
    get_audit_logs_by_user,
    get_filtered_audit_logs,
    get_recent_audit_logs,
)

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)

# ---------------------------------------------------------------------------
# Route ordering note
# ---------------------------------------------------------------------------
# FastAPI matches routes in declaration order.  The literal paths
# ``/recent`` and ``/user/{username}`` must be declared BEFORE the
# parameterised ``/{audit_log_id}`` route so that requests to
# ``/audit-logs/recent`` are not mistakenly captured by the int-id route.
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=List[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="List audit logs with optional filtering",
    description=(
        "Return audit log records ordered by timestamp descending (newest first).\n\n"
        "All query parameters are optional. When multiple filters are supplied they "
        "are combined with **AND** — only records that satisfy every condition are "
        "returned.  An empty list is returned when nothing matches; this endpoint "
        "never raises an error for zero results.\n\n"
        "**Available filters:**\n"
        "- `action` — exact match on the action label (e.g. `Create Flag`)\n"
        "- `performed_by` — exact match on the actor's username\n"
        "- `flag_id` — records linked to a specific feature flag\n"
        "- `environment_id` — records linked to a specific environment\n"
        "- `start_date` — lower bound (inclusive) on timestamp (ISO 8601)\n"
        "- `end_date` — upper bound (inclusive) on timestamp (ISO 8601)\n"
    ),
)
def list_audit_logs(
    action: Optional[str] = Query(
        default=None,
        description=(
            "Filter by exact action label. "
            "Example: `Create Flag`, `Override Changed`, `User Login`."
        ),
        examples=["Create Flag"],
    ),
    performed_by: Optional[str] = Query(
        default=None,
        description="Filter by the username of the actor who performed the action.",
        examples=["admin"],
    ),
    flag_id: Optional[int] = Query(
        default=None,
        ge=1,
        description="Filter by the primary key of the related feature flag.",
        examples=[5],
    ),
    environment_id: Optional[int] = Query(
        default=None,
        ge=1,
        description="Filter by the primary key of the related environment.",
        examples=[2],
    ),
    start_date: Optional[datetime] = Query(
        default=None,
        description=(
            "Return only records with timestamp >= start_date. "
            "Accepts ISO 8601 format, e.g. `2026-01-01T00:00:00Z`."
        ),
        examples=["2026-01-01T00:00:00Z"],
    ),
    end_date: Optional[datetime] = Query(
        default=None,
        description=(
            "Return only records with timestamp <= end_date. "
            "Accepts ISO 8601 format, e.g. `2026-12-31T23:59:59Z`."
        ),
        examples=["2026-12-31T23:59:59Z"],
    ),
    db: Session = Depends(get_db),
) -> List[AuditLogResponse]:
    """
    Return audit log records that satisfy all supplied filters.

    When **no** filters are provided this endpoint behaves identically to
    the previous ``GET /audit-logs`` — it returns every record ordered by
    timestamp descending.

    Filters are combined with AND.  For example:

        GET /audit-logs?action=Create Flag&performed_by=admin

    returns only records where *both* ``action == "Create Flag"`` AND
    ``performed_by == "admin"``.

    An empty list is returned when no records match — this endpoint never
    raises an error for zero results.
    """
    return get_filtered_audit_logs(
        db,
        action=action,
        performed_by=performed_by,
        flag_id=flag_id,
        environment_id=environment_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/recent",
    response_model=List[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Return the 20 most recent audit log records",
)
def list_recent_audit_logs(
    db: Session = Depends(get_db),
) -> List[AuditLogResponse]:
    """
    Return the 20 most recent audit log records ordered by timestamp descending.

    This endpoint is unchanged from previous milestones and is kept for
    backward compatibility.
    """
    return get_recent_audit_logs(db, limit=20)


@router.get(
    "/user/{username}",
    response_model=List[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Return recent audit logs for a specific user",
)
def list_user_audit_logs(
    username: str,
    limit: int = Query(
        default=5,
        ge=1,
        le=100,
        description="Maximum number of records to return.",
    ),
    db: Session = Depends(get_db),
) -> List[AuditLogResponse]:
    """
    Return the most recent *limit* audit log records where
    ``performed_by == username``, ordered by timestamp descending.

    Used by the Profile page to show the logged-in user's recent activity.

    Returns an empty list if the user has no audit records.
    """
    return get_audit_logs_by_user(db, username=username, limit=limit)


@router.get(
    "/{audit_log_id}",
    response_model=AuditLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single audit log record by ID",
)
def get_audit_log(
    audit_log_id: int,
    db: Session = Depends(get_db),
) -> AuditLogResponse:
    """
    Return a single audit log record identified by its primary key.

    **Path parameter:**

    - ``audit_log_id`` — integer primary key of the audit log record.

    **Raises:**

    - **404 Not Found** when no audit log with the given ``audit_log_id``
      exists in the database.

    **Example:**

        GET /audit-logs/42

    Returns the full audit log record with id 42, or 404 if it does not
    exist.
    """
    log_entry = get_audit_log_by_id(db, audit_log_id)
    if log_entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log with id {audit_log_id} not found.",
        )
    return log_entry
