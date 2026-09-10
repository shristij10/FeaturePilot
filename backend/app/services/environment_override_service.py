from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.models.environment_override import EnvironmentOverride
from app.models.feature_flag import FeatureFlag
from app.schemas.environment_override import (
    EnvironmentOverrideCreate,
    EnvironmentOverrideReplace,
    EnvironmentOverrideUpdate,
)
from app.services.audit_log_service import create_audit_log
from app.core.redis import delete_flag_cache


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _require_feature_flag(db: Session, flag_id: int) -> FeatureFlag:
    """Return the FeatureFlag with *flag_id* or raise 404."""
    db_flag = db.get(FeatureFlag, flag_id)
    if db_flag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature flag with id {flag_id} not found.",
        )
    return db_flag


def _require_environment(db: Session, environment_id: int) -> Environment:
    """Return the Environment with *environment_id* or raise 404."""
    db_env = db.get(Environment, environment_id)
    if db_env is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with id {environment_id} not found.",
        )
    return db_env


def _get_pair_conflict(
    db: Session,
    flag_id: int,
    environment_id: int,
    exclude_id: int | None = None,
) -> EnvironmentOverride | None:
    """
    Return an existing EnvironmentOverride for (flag_id, environment_id),
    optionally excluding the row with *exclude_id*.
    """
    query = db.query(EnvironmentOverride).filter(
        EnvironmentOverride.flag_id        == flag_id,
        EnvironmentOverride.environment_id == environment_id,
    )
    if exclude_id is not None:
        query = query.filter(EnvironmentOverride.id != exclude_id)
    return query.first()


def _flag_key_for_id(db: Session, flag_id: int) -> str:
    """
    Return the string key of a FeatureFlag by its primary key.

    Falls back to ``"id=<flag_id>"`` when the flag row no longer exists
    (e.g. during cascaded deletion) so callers never have to handle None.
    """
    db_flag = db.get(FeatureFlag, flag_id)
    return db_flag.key if db_flag is not None else f"id={flag_id}"


def _override_to_dict(override: EnvironmentOverride) -> Dict[str, Any]:
    """
    Serialise an EnvironmentOverride ORM instance to a plain dict.

    This dict is stored as the ``old_state`` / ``new_state`` JSON snapshot
    in the AuditLog table, capturing the complete state of the override at
    the moment the change was made.
    """
    return {
        "id":             override.id,
        "flag_id":        override.flag_id,
        "environment_id": override.environment_id,
        "value":          override.value,
    }


def _log_override(
    db: Session,
    flag_id: int,
    environment_id: int,
    old_state: Optional[Dict[str, Any]],
    new_state: Optional[Dict[str, Any]],
) -> None:
    """
    Write a single ``"Override Changed"`` audit entry via ``create_audit_log()``.

    This is the single call-site for environment-override auditing.
    Both ``flag_id`` and ``environment_id`` are populated so the audit
    trail can be filtered by either resource.

    Audit failures are silently absorbed by ``create_audit_log`` itself so
    the primary CRUD operation is never affected.
    """
    create_audit_log(
        db=db,
        action="Override Changed",
        performed_by="system",
        flag_id=flag_id,
        environment_id=environment_id,
        old_state=old_state,
        new_state=new_state,
    )


# ---------------------------------------------------------------------------
# Public CRUD functions
# ---------------------------------------------------------------------------

def create_environment_override(
    db: Session,
    payload: EnvironmentOverrideCreate,
) -> EnvironmentOverride:
    """
    Insert a new environment override and return the persisted ORM instance.

    Audit log: "Override Changed"
        old_state = null   (nothing existed before)
        new_state = complete override snapshot
        flag_id, environment_id both populated

    Raises:
        HTTPException 404: If the feature flag does not exist.
        HTTPException 404: If the environment does not exist.
        HTTPException 409: If an override for (flag_id, environment_id) exists.
    """
    _require_feature_flag(db, payload.flag_id)
    _require_environment(db, payload.environment_id)

    if _get_pair_conflict(db, payload.flag_id, payload.environment_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An override for flag id {payload.flag_id} in environment "
                f"id {payload.environment_id} already exists."
            ),
        )

    db_override = EnvironmentOverride(
        flag_id=payload.flag_id,
        environment_id=payload.environment_id,
        value=payload.value,
    )
    db.add(db_override)
    db.commit()
    db.refresh(db_override)

    # ---- Audit: Override Changed (create) ----
    _log_override(
        db=db,
        flag_id=db_override.flag_id,
        environment_id=db_override.environment_id,
        old_state=None,
        new_state=_override_to_dict(db_override),
    )

    # Cache invalidation: creating an override changes evaluation for this flag.
    flag_key = _flag_key_for_id(db, db_override.flag_id)
    delete_flag_cache(flag_key)

    return db_override


def get_all_environment_overrides(db: Session) -> List[EnvironmentOverride]:
    """Return all environment override rows ordered by id ascending."""
    return db.query(EnvironmentOverride).order_by(EnvironmentOverride.id).all()


def get_environment_override_by_id(
    db: Session,
    override_id: int,
) -> EnvironmentOverride:
    """
    Return a single environment override by primary key.

    Raises:
        HTTPException 404: If no override with the given id exists.
    """
    db_override = db.get(EnvironmentOverride, override_id)
    if db_override is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment override with id {override_id} not found.",
        )
    return db_override


def replace_environment_override(
    db: Session,
    override_id: int,
    payload: EnvironmentOverrideReplace,
) -> EnvironmentOverride:
    """
    Fully replace every field (PUT) on an existing environment override.

    Audit log: "Override Changed"
        old_state = complete override snapshot before the PUT
        new_state = complete override snapshot after the PUT
        flag_id / environment_id taken from the POST-commit state
        (the pre-commit flag_id is also used for old-flag cache
        invalidation when the FK pair changes)

    Raises:
        HTTPException 404: If the override does not exist.
        HTTPException 404: If the new feature flag does not exist.
        HTTPException 404: If the new environment does not exist.
        HTTPException 409: If the new (flag_id, environment_id) pair already
                           belongs to a different override.
    """
    db_override = get_environment_override_by_id(db, override_id)

    _require_feature_flag(db, payload.flag_id)
    _require_environment(db, payload.environment_id)

    pair_is_changing = (
        payload.flag_id        != db_override.flag_id
        or payload.environment_id != db_override.environment_id
    )
    if pair_is_changing and _get_pair_conflict(
        db, payload.flag_id, payload.environment_id, exclude_id=override_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An override for flag id {payload.flag_id} in environment "
                f"id {payload.environment_id} already exists."
            ),
        )

    # Capture complete snapshot and old flag key before writing.
    old_snapshot = _override_to_dict(db_override)
    old_flag_key = _flag_key_for_id(db, db_override.flag_id)

    db_override.flag_id        = payload.flag_id
    db_override.environment_id = payload.environment_id
    db_override.value          = payload.value

    db.commit()
    db.refresh(db_override)

    new_snapshot = _override_to_dict(db_override)

    # ---- Audit: Override Changed (PUT) ----
    _log_override(
        db=db,
        flag_id=db_override.flag_id,
        environment_id=db_override.environment_id,
        old_state=old_snapshot,
        new_state=new_snapshot,
    )

    # Cache invalidation: invalidate old flag key and, if the flag changed,
    # also the new flag key.
    delete_flag_cache(old_flag_key)
    new_flag_key = _flag_key_for_id(db, db_override.flag_id)
    if new_flag_key != old_flag_key:
        delete_flag_cache(new_flag_key)

    return db_override


def update_environment_override(
    db: Session,
    override_id: int,
    payload: EnvironmentOverrideUpdate,
) -> EnvironmentOverride:
    """
    Apply a partial update (PATCH) to an existing environment override.

    Only ``value`` can be patched via PATCH.

    Audit log: "Override Changed"
        old_state = complete override snapshot before the PATCH
        new_state = complete override snapshot after the PATCH

    Raises:
        HTTPException 404: If the override does not exist.
        HTTPException 422: If ``value`` is explicitly sent as null.
    """
    db_override = get_environment_override_by_id(db, override_id)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return db_override

    if "value" in updates and updates["value"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="value cannot be null.",
        )

    # Capture complete snapshot before writing.
    old_snapshot = _override_to_dict(db_override)

    for field, value in updates.items():
        setattr(db_override, field, value)

    db.commit()
    db.refresh(db_override)

    new_snapshot = _override_to_dict(db_override)

    # ---- Audit: Override Changed (PATCH) ----
    _log_override(
        db=db,
        flag_id=db_override.flag_id,
        environment_id=db_override.environment_id,
        old_state=old_snapshot,
        new_state=new_snapshot,
    )

    # Cache invalidation: the flag's evaluation result has changed.
    flag_key = _flag_key_for_id(db, db_override.flag_id)
    delete_flag_cache(flag_key)

    return db_override


def delete_environment_override(
    db: Session,
    override_id: int,
) -> EnvironmentOverride:
    """
    Delete an environment override by primary key and return the deleted ORM instance.

    Audit log: "Override Changed"
        old_state = complete override snapshot (captured before deletion)
        new_state = null

    Raises:
        HTTPException 404: If no override with the given id exists.
    """
    db_override = get_environment_override_by_id(db, override_id)

    # Capture complete snapshot and flag key before the row is deleted.
    old_snapshot = _override_to_dict(db_override)
    flag_key     = _flag_key_for_id(db, db_override.flag_id)

    db.delete(db_override)
    db.commit()

    # ---- Audit: Override Changed (delete) ----
    # flag_id and environment_id are taken from the pre-deletion snapshot
    # because the detached ORM instance may no longer be accessible.
    _log_override(
        db=db,
        flag_id=old_snapshot["flag_id"],
        environment_id=old_snapshot["environment_id"],
        old_state=old_snapshot,
        new_state=None,
    )

    # Cache invalidation: deleting an override changes evaluation for this flag.
    delete_flag_cache(flag_key)

    return db_override
