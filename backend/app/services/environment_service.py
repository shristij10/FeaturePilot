from __future__ import annotations

from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.schemas.environment import EnvironmentCreate, EnvironmentReplace, EnvironmentUpdate
from app.services.audit_log_service import create_audit_log


def create_environment(
    db: Session,
    environment: EnvironmentCreate,
) -> Environment:
    """
    Insert a new environment row and return the persisted ORM instance.

    Raises:
        HTTPException 409: If an environment with the same name already exists.
    """
    existing = (
        db.query(Environment)
        .filter(Environment.name == environment.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An environment named '{environment.name}' already exists.",
        )

    db_environment = Environment(
        name=environment.name,
        description=environment.description,
    )
    db.add(db_environment)
    db.commit()
    db.refresh(db_environment)

    # Audit: Create Environment
    create_audit_log(
        db=db,
        action="Create Environment",
        performed_by="system",
        old_value=None,
        new_value=db_environment.name,
    )

    return db_environment


def get_all_environments(db: Session) -> List[Environment]:
    """Return all environment rows ordered by id ascending."""
    return db.query(Environment).order_by(Environment.id).all()


def get_environment_by_id(db: Session, environment_id: int) -> Environment:
    """
    Return a single environment by primary key.

    Raises:
        HTTPException 404: If no environment with the given id exists.
    """
    db_environment = db.get(Environment, environment_id)
    if db_environment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment with id {environment_id} not found.",
        )
    return db_environment


def update_environment(
    db: Session,
    environment_id: int,
    environment: EnvironmentUpdate,
) -> Environment:
    """
    Apply a partial update (PATCH) to an existing environment.

    Raises:
        HTTPException 404: If no environment with the given id exists.
        HTTPException 409: If the new name conflicts with another environment.
    """
    db_environment = get_environment_by_id(db, environment_id)

    updates = environment.model_dump(exclude_unset=True)
    if not updates:
        return db_environment

    if "name" in updates:
        conflict = (
            db.query(Environment)
            .filter(
                Environment.name == updates["name"],
                Environment.id != environment_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An environment named '{updates['name']}' already exists.",
            )

    old_name = db_environment.name

    for field, value in updates.items():
        setattr(db_environment, field, value)

    db.commit()
    db.refresh(db_environment)

    # Audit: Update Environment — record name before and after.
    create_audit_log(
        db=db,
        action="Update Environment",
        performed_by="system",
        old_value=old_name,
        new_value=db_environment.name,
    )

    return db_environment


def replace_environment(
    db: Session,
    environment_id: int,
    environment: EnvironmentReplace,
) -> Environment:
    """
    Fully replace every updatable field (PUT) on an existing environment.

    Raises:
        HTTPException 404: If no environment with the given id exists.
        HTTPException 409: If the new name conflicts with another environment.
    """
    db_environment = get_environment_by_id(db, environment_id)

    if environment.name != db_environment.name:
        conflict = (
            db.query(Environment)
            .filter(
                Environment.name == environment.name,
                Environment.id != environment_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An environment named '{environment.name}' already exists.",
            )

    old_name = db_environment.name

    db_environment.name = environment.name
    db_environment.description = environment.description

    db.commit()
    db.refresh(db_environment)

    # Audit: Update Environment (PUT path)
    create_audit_log(
        db=db,
        action="Update Environment",
        performed_by="system",
        old_value=old_name,
        new_value=db_environment.name,
    )

    return db_environment


def delete_environment(db: Session, environment_id: int) -> Environment:
    """
    Delete an environment by primary key and return the deleted ORM instance.

    Raises:
        HTTPException 404: If no environment with the given id exists.
    """
    db_environment = get_environment_by_id(db, environment_id)
    deleted_name = db_environment.name

    db.delete(db_environment)
    db.commit()

    # Audit: Delete Environment
    create_audit_log(
        db=db,
        action="Delete Environment",
        performed_by="system",
        old_value=deleted_name,
        new_value=None,
    )

    return db_environment
