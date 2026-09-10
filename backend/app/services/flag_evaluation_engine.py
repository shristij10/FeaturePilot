from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional, Union

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.environment import Environment
from app.models.environment_override import EnvironmentOverride
from app.models.feature_flag import FeatureFlag
from app.models.targeting_rule import TargetingRule
from app.models.user import User
from app.services.audit_log_service import create_audit_log
from app.core.redis import build_cache_key, get_cache, set_cache


# ---------------------------------------------------------------------------
# Return type alias
# ---------------------------------------------------------------------------

# Shape matches FlagEvaluationResponse in app/schemas/flag_evaluation.py.
# Kept as a plain dict so the service layer remains Pydantic-agnostic.
EvaluationDict = Dict[str, Union[str, bool, int, float, Dict[str, Any], List[Any]]]


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _get_feature_flag(db: Session, flag_key: str) -> FeatureFlag:
    """Look up a FeatureFlag by its unique key, raising 404 if not found."""
    db_flag = (
        db.query(FeatureFlag)
        .filter(FeatureFlag.key == flag_key)
        .first()
    )
    if db_flag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feature flag '{flag_key}' not found.",
        )
    return db_flag


def _get_environment(db: Session, environment_name: str) -> Environment:
    """Look up an Environment by its unique name, raising 404 if not found."""
    db_env = (
        db.query(Environment)
        .filter(Environment.name == environment_name)
        .first()
    )
    if db_env is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Environment '{environment_name}' not found.",
        )
    return db_env


def _get_environment_override(
    db: Session,
    flag_id: int,
    environment_id: int,
) -> EnvironmentOverride | None:
    """Return the EnvironmentOverride for (flag_id, environment_id), or None."""
    return (
        db.query(EnvironmentOverride)
        .filter(
            EnvironmentOverride.flag_id == flag_id,
            EnvironmentOverride.environment_id == environment_id,
        )
        .first()
    )


def _get_targeting_rules(
    db: Session,
    flag_id: int,
) -> List[TargetingRule]:
    """
    Return all TargetingRule records for *flag_id*, ordered by id ascending.

    Returns an empty list when no rules exist — callers must treat an empty
    list as "no targeting configured; fall through to the default flow".
    """
    return (
        db.query(TargetingRule)
        .filter(TargetingRule.flag_id == flag_id)
        .order_by(TargetingRule.id)
        .all()
    )


def _get_user_by_username(
    db: Session,
    username: str,
) -> User | None:
    """
    Look up a User by username for group-based targeting.

    Returns None instead of raising so that an unknown username in
    user_context simply causes targeting rules to be skipped, preserving
    backward compatibility with callers that do not provide user context.
    """
    return (
        db.query(User)
        .filter(User.username == username)
        .first()
    )


def _compute_rollout_bucket(username: str, flag_key: str) -> int:
    """
    Compute a deterministic bucket number (0–99) for a (username, flag_key) pair.

    Uses SHA-256 so the same user always gets the same bucket for the same flag,
    regardless of Python runtime or platform.  Python's built-in hash() is
    intentionally avoided because it is randomised per-process.

    Args:
        username: The requesting user's username string.
        flag_key: The unique key of the feature flag being evaluated.

    Returns:
        An integer in the range [0, 99] inclusive.
    """
    key = f"{username}:{flag_key}"
    digest = hashlib.sha256(key.encode()).hexdigest()
    return int(digest, 16) % 100


def _cast_default_value(
    flag: FeatureFlag,
) -> Union[bool, int, float, Dict[str, Any], List[Any], str]:
    """
    Cast flag.default_value to the Python type implied by flag.type.

    Raises:
        HTTPException 500: If the stored value cannot be cast to the declared type.
    """
    raw: str = flag.default_value
    flag_type: str = flag.type

    try:
        if flag_type == "boolean":
            normalised = raw.strip().lower()
            if normalised == "true":
                return True
            if normalised == "false":
                return False
            raise ValueError(f"Cannot cast '{raw}' to boolean.")

        if flag_type == "number":
            return int(raw) if "." not in raw else float(raw)

        if flag_type == "json":
            parsed = json.loads(raw)
            if not isinstance(parsed, (dict, list)):
                raise ValueError(
                    f"JSON default_value must be an object or array, "
                    f"got {type(parsed).__name__}."
                )
            return parsed  # type: ignore[return-value]

        # flag_type == "string"
        return raw

    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Invalid default_value stored for feature flag '{flag.key}'. "
                f"Expected a valid {flag_type} value, got: '{raw}'. "
                f"Details: {exc}"
            ),
        ) from exc


def _evaluate_targeting_rules(
    db: Session,
    flag: FeatureFlag,
    environment_name: str,
    environment_id: int,
    rules: List[TargetingRule],
    username: str,
) -> EvaluationDict | None:
    """
    Walk the targeting rules for *flag* and return a resolved EvaluationDict
    if any rule matches *username*, otherwise return None.

    Matching logic:
    - rule_type == "user":  match when rule_value == username (exact, case-sensitive).
    - rule_type == "group": look up the User by username, then match when the
                            user's group.group_name == rule_value.

    Rules are evaluated in id-ascending order.  The first match wins.

    If username resolves to no User row in the database, group rules are
    skipped for that username (the user simply has no group), but user
    rules are still evaluated against the raw username string.

    Returns:

    • EvaluationDict when a targeting rule matches.

    • None when no targeting rules exist.

    • None when targeting rules exist but none match,
    allowing evaluation to continue with percentage rollout,
    environment overrides, and default values.

    When None is returned the caller must continue with the existing
    override / default flow unchanged.
    """
    if not rules:
        return None

    # Lazy-load the User record once — only needed for group rules.
    # Using a mutable container so the nested closure can rebind it.
    _user_cache: List[User | None] = [None]
    _user_fetched = [False]

    def _get_user() -> User | None:
        if not _user_fetched[0]:
            _user_cache[0] = _get_user_by_username(db, username)
            _user_fetched[0] = True
        return _user_cache[0]

    matched_rule: TargetingRule | None = None

    for rule in rules:
        if rule.rule_type == "user":
            # Direct username comparison — case-sensitive exact match.
            if rule.rule_value == username:
                matched_rule = rule
                break

        elif rule.rule_type == "group":
            db_user = _get_user()
            if db_user is None:
                # Username not found in the database; cannot evaluate group rules.
                continue
            # Resolve the group name through the SQLAlchemy relationship.
            # db_user.group is loaded lazily on first access.
            user_group_name = db_user.group.group_name if db_user.group else None
            if user_group_name == rule.rule_value:
                matched_rule = rule
                break

    # Build the audit payload common to both branches.
    audit_new_value_base = {
        "key":           flag.key,
        "environment":   environment_name,
        "username":      username,
        "rules_checked": len(rules),
    }

    if matched_rule is not None:
        # A rule matched — the flag is ON for this user/group.
        audit_new_value_base.update(
            {
                "matched_rule_id":    matched_rule.id,
                "matched_rule_type":  matched_rule.rule_type,
                "matched_rule_value": matched_rule.rule_value,
                "resolved_value":     True,
                "source":             "targeting_rule",
            }
        )
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag (Targeting Rule)",
            performed_by=username,
            flag_id=flag.id,
            environment_id=environment_id,
            old_state=None,
            new_state=audit_new_value_base,
        )
        return {
            "flag_key":    flag.key,
            "environment": environment_name,
            "enabled":     True,
            "value":       True,
            "source":      "targeting_rule",
            "reason":      "user_targeting" if matched_rule.rule_type == "user" else "group_targeting",
        }

    # Rules exist but none matched this user.
    # Log the outcome, then continue to percentage rollout / override / default.
    audit_new_value_base.update(
        {
            "matched_rule_id": None,
            "resolved_value": None,
            "source": "targeting_rule",
            "note": "No targeting rule matched. Continuing evaluation.",
        }
    )

    create_audit_log(
        db=db,
        action="Evaluate Feature Flag (Targeting Rule)",
        performed_by=username,
        flag_id=flag.id,
        environment_id=environment_id,
        old_state=None,
        new_state=audit_new_value_base,
    )

    return None


# ---------------------------------------------------------------------------
# Public evaluation function
# ---------------------------------------------------------------------------

def evaluate_flag(
    db: Session,
    flag_key: str,
    environment: str,
    user_context: Optional[Dict[str, Any]] = None,
) -> EvaluationDict:
    """
    Evaluate the effective value of a feature flag for a given environment.

    Evaluation order:
    1.  Resolve the FeatureFlag by flag_key               (404 if missing).
    2.  Resolve the Environment by name                   (404 if missing).
    3.  If the flag is globally disabled                  → source="disabled".
    4.  If targeting rules exist AND user_context contains a "username" key:
        a. Walk the rules in id-ascending order.
        b. First matching rule wins → source="targeting_rule", value=True.
        c. Rules exist but none match → continue to Step 4b.
        d. No rules → fall through to step 4b.
    4b. If no targeting rule matched AND rollout_percentage < 100:
        Compute SHA-256 bucket for (username, flag_key).
        bucket < rollout_percentage  → source="percentage_rollout", value=True.
        bucket >= rollout_percentage → source="percentage_rollout", value=False.
    5.  Check for an EnvironmentOverride                  → source="override".
    6.  Fall back to flag.default_value                   → source="default".

    Targeting rules take precedence over percentage rollout, overrides, and
    defaults.  If user_context is None or does not contain a "username" key,
    steps 4–4b are bypassed entirely, preserving full backward compatibility.

    Audit log entries are written for every evaluation path.  Audit
    failures never propagate to the caller.

    Raises:
        HTTPException 404: If the feature flag does not exist.
        HTTPException 404: If the environment does not exist.
        HTTPException 500: If the stored default_value cannot be cast.
    """
    # Step 1 — resolve flag
    db_flag = _get_feature_flag(db, flag_key)

    # Step 2 — resolve environment
    db_env = _get_environment(db, environment)

    # Step 3 — globally disabled flag short-circuits immediately.
    # Targeting rules are irrelevant when the flag is off at the global level.
    if not db_flag.enabled:
        result: EvaluationDict = {
            "flag_key":    db_flag.key,
            "environment": db_env.name,
            "enabled":     False,
            "value":       _cast_default_value(db_flag),
            "source":      "disabled",
            "reason":      "flag_disabled",
        }
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag",
            performed_by=user_context.get("username", "system") if user_context else "system",
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state={
                "key":            db_flag.key,
                "environment":    db_env.name,
                "resolved_value": result["value"],
                "source":         "disabled",
            },
        )
        return result

    # Step 4 — targeting rules (only when a username is provided).
    #
    # Extract the username from user_context if available.  A missing or
    # None user_context — or one that lacks the "username" key — means
    # no user identity is known; targeting rules cannot be applied, so
    # we fall through to the existing override/default logic unchanged.
    username: str | None = (
        user_context.get("username") if user_context else None
    )

    if username:
        rules = _get_targeting_rules(db, db_flag.id)
        targeting_result = _evaluate_targeting_rules(
            db=db,
            flag=db_flag,
            environment_name=db_env.name,
            environment_id=db_env.id,
            rules=rules,
            username=username,
        )
        if targeting_result is not None:
            # A targeting decision was reached — return it immediately.
            # This takes precedence over both overrides and defaults.
            return targeting_result

    # Step 4b — percentage rollout (only when no targeting rule matched).
    #
    # If a username is present, compute its deterministic bucket using
    # SHA-256.  If bucket < rollout_percentage the flag is ON for this user;
    # otherwise it is OFF.  This step is skipped entirely when rollout_percentage
    # is 100 (fully rolled out) to avoid unnecessary computation, and when
    # the flag's rollout_percentage is 0 it is always OFF via this path.
    #
    # Skipped when user_context is absent — falls through to override/default
    # to preserve backward compatibility with callers that do not supply context.
    if username and db_flag.rollout_percentage < 100:
        bucket = _compute_rollout_bucket(username, db_flag.key)
        rollout_enabled = bucket < db_flag.rollout_percentage

        audit_rollout_payload = {
            "key":                db_flag.key,
            "environment":        db_env.name,
            "username":           username,
            "bucket":             bucket,
            "rollout_percentage": db_flag.rollout_percentage,
            "resolved_value":     rollout_enabled,
            "source":             "percentage_rollout",
        }
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag (Percentage Rollout)",
            performed_by=username,
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state=audit_rollout_payload,
        )
        return {
            "flag_key":           db_flag.key,
            "environment":        db_env.name,
            "enabled":            True,
            "value":              rollout_enabled,
            "source":             "percentage_rollout",
            "reason":             "percentage_rollout",
            "bucket":             bucket,
            "rollout_percentage": db_flag.rollout_percentage,
        }

    # Step 5 — environment override
    override = _get_environment_override(db, db_flag.id, db_env.id)

    if override is not None:
        result = {
            "flag_key":    db_flag.key,
            "environment": db_env.name,
            "enabled":     True,
            "value":       override.value,
            "source":      "override",
            "reason":      "environment_override",
        }
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag",
            performed_by=username or "system",
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state={
                "key":            db_flag.key,
                "environment":    db_env.name,
                "resolved_value": override.value,
                "source":         "override",
            },
        )
        return result

    # Step 6 — default value
    resolved_value = _cast_default_value(db_flag)
    result = {
        "flag_key":    db_flag.key,
        "environment": db_env.name,
        "enabled":     True,
        "value":       resolved_value,
        "source":      "default",
        "reason":      "default_value",
    }
    create_audit_log(
        db=db,
        action="Evaluate Feature Flag",
        performed_by=username or "system",
        flag_id=db_flag.id,
        environment_id=db_env.id,
        old_state=None,
        new_state={
            "key":            db_flag.key,
            "environment":    db_env.name,
            "resolved_value": resolved_value,
            "source":         "default",
        },
    )
    return result


# ---------------------------------------------------------------------------
# Enhanced evaluation function — Task 3
# ---------------------------------------------------------------------------

def evaluate_flag_enhanced(
    db: Session,
    flag_key: str,
    environment: str,
    user_id: Optional[str] = None,
    groups: Optional[List[str]] = None,
    user_context: Optional[Dict[str, Any]] = None,
    performed_by: Optional[str] = None,
) -> EvaluationDict:
    """
    Enhanced feature flag evaluation implementing the Task 3 evaluation order.

    Accepts explicit `user_id` and `groups` parameters alongside the legacy
    `user_context` dict.  `user_id`/`groups` take priority; when only
    `user_context` is provided, `user_context["username"]` is used as the
    user identifier so all existing callers remain backward-compatible.

    Evaluation order (Task 3 specification):
    1. Resolve the FeatureFlag by flag_key              (404 if missing).
    2. Check if the flag is globally enabled            → enabled=False, reason="default_value" if not.
    3. Check EnvironmentOverride                        → reason="environment_override".
    4. Check direct user targeting rules                → reason="user_targeting".
    5. Check group targeting rules                      → reason="group_targeting".
    6. Check percentage rollout (SHA-256 bucket)        → reason="percentage_rollout".
    7. Return default value                             → reason="default_value".

    Args:
        db:           SQLAlchemy session.
        flag_key:     Unique key of the feature flag.
        environment:  Name of the environment to evaluate in.
        user_id:      Identifier of the requesting user (targeting + rollout).
        groups:       List of group names the user belongs to (group targeting).
        user_context: Legacy freeform dict; user_context["username"] used as
                      fallback when user_id is not provided.
        performed_by: Username of the authenticated UI user performing this
                      evaluation. Used only for the audit log's performed_by
                      field — has no effect on evaluation logic, targeting,
                      rollout, or API responses.

    Returns:
        EvaluationDict with keys: flag_key, environment, enabled, value,
        source, reason, and optionally bucket + rollout_percentage.

    Raises:
        HTTPException 404: If the feature flag does not exist.
        HTTPException 404: If the environment does not exist.
        HTTPException 500: If the stored default_value cannot be cast.
    """
    # Resolve effective user for targeting and rollout — explicit user_id wins
    # over legacy user_context. This is ONLY used for evaluation logic.
    effective_user: str | None = user_id or (
        user_context.get("username") if user_context else None
    )

    # Resolve audit actor — who to record in the audit log's performed_by.
    # Priority: explicit performed_by > effective_user > "system".
    # "system" is correct for SDK/programmatic callers with no authenticated user.
    audit_actor: str = performed_by or effective_user or "system"

    # Normalise groups — treat None and empty list identically.
    effective_groups: List[str] = groups or []

    # Step 1 — resolve flag
    db_flag = _get_feature_flag(db, flag_key)

    # Step 2 — resolve environment
    db_env = _get_environment(db, environment)

    # Step 2 continued — globally disabled flag short-circuits immediately.
    if not db_flag.enabled:
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag (Enhanced)",
            performed_by=audit_actor,
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state={
                "key":         db_flag.key,
                "environment": db_env.name,
                "reason":      "default_value",
            },
        )
        return {
            "flag_key":    db_flag.key,
            "environment": db_env.name,
            "enabled":     False,
            "value":       _cast_default_value(db_flag),
            "source":      "disabled",
            "reason":      "default_value",
        }

    # Step 3 — environment override (checked before targeting in Task 3 order).
    override = _get_environment_override(db, db_flag.id, db_env.id)

    if override is not None:
        create_audit_log(
            db=db,
            action="Evaluate Feature Flag (Enhanced)",
            performed_by=audit_actor,
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state={
                "key":         db_flag.key,
                "environment": db_env.name,
                "reason":      "environment_override",
                "value":       override.value,
            },
        )
        return {
            "flag_key":    db_flag.key,
            "environment": db_env.name,
            "enabled":     True,
            "value":       override.value,
            "source":      "override",
            "reason":      "environment_override",
        }

    # Steps 4, 5, 6 — targeting and rollout only apply when a user is known.
    if effective_user:
        # Fetch all targeting rules for this flag once (shared by steps 4 and 5).
        rules: List[TargetingRule] = _get_targeting_rules(db, db_flag.id)

        # Step 4 — direct user targeting.
        # Matches when a "user" rule's rule_value exactly equals effective_user.
        for rule in rules:
            if rule.rule_type == "user" and rule.rule_value == effective_user:
                create_audit_log(
                    db=db,
                    action="Evaluate Feature Flag (Enhanced)",
                    performed_by=audit_actor,
                    flag_id=db_flag.id,
                    environment_id=db_env.id,
                    old_state=None,
                    new_state={
                        "key":             db_flag.key,
                        "environment":     db_env.name,
                        "reason":          "user_targeting",
                        "matched_rule_id": rule.id,
                        "matched_user":    effective_user,
                    },
                )
                return {
                    "flag_key":    db_flag.key,
                    "environment": db_env.name,
                    "enabled":     True,
                    "value":       True,
                    "source":      "targeting_rule",
                    "reason":      "user_targeting",
                }

        # Step 5 — group targeting.
        # Matches when a "group" rule's rule_value is in the caller-provided groups list.
        if effective_groups:
            groups_set = set(effective_groups)  # O(1) membership test
            for rule in rules:
                if rule.rule_type == "group" and rule.rule_value in groups_set:
                    create_audit_log(
                        db=db,
                        action="Evaluate Feature Flag (Enhanced)",
                        performed_by=audit_actor,
                        flag_id=db_flag.id,
                        environment_id=db_env.id,
                        old_state=None,
                        new_state={
                            "key":             db_flag.key,
                            "environment":     db_env.name,
                            "reason":          "group_targeting",
                            "matched_rule_id": rule.id,
                            "matched_group":   rule.rule_value,
                            "user_groups":     effective_groups,
                        },
                    )
                    return {
                        "flag_key":    db_flag.key,
                        "environment": db_env.name,
                        "enabled":     True,
                        "value":       True,
                        "source":      "targeting_rule",
                        "reason":      "group_targeting",
                    }

        # Step 6 — percentage rollout.
        bucket = _compute_rollout_bucket(effective_user, db_flag.key)
        rollout_enabled = bucket < db_flag.rollout_percentage

        create_audit_log(
            db=db,
            action="Evaluate Feature Flag (Enhanced)",
            performed_by=audit_actor,
            flag_id=db_flag.id,
            environment_id=db_env.id,
            old_state=None,
            new_state={
                "key":                db_flag.key,
                "environment":        db_env.name,
                "reason":             "percentage_rollout",
                "bucket":             bucket,
                "rollout_percentage": db_flag.rollout_percentage,
                "resolved_value":     rollout_enabled,
            },
        )
        return {
            "flag_key":           db_flag.key,
            "environment":        db_env.name,
            "enabled":            True,
            "value":              rollout_enabled,
            "source":             "percentage_rollout",
            "reason":             "percentage_rollout",
            "bucket":             bucket,
            "rollout_percentage": db_flag.rollout_percentage,
        }

    # Step 7 — default value.
    resolved_value = _cast_default_value(db_flag)
    create_audit_log(
        db=db,
        action="Evaluate Feature Flag (Enhanced)",
        performed_by=audit_actor,
        flag_id=db_flag.id,
        environment_id=db_env.id,
        old_state=None,
        new_state={
            "key":         db_flag.key,
            "environment": db_env.name,
            "reason":      "default_value",
            "value":       resolved_value,
        },
    )
    return {
        "flag_key":    db_flag.key,
        "environment": db_env.name,
        "enabled":     True,
        "value":       resolved_value,
        "source":      "default",
        "reason":      "default_value",
    }


# ---------------------------------------------------------------------------
# Task 4 — cached wrapper around evaluate_flag_enhanced
# ---------------------------------------------------------------------------

def evaluate_flag_cached(
    db: Session,
    flag_key: str,
    environment: str,
    user_id: Optional[str] = None,
    groups: Optional[List[str]] = None,
    user_context: Optional[Dict[str, Any]] = None,
    performed_by: Optional[str] = None,
) -> EvaluationDict:
    """
    Cache-aware entry point for flag evaluation.

    Wraps :func:`evaluate_flag_enhanced` with a Redis read-through cache.
    The evaluation logic itself is **not changed** — this function only
    adds a cache layer on top.

    Cache key format:
        flag:<flag_key>:<user_id>:<environment>

    where <user_id> is the literal string ``anonymous`` when no user is
    supplied (mirrors :func:`app.core.redis.build_cache_key`).

    Evaluation flow:
    1. Build the cache key from (flag_key, user_id, environment).
    2. Check Redis — if a cached result exists, return it immediately
       without touching the database.
    3. On a cache miss, call :func:`evaluate_flag_enhanced` unchanged.
    4. Store the result in Redis with TTL = ``settings.cache_ttl`` seconds.
    5. Return the result.

    Cache errors (Redis unreachable, serialisation problems) are handled
    inside :mod:`app.core.redis` and never propagate here — a failed cache
    read/write falls back to normal database evaluation transparently.

    Args:
        db:           SQLAlchemy session.
        flag_key:     Unique key of the feature flag.
        environment:  Name of the environment to evaluate in.
        user_id:      Identifier of the requesting user (targeting + rollout).
        groups:       List of group names the user belongs to.
        user_context: Legacy freeform dict; ``user_context["username"]``
                      is used as fallback user identifier.
        performed_by: Username of the authenticated UI user performing this
                      evaluation. Used only for the audit log's performed_by
                      field — has no effect on evaluation logic or caching.

    Returns:
        EvaluationDict — identical shape to :func:`evaluate_flag_enhanced`.
    """
    # Resolve the effective user identifier for the cache key.
    # Mirrors the same precedence logic inside evaluate_flag_enhanced so the
    # key is consistent with what would actually be evaluated.
    effective_user_id: Optional[str] = user_id or (
        user_context.get("username") if user_context else None
    )

    # Step 1 — build key
    cache_key = build_cache_key(flag_key, effective_user_id, environment)

    # Step 2 — cache read (Redis first)
    cached = get_cache(cache_key)
    if cached is not None:
        # Cache hit — return immediately, no DB queries needed.
        return cached  # type: ignore[return-value]

    # Step 3 — cache miss: run full evaluation (existing logic, untouched)
    result = evaluate_flag_enhanced(
        db=db,
        flag_key=flag_key,
        environment=environment,
        user_id=user_id,
        groups=groups,
        user_context=user_context,
        performed_by=performed_by,
    )

    # Step 4 — store result in Redis (TTL from settings.cache_ttl, default 300 s)
    set_cache(cache_key, result)

    # Step 5 — return result
    return result
