from __future__ import annotations

from typing import TypedDict, Union

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.models.environment_override import EnvironmentOverride
from app.models.feature_flag import FeatureFlag


class EvaluationResult(TypedDict):
    """
    Shape of the dict returned by evaluate_feature_flag().

    flag_id        — the flag that was evaluated.
    environment_id — the environment context used for evaluation.
    value          — the resolved value: a bool when source is "override",
                     a str when source is "default" (matches the column type).
    source         — "override" when an EnvironmentOverride was found,
                     "default" when the flag's default_value is used.
    """

    flag_id: int
    environment_id: int
    value: Union[bool, str]
    source: str


def evaluate_feature_flag(
    db: Session,
    flag_id: int,
    environment_id: int,
) -> EvaluationResult:
    """
    Evaluate the effective value of a feature flag for a given environment.

    Evaluation order:

    1. Look up the FeatureFlag by *flag_id*.
       Raises 404 if the flag does not exist.

    2. Look up the Environment by *environment_id*.
       Raises 404 if the environment does not exist.

    3. Query environment_overrides for a row matching
       (flag_id, environment_id).

    4. If an override is found:
       Return the override's boolean value with source="override".

    5. If no override is found:
       Return the flag's string default_value with source="default".

    Args:
        db:             Active SQLAlchemy session.
        flag_id:        Primary key of the FeatureFlag to evaluate.
        environment_id: Primary key of the target Environment.

    Returns:
        EvaluationResult dict with keys:
          flag_id, environment_id, value, source.

    Raises:
        HTTPException 404: If no FeatureFlag with *flag_id* exists.
        HTTPException 404: If no Environment with *environment_id* exists.
    """
    # Step 1 — resolve the feature flag.
    db_flag = db.get(FeatureFlag, flag_id)
    if db_flag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature flag with id {flag_id} not found.",
        )

    # Step 2 — validate the environment exists.
    db_env = db.get(Environment, environment_id)
    if db_env is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with id {environment_id} not found.",
        )

    # Step 3 — look for a per-environment override.
    override = (
        db.query(EnvironmentOverride)
        .filter(
            EnvironmentOverride.flag_id == flag_id,
            EnvironmentOverride.environment_id == environment_id,
        )
        .first()
    )

    # Step 4 — override found: return its boolean value.
    if override is not None:
        return EvaluationResult(
            flag_id=flag_id,
            environment_id=environment_id,
            value=override.value,
            source="override",
        )

    # Step 5 — no override: fall back to the flag's default_value.
    return EvaluationResult(
        flag_id=flag_id,
        environment_id=environment_id,
        value=db_flag.default_value,
        source="default",
    )
