from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.flag_evaluation import FlagEvaluationRequest, FlagEvaluationResponse
from app.services.flag_evaluation_engine import evaluate_flag, evaluate_flag_enhanced, evaluate_flag_cached

router = APIRouter(
    prefix="/flags",
    tags=["Flag Evaluation"],
)


@router.post(
    "/evaluate",
    response_model=FlagEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate a feature flag for a given environment",
    description=(
        "Resolves the effective value of a feature flag for a specific environment.\n\n"
        "**Task 3 enhanced evaluation order:**\n"
        "1. Resolve feature flag (404 if missing)\n"
        "2. Check if flag is globally enabled → `enabled: false, reason: default_value`\n"
        "3. Check environment override → `reason: environment_override`\n"
        "4. Check direct user targeting → `reason: user_targeting`\n"
        "5. Check group targeting → `reason: group_targeting`\n"
        "6. Check percentage rollout → `reason: percentage_rollout`\n"
        "7. Return default value → `reason: default_value`\n\n"
        "Pass `user_id` and/or `groups` for targeting and rollout.\n"
        "The legacy `user_context` dict is still accepted for backward compatibility."
    ),
)
def evaluate_flag_endpoint(
    payload: FlagEvaluationRequest,
    db: Session = Depends(get_db),
) -> FlagEvaluationResponse:
    """
    Evaluate a feature flag using the enhanced Task 3 evaluation engine.

    The endpoint accepts the same path as before (`POST /flags/evaluate`) —
    no duplicate routes are introduced.  The evaluation logic now uses
    `evaluate_flag_enhanced` which follows the Task 3 priority order and
    returns a `reason` field in addition to the existing `source` field.

    **Request example:**
    ```json
    {
      "flag_key": "new_dashboard",
      "environment": "production",
      "user_id": "user_101",
      "groups": ["beta_users"]
    }
    ```

    **Response example (user targeting):**
    ```json
    {
      "flag_key": "new_dashboard",
      "environment": "production",
      "enabled": true,
      "value": true,
      "source": "targeting_rule",
      "reason": "user_targeting"
    }
    ```

    **Response example (percentage rollout):**
    ```json
    {
      "flag_key": "new_dashboard",
      "environment": "production",
      "enabled": true,
      "value": true,
      "source": "percentage_rollout",
      "reason": "percentage_rollout",
      "bucket": 12,
      "rollout_percentage": 25
    }
    ```

    Allowed `reason` values:
    - `user_targeting`       — user was explicitly targeted by a rule.
    - `group_targeting`      — user's group was targeted by a rule.
    - `percentage_rollout`   — SHA-256 bucket was below rollout threshold.
    - `environment_override` — environment-level override was applied.
    - `default_value`        — flag's configured default was returned.

    Raises **404** if the feature flag does not exist.
    Raises **404** if the environment does not exist.
    Raises **422** if the request body fails validation.
    """
    return evaluate_flag_cached(
        db=db,
        flag_key=payload.flag_key,
        environment=payload.environment,
        user_id=payload.user_id,
        groups=payload.groups,
        user_context=payload.user_context,
        performed_by=payload.performed_by,
    )
