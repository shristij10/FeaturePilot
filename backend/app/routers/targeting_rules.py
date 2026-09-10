from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.targeting_rule import TargetingRuleCreate, TargetingRuleResponse
from app.services.targeting_rule_service import (
    create_targeting_rule,
    delete_targeting_rule,
    get_all_targeting_rules,
)

router = APIRouter(
    prefix="/targeting-rules",
    tags=["Targeting Rules"],
)


@router.post(
    "/",
    response_model=TargetingRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new targeting rule",
)
def create_targeting_rule_endpoint(
    payload: TargetingRuleCreate,
    db: Session = Depends(get_db),
) -> TargetingRuleResponse:
    """
    Create a targeting rule that associates a feature flag with a specific
    user or user group.

    - **flag_id**: must reference an existing feature flag.
    - **rule_type**: must be either `"user"` or `"group"`.
    - **rule_value**: the username (when `rule_type="user"`) or the
      `group_name` (when `rule_type="group"`) this rule targets.

    Returns the created rule including its generated `id`.

    Raises **404** if the feature flag does not exist.
    Raises **422** if `rule_type` is not `"user"` or `"group"`.
    """
    return create_targeting_rule(db, payload)


@router.get(
    "/",
    response_model=List[TargetingRuleResponse],
    status_code=status.HTTP_200_OK,
    summary="List all targeting rules",
)
def list_targeting_rules_endpoint(
    db: Session = Depends(get_db),
) -> List[TargetingRuleResponse]:
    """
    Return a list of all targeting rules ordered by id ascending.
    """
    return get_all_targeting_rules(db)


@router.delete(
    "/{rule_id}",
    response_model=TargetingRuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a targeting rule",
)
def delete_targeting_rule_endpoint(
    rule_id: int,
    db: Session = Depends(get_db),
) -> TargetingRuleResponse:
    """
    Delete a targeting rule by its primary key.

    Returns the deleted rule so the caller can confirm what was removed.

    Raises **404** if no targeting rule with the given `rule_id` exists.
    """
    return delete_targeting_rule(db, rule_id)
