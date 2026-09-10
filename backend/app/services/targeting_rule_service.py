from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.feature_flag import FeatureFlag
from app.models.targeting_rule import TargetingRule
from app.schemas.targeting_rule import TargetingRuleCreate
from app.services.audit_log_service import create_audit_log
from app.core.redis import delete_flag_cache

# Valid rule_type values — must match the Literal constraint in the schema
# and the documentation in the TargetingRule model.
_VALID_RULE_TYPES = {"user", "group"}


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


def _rule_to_dict(rule: TargetingRule) -> Dict[str, Any]:
    """
    Serialise a TargetingRule ORM instance to a plain dict.

    This dict is stored as the ``old_state`` / ``new_state`` JSON snapshot
    in the AuditLog table, capturing the complete state of the targeting
    rule at the moment the change was made.
    """
    return {
        "id":         rule.id,
        "flag_id":    rule.flag_id,
        "rule_type":  rule.rule_type,
        "rule_value": rule.rule_value,
    }


def _log_rule(
    db: Session,
    action: str,
    flag_id: int,
    old_state: Optional[Dict[str, Any]],
    new_state: Optional[Dict[str, Any]],
) -> None:
    """
    Write a single targeting-rule audit entry via ``create_audit_log()``.

    This is the single call-site for targeting-rule auditing.  Centralising
    it here means a future change (e.g. threading ``performed_by`` through
    from the API layer) requires only one edit.

    ``environment_id`` is ``None`` for targeting rules — they are not
    scoped to a specific environment.

    Audit failures are silently absorbed by ``create_audit_log`` itself so
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
# Public service functions
# ---------------------------------------------------------------------------

def create_targeting_rule(
    db: Session,
    payload: TargetingRuleCreate,
) -> TargetingRule:
    """
    Insert a new targeting rule and return the persisted ORM instance.

    Audit log written:
    - rule_type == "user"  → "User Target Added"
    - rule_type == "group" → "Group Target Added"
      old_state = null
      new_state = complete targeting-rule snapshot

    Validation performed before the write:
    - The referenced feature flag must exist.
    - rule_type must be either "user" or "group".

    Note: Pydantic's Literal constraint on TargetingRuleCreate already
    rejects invalid rule_type values at the API layer.  The explicit check
    here ensures the service is safe to call directly from other service
    functions or tests without going through a router.

    Raises:
        HTTPException 404: If the feature flag does not exist.
        HTTPException 422: If rule_type is not "user" or "group".
        HTTPException 409: If an identical rule already exists.
    """
    if payload.rule_type not in _VALID_RULE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid rule_type '{payload.rule_type}'. "
                f"Must be one of: {sorted(_VALID_RULE_TYPES)}."
            ),
        )

    db_flag = _require_feature_flag(db, payload.flag_id)

    existing = (
        db.query(TargetingRule)
        .filter(
            TargetingRule.flag_id    == payload.flag_id,
            TargetingRule.rule_type  == payload.rule_type,
            TargetingRule.rule_value == payload.rule_value,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Targeting rule already exists.",
        )

    db_rule = TargetingRule(
        flag_id=payload.flag_id,
        rule_type=payload.rule_type,
        rule_value=payload.rule_value,
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)

    # ---- Audit: User Target Added / Group Target Added ----
    # Action label is derived from rule_type so the audit trail is explicit
    # about whether a user or group target was added.
    action = (
        "User Target Added" if db_rule.rule_type == "user"
        else "Group Target Added"
    )
    _log_rule(
        db=db,
        action=action,
        flag_id=db_rule.flag_id,
        old_state=None,
        new_state=_rule_to_dict(db_rule),
    )

    # Cache invalidation: a new targeting rule changes who the flag evaluates
    # to True, so all cached results for this flag must be cleared.
    delete_flag_cache(db_flag.key)

    return db_rule


def get_all_targeting_rules(db: Session) -> List[TargetingRule]:
    """Return all targeting rule rows ordered by id ascending."""
    return db.query(TargetingRule).order_by(TargetingRule.id).all()


def delete_targeting_rule(
    db: Session,
    rule_id: int,
) -> TargetingRule:
    """
    Delete a targeting rule by primary key and return the deleted ORM instance.

    Audit log written:
    - rule_type == "user"  → "User Target Removed"
    - rule_type == "group" → "Group Target Removed"
      old_state = complete targeting-rule snapshot (captured before deletion)
      new_state = null

    Raises:
        HTTPException 404: If no targeting rule with the given id exists.
    """
    db_rule = db.get(TargetingRule, rule_id)
    if db_rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Targeting rule with id {rule_id} not found.",
        )

    # Capture complete snapshot and flag key before the row is deleted.
    old_snapshot = _rule_to_dict(db_rule)

    db_flag  = db.get(FeatureFlag, db_rule.flag_id)
    flag_key = db_flag.key if db_flag is not None else f"id={db_rule.flag_id}"

    db.delete(db_rule)
    db.commit()

    # ---- Audit: User Target Removed / Group Target Removed ----
    action = (
        "User Target Removed" if old_snapshot["rule_type"] == "user"
        else "Group Target Removed"
    )
    _log_rule(
        db=db,
        action=action,
        flag_id=old_snapshot["flag_id"],
        old_state=old_snapshot,
        new_state=None,
    )

    # Cache invalidation: removing a targeting rule changes evaluation results.
    delete_flag_cache(flag_key)

    return db_rule
