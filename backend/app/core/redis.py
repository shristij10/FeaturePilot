"""
app/core/redis.py
-----------------
Reusable Redis helper for the Feature Management System.

All cache operations go through this module.  The rest of the codebase
never imports `redis` directly — it calls these helpers instead.

Cache key format
----------------
Every evaluation result is stored under the key:

    flag:<flag_key>:<user_id>:<environment>

where <user_id> is the string  "anonymous"  when no user was supplied.

This makes it trivial to delete every cache entry for one flag:

    SCAN 0 MATCH flag:<flag_key>:*:*  → collect keys → DEL

Redis SCAN is used instead of KEYS to avoid blocking the server on
large keyspaces (KEYS is O(N) and holds the GIL).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Iterator, List, Optional

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection — lazy singleton
# ---------------------------------------------------------------------------

# The connection is created once on first use and reused across requests.
# redis.Redis is thread-safe; a single client instance is fine for FastAPI.
_redis_client: Optional[redis.Redis] = None  # type: ignore[type-arg]


def _get_client() -> redis.Redis:  # type: ignore[type-arg]
    """
    Return (or create) the shared Redis client.

    The client connects lazily on the first command, so startup is not
    blocked if Redis is temporarily unavailable.

    Connection parameters are drawn from app/core/config.py:
        REDIS_HOST  (default: "localhost")
        REDIS_PORT  (default: 6379)
        REDIS_DB    (default: 0)

    decode_responses=True means all values come back as Python str, which
    pairs naturally with json.loads() / json.dumps().
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True,
            socket_connect_timeout=2,   # fail fast on connection problems
            socket_timeout=2,
        )
    return _redis_client


# ---------------------------------------------------------------------------
# Key builder
# ---------------------------------------------------------------------------

def build_cache_key(flag_key: str, user_id: Optional[str], environment: str) -> str:
    """
    Build a deterministic cache key for an evaluation result.

    Format:  flag:<flag_key>:<user_id>:<environment>

    When *user_id* is None or an empty string, the literal token
    ``anonymous`` is used so the key is always well-formed.

    Examples:
        build_cache_key("dark_mode", "alice", "production")
        → "flag:dark_mode:alice:production"

        build_cache_key("dark_mode", None, "staging")
        → "flag:dark_mode:anonymous:staging"
    """
    safe_user = user_id if user_id else "anonymous"
    return f"flag:{flag_key}:{safe_user}:{environment}"


# ---------------------------------------------------------------------------
# Core cache helpers
# ---------------------------------------------------------------------------

def get_cache(key: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a cached evaluation result from Redis.

    Args:
        key: The full cache key (produced by :func:`build_cache_key`).

    Returns:
        The deserialised Python dict when the key exists, or ``None`` on
        a cache miss *or* when Redis is unreachable.

    Cache errors are logged as warnings and swallowed so that a Redis
    outage never breaks the evaluation API — it just degrades to
    always-query mode.
    """
    try:
        raw = _get_client().get(key)
        if raw is None:
            return None
        return json.loads(raw)  # type: ignore[return-value]
    except redis.RedisError as exc:
        logger.warning("Redis GET failed for key %r: %s", key, exc)
        return None
    except json.JSONDecodeError as exc:
        logger.warning("Corrupted cache value for key %r: %s", key, exc)
        return None


def set_cache(key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
    """
    Store an evaluation result in Redis with a TTL.

    Args:
        key:   The full cache key (produced by :func:`build_cache_key`).
        value: The complete EvaluationDict to serialise and store.
        ttl:   Expiry in seconds.  Falls back to ``settings.cache_ttl``
               (default 300) when not supplied.

    Cache errors are logged as warnings and swallowed; a failed write
    means the next request will simply re-evaluate from the database.
    """
    effective_ttl = ttl if ttl is not None else settings.cache_ttl
    try:
        _get_client().setex(key, effective_ttl, json.dumps(value))
    except redis.RedisError as exc:
        logger.warning("Redis SET failed for key %r: %s", key, exc)


def delete_cache(key: str) -> None:
    """
    Delete a single cache entry by its exact key.

    Args:
        key: The full cache key to remove.

    Cache errors are logged and swallowed.
    """
    try:
        _get_client().delete(key)
    except redis.RedisError as exc:
        logger.warning("Redis DELETE failed for key %r: %s", key, exc)


# ---------------------------------------------------------------------------
# Bulk invalidation
# ---------------------------------------------------------------------------

def _scan_keys(pattern: str) -> Iterator[str]:
    """
    Yield all Redis keys matching *pattern* using SCAN.

    SCAN is used instead of KEYS because:
    - KEYS blocks the Redis event loop for the full O(N) scan.
    - SCAN iterates in small batches (cursor-based), keeping Redis responsive.

    The COUNT hint (200) is a suggestion to Redis about batch size; Redis
    may return more or fewer keys per call.
    """
    client = _get_client()
    cursor: int = 0
    while True:
        cursor, keys = client.scan(cursor=cursor, match=pattern, count=200)
        yield from keys
        if cursor == 0:
            break


def delete_flag_cache(flag_key: str) -> int:
    """
    Delete **all** cached evaluation results for a given feature flag.

    This must be called whenever any data that influences flag evaluation
    changes:
        - Feature flag updated (any field, including rollout_percentage)
        - Environment override created / updated / deleted
        - Targeting rule created / deleted

    Uses Redis SCAN to find every key matching  ``flag:<flag_key>:*``
    without blocking the server.  Collected keys are deleted in a single
    pipeline call for efficiency.

    Args:
        flag_key: The unique ``key`` field of the FeatureFlag model
                  (e.g. ``"dark_mode"``).

    Returns:
        The number of cache keys that were deleted.

    Cache errors are logged and swallowed; a failed invalidation means
    stale data may be served until the TTL expires — acceptable behaviour
    since the alternative (raising) would break write operations.
    """
    pattern = f"flag:{flag_key}:*"
    try:
        keys: List[str] = list(_scan_keys(pattern))
        if not keys:
            return 0
        # Pipeline batches all DEL commands into one round-trip.
        pipe = _get_client().pipeline(transaction=False)
        for key in keys:
            pipe.delete(key)
        pipe.execute()
        logger.debug(
            "Invalidated %d cache entries for flag %r (pattern: %r)",
            len(keys),
            flag_key,
            pattern,
        )
        return len(keys)
    except redis.RedisError as exc:
        logger.warning(
            "Redis cache invalidation failed for flag %r: %s", flag_key, exc
        )
        return 0
