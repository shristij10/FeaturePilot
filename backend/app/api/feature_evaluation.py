from __future__ import annotations

from typing import Union

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.feature_evaluation_service import evaluate_feature_flag

router = APIRouter(
    prefix="/evaluate",
    tags=["Feature Evaluation"],
)


class EvaluationResponse(BaseModel):
    """
    Response schema for a feature flag evaluation.

    `value` is a bool when an environment override is active, or a str
    when the flag's default_value is used.  Inspect `source` to know
    which path was taken.
    """

    model_config = ConfigDict(from_attributes=False)

    flag_id: int = Field(
        ...,
        description="ID of the evaluated feature flag.",
        examples=[1],
    )
    environment_id: int = Field(
        ...,
        description="ID of the environment used for evaluation.",
        examples=[2],
    )
    value: Union[bool, str] = Field(
        ...,
        description=(
            "Resolved value of the flag in this environment. "
            "A bool when an environment override exists; "
            "a str when the flag's default_value is used."
        ),
        examples=[True],
    )
    source: str = Field(
        ...,
        description=(
            '"override" — value comes from an EnvironmentOverride record. '
            '"default"  — value comes from the flag\'s default_value.'
        ),
        examples=["override"],
    )


@router.get(
    "/{flag_id}/{environment_id}",
    response_model=EvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate a feature flag for an environment",
)
def evaluate_feature_flag_endpoint(
    flag_id: int,
    environment_id: int,
    db: Session = Depends(get_db),
) -> EvaluationResponse:
    """
    Resolve the effective value of a feature flag for a specific environment.

    **Evaluation order:**

    1. The feature flag is looked up by `flag_id`.
    2. The environment is validated by `environment_id`.
    3. If an `EnvironmentOverride` exists for the `(flag_id, environment_id)` pair,
       its boolean value is returned with `"source": "override"`.
    4. If no override exists, the flag's `default_value` string is returned
       with `"source": "default"`.

    **Example — override active:**
    ```json
    {
      "flag_id": 1,
      "environment_id": 2,
      "value": true,
      "source": "override"
    }
    ```

    **Example — no override, using default:**
    ```json
    {
      "flag_id": 1,
      "environment_id": 2,
      "value": "false",
      "source": "default"
    }
    ```

    Raises **404** if the feature flag does not exist.
    Raises **404** if the environment does not exist.
    """
    return evaluate_feature_flag(db, flag_id, environment_id)
