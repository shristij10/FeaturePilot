"""
feature_flag_sdk/cache.py
-------------------------
Thread-safe, TTL-based in-process cache for flag evaluation results.

Design
------
The cache stores a single boolean per (flag_key, environment, user_id, groups)
combination.  An entry expires when ``time.monotonic()`` passes its recorded
deadline.  Expired entries are evicted lazily on the next access to the same
key; a periodic full sweep also removes any other stale entries at that point.

Thread safety
-------------
All mutations (get, set, get_stale, invalidate, clear) are protected by a
single ``threading.Lock``.  The lock is held for the minimum time necessary
— only the dictionary look-up / write, never the HTTP call that follows a
miss.

Cache key
---------
The key is a plain Python tuple:

    (flag_key, environment, user_id, groups_tuple)

``groups`` (a list) is converted to a sorted, frozen tuple before being
included in the key so that ``["beta", "alpha"]`` and ``["alpha", "beta"]``
hash to the same entry.  ``None`` is preserved as-is.

    CacheKey = tuple[str, str, str | None, tuple[str, ...] | None]

TTL
---
TTL is supplied per-store call so the cache is config-agnostic and fully
testable without environment variables.  The ``FeatureFlagClient`` passes
``self._config.cache_ttl`` on every store.  A TTL of ``0`` effectively
disables caching (every entry expires immediately).

Stale reads
-----------
``get_stale(key)`` returns the last stored value for a key *regardless of
whether it has expired*.  The client uses this during fallback: when the
backend fails, the most recently observed value is a better default than a
hard-coded ``False``.  The entry is **not** evicted by ``get_stale`` — it
remains in the store so a future successful backend call can overwrite it
with a fresh value.

Usage (internal — called by FeatureFlagClient)
------
    from feature_flag_sdk.cache import FlagCache

    cache = FlagCache()
    key   = cache.make_key("dark_mode", "Production", "alice", ["beta"])

    hit = cache.get(key)            # returns bool | None  (respects TTL)
    if hit is None:
        result = ...                # call backend
        cache.set(key, result, ttl=300)

    stale = cache.get_stale(key)    # returns bool | None  (ignores TTL)

    cache.invalidate(key)           # remove one entry
    cache.clear()                   # remove all entries
    size = cache.size()             # total entries in backing dict
"""

from __future__ import annotations

import threading
import time
from typing import NamedTuple


# ---------------------------------------------------------------------------
# Cache key type
# ---------------------------------------------------------------------------

class CacheKey(NamedTuple):
    """
    Immutable, hashable identifier for a single cache entry.

    Fields
    ------
    flag_key : str
        The unique key of the feature flag (e.g. ``"dark_mode"``).
    environment : str
        The name of the evaluation environment (e.g. ``"Production"``).
    user_id : str | None
        The requesting user's identifier, or ``None`` when anonymous.
    groups : tuple[str, ...] | None
        A **sorted** tuple of group names the user belongs to, or ``None``
        when no groups were supplied.  Sorting ensures that
        ``["beta", "alpha"]`` and ``["alpha", "beta"]`` resolve to the same
        cache entry.
    """

    flag_key:    str
    environment: str
    user_id:     str | None
    groups:      tuple[str, ...] | None


# ---------------------------------------------------------------------------
# Internal entry
# ---------------------------------------------------------------------------

class _Entry(NamedTuple):
    """
    A single value stored in the cache dict alongside its expiry timestamp.

    Fields
    ------
    value : bool
        The cached evaluation result.
    expires_at : float
        ``time.monotonic()`` value at which this entry becomes stale.
        Once ``time.monotonic() >= expires_at`` the entry is considered
        expired and must not be returned by ``get()``.
        ``get_stale()`` ignores this field and always returns ``value``.
    """

    value:      bool
    expires_at: float


# ---------------------------------------------------------------------------
# FlagCache
# ---------------------------------------------------------------------------

class FlagCache:
    """
    Thread-safe, TTL-based in-process cache for ``bool`` flag results.

    One ``FlagCache`` instance is created per ``FeatureFlagClient`` and
    lives for the lifetime of that client.  It is never shared across
    client instances.

    Normal flow (cache hit / miss)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ``get()`` respects TTL — it returns ``None`` for expired or absent keys.
    The client calls the backend on a ``None`` return, then stores the fresh
    result with ``set()``.

    Fallback flow (backend failure)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ``get_stale()`` ignores TTL — it returns the last stored value for a key
    even after it has expired.  The client uses this when the backend raises
    a transient error: returning a slightly stale value is far safer than
    returning a hard-coded default.  The stale entry is *not* evicted by
    ``get_stale()`` so a subsequent successful backend call can overwrite it.

    Thread safety
    -------------
    A single ``threading.Lock`` serialises all reads and writes.  The lock
    is never held while performing I/O.
    """

    def __init__(self) -> None:
        # _store maps CacheKey → _Entry
        self._store: dict[CacheKey, _Entry] = {}
        self._lock  = threading.Lock()

    # ------------------------------------------------------------------
    # Key construction
    # ------------------------------------------------------------------

    @staticmethod
    def make_key(
        flag_key:    str,
        environment: str,
        user_id:     str | None,
        groups:      list[str] | None,
    ) -> CacheKey:
        """
        Build a ``CacheKey`` from the four dimensions of an evaluation call.

        ``groups`` is normalised to a **sorted tuple** so callers do not
        need to worry about list ordering.  ``None`` is preserved to
        distinguish "no groups provided" from "empty groups list".

        Parameters
        ----------
        flag_key : str
            The feature flag key (e.g. ``"dark_mode"``).
        environment : str
            The evaluation environment name (e.g. ``"Production"``).
        user_id : str | None
            The requesting user's identifier, or ``None`` for anonymous.
        groups : list[str] | None
            The user's group memberships.  An empty list ``[]`` is treated
            the same as ``None`` (normalised to ``None``) because both mean
            "the caller provided no group information".

        Returns
        -------
        CacheKey
            An immutable, hashable tuple ready to use as a dict key.
        """
        # Normalise groups: None and [] both become None; otherwise sort
        if not groups:  # covers None and []
            groups_key: tuple[str, ...] | None = None
        else:
            groups_key = tuple(sorted(groups))

        return CacheKey(
            flag_key=flag_key,
            environment=environment,
            user_id=user_id,
            groups=groups_key,
        )

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def get(self, key: CacheKey) -> bool | None:
        """
        Return the cached boolean for *key*, or ``None`` on a miss / expiry.

        A cache miss is signalled by returning ``None`` rather than raising
        an exception so the caller can use a concise ``if result is None:``
        pattern without a try/except.

        Expired entries are **not** deleted by this method.  They are left in
        the store so that :meth:`get_stale` can still read the last known
        value if the backend fails.  An opportunistic full sweep of the store
        is performed on every miss so that entries for *other* keys are still
        evicted over time, keeping memory bounded.

        .. note::
            Callers that need the last known value regardless of TTL should
            use :meth:`get_stale` instead.

        Parameters
        ----------
        key : CacheKey
            The key produced by :meth:`make_key`.

        Returns
        -------
        bool | None
            The cached value if present and unexpired, or ``None`` if absent
            or expired.
        """
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)

            if entry is not None:
                if now < entry.expires_at:
                    # Valid hit — return immediately without any eviction
                    return entry.value
                # Expired — fall through to return None.
                # Do NOT delete the entry here; get_stale() must still be
                # able to read it as a last-known-good value for fallback.

            # Opportunistic sweep: evict entries for *other* keys that have
            # also expired.  Skips the requested key (handled above).
            # Done only on a miss so the hot path (cache hit) is unaffected.
            self._evict_expired_except(now, key)
            return None

    def get_stale(self, key: CacheKey) -> bool | None:
        """
        Return the last stored boolean for *key*, **ignoring TTL expiry**.

        Unlike :meth:`get`, this method never evicts the entry it reads —
        the value remains in the store so that a future successful backend
        call can overwrite it with a fresher result.

        This is the "last known good value" read used during fallback:
        when the backend is unreachable, returning a slightly outdated flag
        state is safer than returning a hard-coded default.

        Returns ``None`` only when the key has *never* been stored in this
        cache instance (i.e. there is no historical value at all).

        Parameters
        ----------
        key : CacheKey
            The key produced by :meth:`make_key`.

        Returns
        -------
        bool | None
            The last stored value for *key* (expired or not), or ``None``
            if the key has never been written.
        """
        with self._lock:
            entry = self._store.get(key)
            return entry.value if entry is not None else None

    def set(self, key: CacheKey, value: bool, ttl: int) -> None:
        """
        Store *value* under *key* with a TTL of *ttl* seconds.

        If an entry already exists for *key* it is overwritten unconditionally
        so that a fresh backend response always supersedes a stale one.

        A TTL of ``0`` stores an entry that expires immediately — effectively
        disabling the cache for that key while still going through the normal
        code path.  The entry is still readable by :meth:`get_stale` after
        expiry, so fallback still benefits from the last known value even
        when the caller has disabled TTL-based caching.

        Parameters
        ----------
        key : CacheKey
            The key produced by :meth:`make_key`.
        value : bool
            The evaluation result to cache.
        ttl : int
            Seconds until this entry expires.  Must be >= 0.
        """
        expires_at = time.monotonic() + max(0, ttl)
        with self._lock:
            self._store[key] = _Entry(value=value, expires_at=expires_at)

    def invalidate(self, key: CacheKey) -> None:
        """
        Remove the cache entry for *key* if it exists.

        This is a no-op when *key* is not present.  Useful in tests that
        need to force a backend call for a specific flag without clearing the
        entire cache.

        Parameters
        ----------
        key : CacheKey
            The key to remove.
        """
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        """
        Remove all cache entries regardless of their expiry time.

        Use this when the underlying flag configuration is known to have
        changed (e.g. in integration tests, or after a deployment event).
        After ``clear()``, :meth:`get_stale` will also return ``None`` for
        all keys because no historical values remain.
        """
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        """
        Return the number of entries currently in the cache store.

        This count includes entries that have expired but have not yet been
        evicted by :meth:`get` (lazy eviction).  Primarily useful for tests
        and diagnostics.

        Returns
        -------
        int
            Total number of entries (expired + unexpired) in the backing dict.
        """
        with self._lock:
            return len(self._store)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _evict_expired_except(self, now: float, exclude: CacheKey | None = None) -> None:
        """
        Remove all expired entries from ``_store``, optionally skipping one key.

        **Must be called while the lock is already held.**

        The *exclude* key is never deleted even if its entry has expired.
        This preserves the last-known-good value for :meth:`get_stale` so
        that fallback can read it after :meth:`get` returns ``None``.

        Building a list of keys first and deleting in a second pass avoids
        modifying the dict while iterating over it.

        Parameters
        ----------
        now : float
            The current ``time.monotonic()`` value.
        exclude : CacheKey | None
            Key to skip during eviction.  Pass ``None`` to evict all expired
            entries without exception (used by :meth:`clear` indirectly, and
            available for future maintenance sweeps).
        """
        expired_keys = [
            k for k, e in self._store.items()
            if now >= e.expires_at and k != exclude
        ]
        for k in expired_keys:
            del self._store[k]
