from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.feature_flag import (
    FeatureFlagCreate,
    FeatureFlagReplace,
    FeatureFlagResponse,
    FeatureFlagUpdate,
)
from app.services.feature_flag_service import (
    create_feature_flag,
    delete_feature_flag,
    get_all_feature_flags,
    get_feature_flag_by_id,
    replace_feature_flag,
    update_feature_flag,
)

router = APIRouter(
    prefix="/feature-flags",
    tags=["Feature Flags"],
)


@router.post(
    "/",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new feature flag",
)
def create_feature_flag_endpoint(
    payload: FeatureFlagCreate,
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    """
    Create a new feature flag.

    - **key**: unique, lowercase alphanumeric and underscores only (e.g. `dark_mode`).
    - **type**: one of `boolean`, `string`, `number`, `json`.
    - **default_value**: stored as a string; cast by the application based on `type`.
    - **enabled**: whether the flag is globally active.
    - **description**: optional free-text description.
    - **owner_team**: optional team responsible for the flag.

    Returns the created flag including its generated `id` and `created_at`.

    Raises **409** if a flag with the same `key` already exists.
    """
    return create_feature_flag(db, payload)


@router.get(
    "/",
    response_model=List[FeatureFlagResponse],
    status_code=status.HTTP_200_OK,
    summary="List all feature flags",
)
def list_feature_flags_endpoint(
    db: Session = Depends(get_db),
) -> List[FeatureFlagResponse]:
    """
    Return a list of all feature flags ordered by id ascending.
    """
    return get_all_feature_flags(db)


@router.get(
    "/{flag_id}",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a feature flag by ID",
)
def get_feature_flag_endpoint(
    flag_id: int,
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    """
    Retrieve a single feature flag by its primary key.

    Raises **404** if no flag with the given `flag_id` exists.
    """
    return get_feature_flag_by_id(db, flag_id)


@router.put(
    "/{flag_id}",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_200_OK,
    summary="Replace a feature flag (full update)",
)
def replace_feature_flag_endpoint(
    flag_id: int,
    payload: FeatureFlagReplace,
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    """
    Fully replace all updatable fields on an existing feature flag (PUT semantics).

    Every updatable field (`key`, `description`, `type`, `default_value`,
    `enabled`, `owner_team`) is overwritten with the values provided.
    Optional fields omitted from the body will be set to `null`.

    Use **PATCH** instead if you only want to update specific fields.

    Raises **404** if no flag with the given `flag_id` exists.
    Raises **409** if the new `key` conflicts with another flag.
    """
    return replace_feature_flag(db, flag_id, payload)


@router.patch(
    "/{flag_id}",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update a feature flag",
)
def update_feature_flag_endpoint(
    flag_id: int,
    payload: FeatureFlagUpdate,
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    """
    Partially update an existing feature flag (PATCH semantics).

    Only fields included in the request body are updated — omitted fields
    retain their current values unchanged.

    Use **PUT** instead if you want to replace the entire resource.

    Raises **404** if no flag with the given `flag_id` exists.
    Raises **409** if the new `key` conflicts with another flag.
    """
    return update_feature_flag(db, flag_id, payload)


@router.delete(
    "/{flag_id}",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a feature flag",
)
def delete_feature_flag_endpoint(
    flag_id: int,
    db: Session = Depends(get_db),
) -> FeatureFlagResponse:
    """
    Delete a feature flag by its primary key.

    All associated environment overrides are also deleted automatically
    via cascade.

    Returns the deleted flag so the caller can confirm what was removed.

    Raises **404** if no flag with the given `flag_id` exists.
    """
    return delete_feature_flag(db, flag_id)
