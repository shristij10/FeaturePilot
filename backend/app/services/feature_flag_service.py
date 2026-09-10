from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.feature_flag import FeatureFlag
from app.schemas.feature_flag import (
    FeatureFlagCreate,
    FeatureFlagReplace,
    FeatureFlagUpdate,
)
from app.services.audit_log_service import create_audit_log
from app.core.redis import delete_flag_cache


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _get_key_conflict(
    db: Session,
    key: str,
    exclude_id: int | None = None,
) -> FeatureFlag | None:
    """Return a FeatureFlag whose key matches *key*, excluding *exclude_id*."""
    query = db.query(FeatureFlag).filter(FeatureFlag.key == key)
    if exclude_id is not None:
        query = query.filter(FeatureFlag.id != exclude_id)
    return query.first()


def _flag_to_dict(flag: FeatureFlag) -> Dict[str, Any]:
    """
    Serialise a FeatureFlag ORM instance to a plain dict.

    This dict is stored verbatim as the ``old_state`` / ``new_state`` JSON
    snapshot in the AuditLog table, giving a complete picture of the flag's
    configuration at the moment the change was made.

    The ``created_at`` timestamp is included as an ISO 8601 string so the
    snapshot is fully self-contained and does not require a DB look-up to
    interpret.
    """
    return {
        "id":                 flag.id,
        "key":                flag.key,
        "description":        flag.description,
        "type":               flag.type,
        "default_value":      flag.default_value,
        "enabled":            flag.enabled,
        "owner_team":         flag.owner_team,
        "rollout_percentage": flag.rollout_percentage,
        "created_at":         flag.created_at.isoformat() if flag.created_at else None,
    }


def _log_flag(
    db: Session,
    action: str,
    flag_id: int,
    old_state: Optional[Dict[str, Any]],
    new_state: Optional[Dict[str, Any]],
) -> None:
    """
    Write a single Feature Flag audit entry via the shared create_audit_log()
    service.

    All flag audit records are attributed to ``"system"`` because the CRUD
    service layer currently has no access to the authenticated user's identity
    — that information lives in the HTTP layer and is not threaded through to
    the service.  ``environment_id`` is always ``None`` for flag-level
    operations because feature flags are not scoped to a single environment.

    This helper is the *single call-site* for flag auditing; centralising it
    here prevents duplicated ``create_audit_log`` calls and makes future
    changes (e.g. adding a ``performed_by`` parameter) a one-line edit.

    Audit failures are silently absorbed by ``create_audit_log`` itself —
    the primary CRUD operation is never affected.
    """
    create_audit_log(
        db=db,
        action=action,
        performed_by="system",
        flag_id=flag_id,
        environment_id=None,
        old_state=old_state,
        new_state=new_state,
    )


# ---------------------------------------------------------------------------
# Public CRUD functions
# ---------------------------------------------------------------------------

def create_feature_flag(
    db: Session,
    payload: FeatureFlagCreate,
) -> FeatureFlag:
    """
    Insert a new feature flag row and return the persisted ORM instance.

    Audit log: "Create Flag"
        old_state = null  (nothing existed before)
        new_state = complete flag snapshot

    Raises:
        HTTPException 409: If a flag with the same key already exists.
    """
    if _get_key_conflict(db, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A feature flag with key '{payload.key}' already exists.",
        )

    db_flag = FeatureFlag(
        key=payload.key,
        description=payload.description,
        type=payload.type,
        default_value=payload.default_value,
        enabled=payload.enabled,
        owner_team=payload.owner_team,
        rollout_percentage=payload.rollout_percentage,
    )
    db.add(db_flag)
    db.commit()
    db.refresh(db_flag)

    # ---- Audit: Create Flag ----
    _log_flag(
        db=db,
        action="Create Flag",
        flag_id=db_flag.id,
        old_state=None,
        new_state=_flag_to_dict(db_flag),
    )

    return db_flag


def get_all_feature_flags(db: Session) -> List[FeatureFlag]:
    """Return all feature flag rows ordered by id ascending."""
    return db.query(FeatureFlag).order_by(FeatureFlag.id).all()


def get_feature_flag_by_id(db: Session, flag_id: int) -> FeatureFlag:
    """
    Return a single feature flag by primary key.

    Raises:
        HTTPException 404: If no flag with the given id exists.
    """
    db_flag = db.get(FeatureFlag, flag_id)
    if db_flag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature flag with id {flag_id} not found.",
        )
    return db_flag


def replace_feature_flag(
    db: Session,
    flag_id: int,
    payload: FeatureFlagReplace,
) -> FeatureFlag:
    """
    Fully replace every updatable field (PUT) on an existing feature flag.

    Audit log(s) written:
    - Always: "Update Flag"  (old → new full snapshot)
    - Additionally if enabled changed False→True:  "Enable Flag"
    - Additionally if enabled changed True→False:  "Disable Flag"

    Raises:
        HTTPException 404: If no flag with the given id exists.
        HTTPException 409: If the new key conflicts with another flag.
    """
    db_flag = get_feature_flag_by_id(db, flag_id)

    if payload.key != db_flag.key and _get_key_conflict(db, payload.key, exclude_id=flag_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A feature flag with key '{payload.key}' already exists.",
        )

    # Snapshot state before the change
    old_snapshot = _flag_to_dict(db_flag)
    was_enabled  = db_flag.enabled

    # Apply all fields
    db_flag.key                = payload.key
    db_flag.description        = payload.description
    db_flag.type               = payload.type
    db_flag.default_value      = payload.default_value
    db_flag.enabled            = payload.enabled
    db_flag.owner_team         = payload.owner_team
    db_flag.rollout_percentage = payload.rollout_percentage

    db.commit()
    db.refresh(db_flag)

    new_snapshot = _flag_to_dict(db_flag)

    # ---- Audit: Update Flag ----
    _log_flag(
        db=db,
        action="Update Flag",
        flag_id=db_flag.id,
        old_state=old_snapshot,
        new_state=new_snapshot,
    )

    # ---- Audit: Enable / Disable Flag (only when enabled changed) ----
    if not was_enabled and db_flag.enabled:
        _log_flag(
            db=db,
            action="Enable Flag",
            flag_id=db_flag.id,
            old_state={"enabled": False},
            new_state={"enabled": True},
        )
    elif was_enabled and not db_flag.enabled:
        _log_flag(
            db=db,
            action="Disable Flag",
            flag_id=db_flag.id,
            old_state={"enabled": True},
            new_state={"enabled": False},
        )

    # ---- Audit: Rollout Changed (only when rollout_percentage changed) ----
    # Comparing old vs new snapshot prevents a duplicate log when the value
    # was sent in the PUT payload but did not actually change.
    if old_snapshot["rollout_percentage"] != new_snapshot["rollout_percentage"]:
        _log_flag(
            db=db,
            action="Rollout Changed",
            flag_id=db_flag.id,
            old_state={"rollout_percentage": old_snapshot["rollout_percentage"]},
            new_state={"rollout_percentage": new_snapshot["rollout_percentage"]},
        )

    # Cache invalidation
    delete_flag_cache(old_snapshot["key"])
    if db_flag.key != old_snapshot["key"]:
        delete_flag_cache(db_flag.key)

    return db_flag


def update_feature_flag(
    db: Session,
    flag_id: int,
    payload: FeatureFlagUpdate,
) -> FeatureFlag:
    """
    Apply a partial update (PATCH) to an existing feature flag.

    Audit log(s) written:
    - Always (when at least one field changed): "Update Flag"
    - Additionally if enabled changed False→True:  "Enable Flag"
    - Additionally if enabled changed True→False:  "Disable Flag"

    Raises:
        HTTPException 404: If no flag with the given id exists.
        HTTPException 409: If the new key conflicts with another flag.
    """
    db_flag = get_feature_flag_by_id(db, flag_id)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return db_flag

    if "key" in updates and _get_key_conflict(db, updates["key"], exclude_id=flag_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A feature flag with key '{updates['key']}' already exists.",
        )

    # Snapshot state before the change
    old_snapshot = _flag_to_dict(db_flag)
    was_enabled  = db_flag.enabled

    for field, value in updates.items():
        setattr(db_flag, field, value)

    db.commit()
    db.refresh(db_flag)

    new_snapshot = _flag_to_dict(db_flag)

    # ---- Audit: Update Flag ----
    _log_flag(
        db=db,
        action="Update Flag",
        flag_id=db_flag.id,
        old_state=old_snapshot,
        new_state=new_snapshot,
    )

    # ---- Audit: Enable / Disable Flag (only when enabled was in the patch) ----
    if "enabled" in updates:
        if not was_enabled and db_flag.enabled:
            _log_flag(
                db=db,
                action="Enable Flag",
                flag_id=db_flag.id,
                old_state={"enabled": False},
                new_state={"enabled": True},
            )
        elif was_enabled and not db_flag.enabled:
            _log_flag(
                db=db,
                action="Disable Flag",
                flag_id=db_flag.id,
                old_state={"enabled": True},
                new_state={"enabled": False},
            )

    # ---- Audit: Rollout Changed (only when rollout_percentage was patched
    #             AND the value actually changed) ----
    # The "enabled in updates" guard on Enable/Disable is replicated here:
    # we only emit "Rollout Changed" when the caller explicitly sent the
    # field.  Comparing old vs new snapshot is the duplicate-prevention
    # check — if the value sent happened to equal the current value,
    # no spurious log is written.
    if (
        "rollout_percentage" in updates
        and old_snapshot["rollout_percentage"] != new_snapshot["rollout_percentage"]
    ):
        _log_flag(
            db=db,
            action="Rollout Changed",
            flag_id=db_flag.id,
            old_state={"rollout_percentage": old_snapshot["rollout_percentage"]},
            new_state={"rollout_percentage": new_snapshot["rollout_percentage"]},
        )

    # Cache invalidation
    delete_flag_cache(old_snapshot["key"])
    if db_flag.key != old_snapshot["key"]:
        delete_flag_cache(db_flag.key)

    return db_flag


def delete_feature_flag(db: Session, flag_id: int) -> FeatureFlag:
    """
    Delete a feature flag by primary key and return the deleted ORM instance.

    Audit log: "Delete Flag"
        old_state = complete flag snapshot
        new_state = null  (nothing remains after deletion)

    Raises:
        HTTPException 404: If no flag with the given id exists.
    """
    db_flag = get_feature_flag_by_id(db, flag_id)

    # Snapshot the full state before deletion — the row will be gone after commit
    old_snapshot = _flag_to_dict(db_flag)

    db.delete(db_flag)
    db.commit()

    # ---- Audit: Delete Flag ----
    # flag_id is passed explicitly because db_flag.id is still accessible
    # on the detached instance after deletion.
    _log_flag(
        db=db,
        action="Delete Flag",
        flag_id=old_snapshot["id"],
        old_state=old_snapshot,
        new_state=None,
    )

    # Cache invalidation
    delete_flag_cache(old_snapshot["key"])

    return db_flag
