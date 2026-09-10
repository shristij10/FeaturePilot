"""
feature_flag_sdk/client.py
--------------------------
Main entry point for the Feature Flag SDK.

The ``FeatureFlagClient`` class wraps the ``POST /flags/evaluate`` endpoint
exposed by the Feature Management System backend and returns a plain boolean
so application code never has to parse HTTP responses directly.

Quick start
-----------
    from feature_flag_sdk.client import FeatureFlagClient

    client = FeatureFlagClient()

    if client.is_enabled("dark_mode", environment="Production"):
        render_dark_ui()

Custom configuration
--------------------
    from feature_flag_sdk.config import SDKConfig
    from feature_flag_sdk.client import FeatureFlagClient

    cfg    = SDKConfig(flag_api_url="https://my-fms.example.com", cache_ttl=60)
    client = FeatureFlagClient(config=cfg)

Caching
-------
Results are cached in-process using a TTL taken from ``config.cache_ttl``
(default 300 s).  A cache hit returns immediately without an HTTP call.
Set ``cache_ttl=0`` to disable TTL-based caching; the last stored value is
still readable for fallback purposes via ``get_stale()``.

Fallback handling
-----------------
When the backend request fails due to a **transient** error — a timeout,
network failure, or any HTTP error — ``is_enabled()`` does not propagate the
exception.  Instead it applies a two-stage fallback:

  1. **Stale cache** — if the flag was successfully evaluated at least once
     before (even if that cached value has since expired), that last known
     value is returned.  Returning a slightly outdated flag state is almost
     always safer than returning a hard-coded default.

  2. **Caller-supplied default** — if no historical value exists in the cache
     at all, the value passed as ``default`` (itself defaulting to ``False``)
     is returned.

Errors that are *not* fallback candidates (``FlagNotFoundError``,
``InvalidRequestError``) are always re-raised because they indicate a mistake
in the caller's arguments, not a transient infrastructure problem.

    # Fallback in action
    client = FeatureFlagClient()
    enabled = client.is_enabled("dark_mode", default=False)
    # → False if backend is down and flag was never seen before
    # → last cached value if backend is down but flag was seen before

Error handling (explicit)
--------------------------
To opt out of fallback for a specific call and handle errors yourself,
catch ``FeatureFlagSDKError`` after the call — but note that fallback is
applied *before* any exception can escape, so you would need to disable it
by not using the ``default`` mechanism.  In the current design fallback is
always active for transient failures.  ``FlagNotFoundError`` and
``InvalidRequestError`` are always propagated and can be caught normally:

    from feature_flag_sdk.exceptions import FlagNotFoundError

    try:
        enabled = client.is_enabled("my_flag")
    except FlagNotFoundError:
        # flag key doesn't exist — fix the call site
        enabled = False
"""

from __future__ import annotations

import requests

from feature_flag_sdk.cache      import CacheKey, FlagCache
from feature_flag_sdk.config     import SDKConfig, settings as _default_settings
from feature_flag_sdk.exceptions import (
    FlagNotFoundError,
    HTTPError,
    InvalidRequestError,
    InvalidResponseError,
    NetworkError,
    TimeoutError,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Endpoint path — appended to SDKConfig.flag_api_url
_EVALUATE_PATH = "/flags/evaluate"

# Default request timeout in seconds (connect + read).
# The caller can override this via the `timeout` constructor parameter.
_DEFAULT_TIMEOUT: float = 5.0


# ---------------------------------------------------------------------------
# FeatureFlagClient
# ---------------------------------------------------------------------------

class FeatureFlagClient:
    """
    HTTP client for evaluating feature flags against the Feature Management
    System backend.

    Parameters
    ----------
    config : SDKConfig, optional
        Configuration object that supplies ``flag_api_url``, ``api_key``, and
        ``cache_ttl``.  Defaults to the module-level ``settings`` singleton
        which reads from environment variables.
    timeout : float, optional
        Number of seconds to wait for the server to respond before raising
        ``TimeoutError``.  Applies to both the connection and the read phase.
        Defaults to ``5.0`` seconds.
    session : requests.Session, optional
        A pre-configured ``requests.Session`` to use for all HTTP calls.
        Providing your own session is useful for injecting test doubles or
        sharing connection pools across multiple client instances.
        When ``None`` (the default) a fresh session is created internally.
    cache : FlagCache, optional
        An existing ``FlagCache`` instance.  Supply one in tests to inspect
        or pre-seed the cache without relying on environment variables.
        When ``None`` (the default) a fresh, empty cache is created.

    Examples
    --------
    Default — reads FLAG_API_URL, API_KEY, CACHE_TTL from the environment:

        client = FeatureFlagClient()

    Custom configuration:

        from feature_flag_sdk.config import SDKConfig
        client = FeatureFlagClient(config=SDKConfig(cache_ttl=60))

    Injected session (e.g. for testing):

        import requests
        session = requests.Session()
        client  = FeatureFlagClient(session=session)

    Injected cache (e.g. for testing):

        from feature_flag_sdk.cache import FlagCache
        cache  = FlagCache()
        client = FeatureFlagClient(cache=cache)
    """

    def __init__(
        self,
        config:  SDKConfig             | None = None,
        timeout: float                        = _DEFAULT_TIMEOUT,
        session: requests.Session      | None = None,
        cache:   FlagCache             | None = None,
    ) -> None:
        self._config  = config  if config  is not None else _default_settings
        self._timeout = timeout
        self._session = session if session is not None else requests.Session()
        self._cache   = cache   if cache   is not None else FlagCache()

        # Build the fixed headers once — avoids rebuilding on every call.
        # The Content-Type header is always required; X-API-Key is conditional.
        self._base_headers: dict[str, str] = {
            "Content-Type": "application/json",
            "Accept":        "application/json",
        }
        if self._config.has_api_key:
            self._base_headers["X-API-Key"] = self._config.api_key

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def is_enabled(
        self,
        flag_key:     str,
        environment:  str              = "Production",
        user_id:      str | None       = None,
        groups:       list[str] | None = None,
        user_context: dict      | None = None,
        default:      bool             = False,
    ) -> bool:
        """
        Evaluate a feature flag and return whether it is enabled.

        Normal flow
        ~~~~~~~~~~~
        1. A ``CacheKey`` is built from ``flag_key``, ``environment``,
           ``user_id``, and ``groups``.  ``user_context`` is intentionally
           excluded from the key (it is freeform backend context, not a
           structural evaluation dimension).
        2. If a valid (unexpired) entry exists in the in-process cache the
           cached boolean is returned immediately; **no HTTP call is made**.
        3. On a cache miss the backend is called, the result is stored in the
           cache with TTL = ``config.cache_ttl``, and the result is returned.

        Fallback flow (transient backend failures)
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        When a ``NetworkError``, ``TimeoutError``, ``HTTPError``, or
        ``InvalidResponseError`` is raised by the HTTP layer, ``is_enabled``
        does **not** propagate the exception.  Instead it applies a two-stage
        fallback in order:

        1. **Stale cache** — ``cache.get_stale(key)`` is called.  It returns
           the last stored value for this key regardless of TTL expiry.  If a
           value is found it is returned immediately.  This is preferred over
           the hard-coded default because it reflects the last successfully
           observed state of the flag.

        2. **Caller default** — if no historical value exists in the cache
           (the flag has never been evaluated successfully on this client
           instance), ``default`` is returned.

        Errors that are **never** caught by fallback
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ``FlagNotFoundError`` and ``InvalidRequestError`` indicate mistakes in
        the caller's arguments (wrong flag key, wrong environment name, invalid
        payload).  These are always re-raised so the caller can fix the bug
        rather than silently receiving a default value.

        Parameters
        ----------
        flag_key : str
            The unique key of the feature flag to evaluate.
            Must match the pattern ``^[a-z0-9_]+$`` (lowercase alphanumeric
            and underscores only, e.g. ``"dark_mode"``).
        environment : str, optional
            Name of the environment to evaluate the flag in.
            Defaults to ``"Production"``.
        user_id : str | None, optional
            Identifier of the requesting user.  Used for user-level targeting
            rules and percentage rollout bucketing.  Also forms part of the
            cache key so different users never share an evaluation result.
        groups : list[str] | None, optional
            Group names the requesting user belongs to.  Used for group-level
            targeting rules.  The list is sorted before being used as a cache
            key so ordering does not matter.
        user_context : dict | None, optional
            Arbitrary freeform context dictionary passed to the backend.
            Legacy field kept for backward compatibility.  ``user_id`` and
            ``groups`` take priority when both are provided.
            Not included in the cache key.
        default : bool, optional
            Value to return when the backend call fails **and** no stale cache
            entry exists for this key.  Defaults to ``False`` (safe off
            state).  Pass ``True`` if the flag should be treated as enabled
            when the system is degraded (e.g. a feature that is on by default
            and should only be turned off explicitly).

        Returns
        -------
        bool
            * The fresh evaluation result from the backend (normal path).
            * The last cached value if the backend fails and a stale entry
              exists (fallback stage 1).
            * ``default`` if the backend fails and no stale entry exists
              (fallback stage 2).

        Raises
        ------
        FlagNotFoundError
            The backend returned HTTP 404 — the flag key or environment name
            does not exist.  **Always propagated; never caught by fallback.**
        InvalidRequestError
            The backend returned HTTP 422 — the request payload failed
            server-side validation.  **Always propagated; never caught by
            fallback.**
        """
        # --- Step 1: build cache key ---
        cache_key = FlagCache.make_key(flag_key, environment, user_id, groups)

        # --- Step 2: check for a valid (unexpired) cache hit ---
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        # --- Step 3: cache miss — call backend with fallback protection ---
        return self._call_with_fallback(
            cache_key=cache_key,
            flag_key=flag_key,
            environment=environment,
            user_id=user_id,
            groups=groups,
            user_context=user_context,
            default=default,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _call_with_fallback(
        self,
        cache_key:   CacheKey,
        flag_key:    str,
        environment: str,
        user_id:     str | None,
        groups:      list[str] | None,
        user_context:dict      | None,
        default:     bool,
    ) -> bool:
        """
        Attempt a backend call and apply two-stage fallback on failure.

        This method encapsulates the fallback logic so that ``is_enabled``
        stays readable.  It is the only place in the SDK that catches
        transient errors.

        Fallback hierarchy
        ------------------
        1. Try the backend call (``_post`` + ``_parse_enabled``).
        2. If a *transient* error occurs:
           a. Check ``cache.get_stale(cache_key)`` — return last known value
              if one exists.
           b. Otherwise return ``default``.
        3. If a *permanent* error occurs (``FlagNotFoundError``,
           ``InvalidRequestError``) re-raise immediately — do not fall back.

        Transient errors caught:
            ``NetworkError`` (includes ``TimeoutError``), ``HTTPError``,
            ``InvalidResponseError``.

        Why ``InvalidResponseError`` is treated as transient
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        A malformed response from a normally-healthy endpoint most often
        indicates a momentary proxy issue or a rolling deployment in progress.
        Treating it as transient (i.e. falling back) prevents a single bad
        response from permanently disabling a flag for the lifetime of the
        process.

        Parameters
        ----------
        cache_key : CacheKey
            Pre-built key used for the stale-cache read.
        flag_key, environment, user_id, groups, user_context
            Forwarded verbatim to ``_build_payload``.
        default : bool
            Hard-coded fallback value used when stale cache is also empty.

        Returns
        -------
        bool
            Backend result, stale cached value, or ``default``.

        Raises
        ------
        FlagNotFoundError
            Re-raised without fallback.
        InvalidRequestError
            Re-raised without fallback.
        """
        payload = self._build_payload(flag_key, environment, user_id, groups, user_context)

        try:
            response = self._post(payload)
            result   = self._parse_enabled(response)

        except (FlagNotFoundError, InvalidRequestError):
            # Permanent caller errors — always propagate, never fall back.
            raise

        except (NetworkError, HTTPError, InvalidResponseError):
            # Transient infrastructure failure — apply two-stage fallback.
            #
            # Stage 1: return the last known value from the cache, even if
            # it has expired.  This is preferred over the hard default because
            # it reflects the most recently observed state of the flag.
            stale = self._cache.get_stale(cache_key)
            if stale is not None:
                return stale

            # Stage 2: no historical value — return the caller-supplied default.
            return default

        # Happy path — store fresh result in cache and return it.
        self._cache.set(cache_key, result, ttl=self._config.cache_ttl)
        return result

    def _build_payload(
        self,
        flag_key:     str,
        environment:  str,
        user_id:      str | None,
        groups:       list[str] | None,
        user_context: dict      | None,
    ) -> dict:
        """
        Build the JSON-serialisable request body for ``POST /flags/evaluate``.

        Only non-None optional fields are included so the backend's Pydantic
        schema uses its own defaults for omitted fields rather than receiving
        explicit ``null`` values that might fail ``min_length`` validators.
        """
        body: dict = {
            "flag_key":    flag_key,
            "environment": environment,
        }

        # Include optional fields only when the caller provided them.
        # Sending explicit null would trigger Pydantic's min_length=1 check on
        # user_id, so we omit the key entirely when the value is None.
        if user_id is not None:
            body["user_id"] = user_id

        if groups is not None:
            body["groups"] = groups

        if user_context is not None:
            body["user_context"] = user_context

        return body

    def _post(self, payload: dict) -> requests.Response:
        """
        Send the POST request and return the raw ``requests.Response``.

        Translates ``requests`` exceptions into SDK exceptions so callers never
        have to import ``requests`` themselves.

        Raises
        ------
        TimeoutError
            Wraps ``requests.Timeout``.
        NetworkError
            Wraps ``requests.ConnectionError`` and the base
            ``requests.RequestException``.
        """
        url = self._config.flag_api_url + _EVALUATE_PATH

        try:
            response = self._session.post(
                url,
                json=payload,
                headers=self._base_headers,
                timeout=self._timeout,
            )
        except requests.Timeout as exc:
            raise TimeoutError(
                f"Request to {url!r} timed out after {self._timeout}s."
            ) from exc
        except requests.ConnectionError as exc:
            raise NetworkError(
                f"Could not connect to {url!r}: {exc}"
            ) from exc
        except requests.RequestException as exc:
            # Catch-all for any other requests-level failure
            raise NetworkError(
                f"Request to {url!r} failed: {exc}"
            ) from exc

        self._raise_for_status(response)
        return response

    @staticmethod
    def _raise_for_status(response: requests.Response) -> None:
        """
        Inspect the HTTP status code and raise the appropriate SDK exception
        for non-2xx responses.

        FastAPI error responses follow two shapes:
        - 404 / 4xx  → ``{"detail": "<string>"}``
        - 422        → ``{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}``

        Raises
        ------
        FlagNotFoundError    HTTP 404
        InvalidRequestError  HTTP 422
        HTTPError            Any other non-2xx status
        """
        if response.ok:  # 2xx
            return

        # Try to extract a human-readable detail from the response body.
        detail: str
        try:
            body = response.json()
            raw  = body.get("detail", "")
            if isinstance(raw, list):
                # 422 Pydantic validation errors — join the msg strings
                detail = " | ".join(
                    item.get("msg", str(item)) for item in raw
                )
            else:
                detail = str(raw) if raw else response.text
        except Exception:
            detail = response.text or f"HTTP {response.status_code}"

        if response.status_code == 404:
            raise FlagNotFoundError(detail)

        if response.status_code == 422:
            raise InvalidRequestError(detail)

        raise HTTPError(status_code=response.status_code, detail=detail)

    @staticmethod
    def _parse_enabled(response: requests.Response) -> bool:
        """
        Parse the JSON response body and extract the ``enabled`` boolean.

        The backend always includes ``enabled`` in a successful evaluation
        response.  If the field is absent or the body is not valid JSON, an
        ``InvalidResponseError`` is raised.

        Raises
        ------
        InvalidResponseError
            The body is not valid JSON, or ``enabled`` is missing.
        """
        try:
            body = response.json()
        except ValueError as exc:
            raise InvalidResponseError(
                f"Response body is not valid JSON: {response.text!r}"
            ) from exc

        if "enabled" not in body:
            raise InvalidResponseError(
                f"Response JSON is missing the 'enabled' field: {body!r}"
            )

        return bool(body["enabled"])
