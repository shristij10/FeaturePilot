from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.environment_override import (
    EnvironmentOverrideCreate,
    EnvironmentOverrideReplace,
    EnvironmentOverrideResponse,
    EnvironmentOverrideUpdate,
)
from app.services.environment_override_service import (
    create_environment_override,
    delete_environment_override,
    get_all_environment_overrides,
    get_environment_override_by_id,
    replace_environment_override,
    update_environment_override,
)

router = APIRouter(
    prefix="/environment-overrides",
    tags=["Environment Overrides"],
)


@router.post(
    "/",
    response_model=EnvironmentOverrideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new environment override",
)
def create_environment_override_endpoint(
    payload: EnvironmentOverrideCreate,
    db: Session = Depends(get_db),
) -> EnvironmentOverrideResponse:
    """
    Create a per-environment override for a specific feature flag.

    The override value takes precedence over the flag's `default_value`
    for the specified environment.

    - **flag_id**: must reference an existing feature flag.
    - **environment_id**: must reference an existing environment.
    - **value**: `true` enables the flag in this environment, `false` disables it.

    Returns the created override including its generated `id`.

    Raises **404** if the feature flag or environment does not exist.
    Raises **409** if an override for this `(flag_id, environment_id)` pair already exists.
    """
    return create_environment_override(db, payload)


@router.get(
    "/",
    response_model=List[EnvironmentOverrideResponse],
    status_code=status.HTTP_200_OK,
    summary="List all environment overrides",
)
def list_environment_overrides_endpoint(
    db: Session = Depends(get_db),
) -> List[EnvironmentOverrideResponse]:
    """
    Return a list of all environment overrides ordered by id ascending.
    """
    return get_all_environment_overrides(db)


@router.get(
    "/{override_id}",
    response_model=EnvironmentOverrideResponse,
    status_code=status.HTTP_200_OK,
    summary="Get an environment override by ID",
)
def get_environment_override_endpoint(
    override_id: int,
    db: Session = Depends(get_db),
) -> EnvironmentOverrideResponse:
    """
    Retrieve a single environment override by its primary key.

    Raises **404** if no override with the given `override_id` exists.
    """
    return get_environment_override_by_id(db, override_id)


@router.put(
    "/{override_id}",
    response_model=EnvironmentOverrideResponse,
    status_code=status.HTTP_200_OK,
    summary="Replace an environment override (full update)",
)
def replace_environment_override_endpoint(
    override_id: int,
    payload: EnvironmentOverrideReplace,
    db: Session = Depends(get_db),
) -> EnvironmentOverrideResponse:
    """
    Fully replace all fields on an existing environment override (PUT semantics).

    All three fields (`flag_id`, `environment_id`, `value`) are required and
    will be overwritten with the values provided. This allows reassigning the
    override to a different flag or environment entirely.

    Use **PATCH** instead if you only need to toggle `value`.

    Raises **404** if the override, the new feature flag, or the new environment does not exist.
    Raises **409** if the new `(flag_id, environment_id)` pair already belongs to a different override.
    """
    return replace_environment_override(db, override_id, payload)


@router.patch(
    "/{override_id}",
    response_model=EnvironmentOverrideResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update an environment override",
)
def update_environment_override_endpoint(
    override_id: int,
    payload: EnvironmentOverrideUpdate,
    db: Session = Depends(get_db),
) -> EnvironmentOverrideResponse:
    """
    Partially update an existing environment override (PATCH semantics).

    Only `value` can be updated via PATCH. The `(flag_id, environment_id)` pair
    is immutable through this endpoint — to reassign the override to a different
    flag or environment, use **PUT** or delete and recreate it.

    Use **PUT** instead if you need to change `flag_id` or `environment_id`.

    Raises **404** if no override with the given `override_id` exists.
    """
    return update_environment_override(db, override_id, payload)


@router.delete(
    "/{override_id}",
    response_model=EnvironmentOverrideResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an environment override",
)
def delete_environment_override_endpoint(
    override_id: int,
    db: Session = Depends(get_db),
) -> EnvironmentOverrideResponse:
    """
    Delete an environment override by its primary key.

    Returns the deleted override so the caller can confirm what was removed.

    Raises **404** if no override with the given `override_id` exists.
    """
    return delete_environment_override(db, override_id)
