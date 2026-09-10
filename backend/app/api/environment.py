from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.environment import (
    EnvironmentCreate,
    EnvironmentReplace,
    EnvironmentResponse,
    EnvironmentUpdate,
)
from app.services.environment_service import (
    create_environment,
    delete_environment,
    get_all_environments,
    get_environment_by_id,
    replace_environment,
    update_environment,
)

router = APIRouter(
    prefix="/environments",
    tags=["Environments"],
)


@router.post(
    "/",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new environment",
)
def create_environment_endpoint(
    payload: EnvironmentCreate,
    db: Session = Depends(get_db),
) -> EnvironmentResponse:
    """
    Create a new deployment environment.

    - **name**: unique, 1–100 characters, required.
    - **description**: optional, up to 255 characters.

    Returns the created environment including its generated `id` and `created_at`.
    """
    return create_environment(db, payload)


@router.get(
    "/",
    response_model=List[EnvironmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all environments",
)
def list_environments_endpoint(
    db: Session = Depends(get_db),
) -> List[EnvironmentResponse]:
    """
    Return a list of all environments ordered by id ascending.
    """
    return get_all_environments(db)


@router.get(
    "/{environment_id}",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get an environment by ID",
)
def get_environment_endpoint(
    environment_id: int,
    db: Session = Depends(get_db),
) -> EnvironmentResponse:
    """
    Retrieve a single environment by its primary key.

    Returns **404** if no environment with the given `environment_id` exists.
    """
    return get_environment_by_id(db, environment_id)


@router.put(
    "/{environment_id}",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Replace an environment (full update)",
)
def replace_environment_endpoint(
    environment_id: int,
    payload: EnvironmentReplace,
    db: Session = Depends(get_db),
) -> EnvironmentResponse:
    """
    Fully replace all updatable fields on an existing environment (PUT semantics).

    **All fields are required.** Every updatable field (`name`, `description`)
    is overwritten with the values provided — omitting a field is not the same
    as leaving it unchanged; it will be set to its supplied value (or `null`
    for `description` if not provided).

    Use **PATCH** instead if you only want to update specific fields.

    Returns **404** if no environment with the given `environment_id` exists.
    Returns **409** if the new name conflicts with another environment.
    """
    return replace_environment(db, environment_id, payload)


@router.patch(
    "/{environment_id}",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update an environment",
)
def update_environment_endpoint(
    environment_id: int,
    payload: EnvironmentUpdate,
    db: Session = Depends(get_db),
) -> EnvironmentResponse:
    """
    Partially update an existing environment (PATCH semantics).

    Only fields included in the request body are updated — omitted fields
    retain their current values unchanged.

    Use **PUT** instead if you want to replace the entire resource.

    Returns **404** if no environment with the given `environment_id` exists.
    Returns **409** if the new name conflicts with another environment.
    """
    return update_environment(db, environment_id, payload)


@router.delete(
    "/{environment_id}",
    response_model=EnvironmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an environment",
)
def delete_environment_endpoint(
    environment_id: int,
    db: Session = Depends(get_db),
) -> EnvironmentResponse:
    """
    Delete an environment by its primary key.

    Returns the deleted environment so the caller can confirm what was removed.

    Returns **404** if no environment with the given `environment_id` exists.
    """
    return delete_environment(db, environment_id)
