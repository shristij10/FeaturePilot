"""
feature_flag_sdk/config.py
--------------------------
SDK configuration loaded from environment variables.

Environment variables (all optional — defaults are listed below):

    FLAG_API_URL   Base URL of the Feature Management System API.
                   Default: "http://127.0.0.1:8000"

    API_KEY        Optional API key sent as the X-API-Key request header.
                   Default: "" (empty — header is omitted when blank)

    CACHE_TTL      How many seconds to keep a flag evaluation result in the
                   local in-process cache before re-fetching.
                   Default: 300 (5 minutes)

Usage
-----
Import the ready-made singleton anywhere inside the SDK:

    from feature_flag_sdk.config import settings

    print(settings.flag_api_url)   # "http://127.0.0.1:8000"
    print(settings.cache_ttl)      # 300

You can also construct a custom SDKConfig for testing or multi-tenant use:

    from feature_flag_sdk.config import SDKConfig

    custom = SDKConfig(flag_api_url="https://my-fms.example.com", cache_ttl=60)
"""

from __future__ import annotations

import os


# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

_DEFAULT_FLAG_API_URL = "http://127.0.0.1:8000"
_DEFAULT_API_KEY      = ""
_DEFAULT_CACHE_TTL    = 300   # seconds


# ---------------------------------------------------------------------------
# SDKConfig
# ---------------------------------------------------------------------------

class SDKConfig:
    """
    Immutable configuration object for the Feature Flag SDK.

    Parameters are read from environment variables when the singleton
    ``settings`` is created at import time.  Pass explicit values to the
    constructor when you need a custom configuration (e.g. in tests or when
    running multiple SDK instances against different environments).

    Attributes
    ----------
    flag_api_url : str
        Base URL of the Feature Management System API, without a trailing
        slash.  Sourced from the ``FLAG_API_URL`` environment variable.

    api_key : str
        Optional API key included as the ``X-API-Key`` header on every
        request.  An empty string means the header is not sent.
        Sourced from the ``API_KEY`` environment variable.

    cache_ttl : int
        Time-to-live in seconds for cached flag evaluation results.
        Must be a non-negative integer.
        Sourced from the ``CACHE_TTL`` environment variable.
    """

    def __init__(
        self,
        flag_api_url: str | None = None,
        api_key: str | None = None,
        cache_ttl: int | None = None,
    ) -> None:
        # FLAG_API_URL — strip any trailing slash so URL joining is consistent
        raw_url = (
            flag_api_url
            if flag_api_url is not None
            else os.getenv("FLAG_API_URL", _DEFAULT_FLAG_API_URL)
        )
        self.flag_api_url: str = raw_url.rstrip("/")

        # API_KEY — empty string means "no key configured"
        self.api_key: str = (
            api_key
            if api_key is not None
            else os.getenv("API_KEY", _DEFAULT_API_KEY)
        )

        # CACHE_TTL — parse to int, clamp to >= 0 so negative values are safe
        if cache_ttl is not None:
            ttl_value = cache_ttl
        else:
            raw_ttl = os.getenv("CACHE_TTL", str(_DEFAULT_CACHE_TTL))
            try:
                ttl_value = int(raw_ttl)
            except ValueError:
                # Unparseable env var — fall back to the default
                ttl_value = _DEFAULT_CACHE_TTL

        self.cache_ttl: int = max(0, ttl_value)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def has_api_key(self) -> bool:
        """Return True when an API key is configured (non-empty string)."""
        return bool(self.api_key)

    def __repr__(self) -> str:
        # Mask all but the first 4 characters of the key for safe logging.
        masked_key = (
            self.api_key[:4] + "****"
            if len(self.api_key) > 4
            else ("****" if self.api_key else "<not set>")
        )
        return (
            f"SDKConfig("
            f"flag_api_url={self.flag_api_url!r}, "
            f"api_key={masked_key!r}, "
            f"cache_ttl={self.cache_ttl})"
        )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
# Evaluated once at import time using whatever environment variables are set.
# Re-import or construct a new SDKConfig instance if you need different values.

settings = SDKConfig()
