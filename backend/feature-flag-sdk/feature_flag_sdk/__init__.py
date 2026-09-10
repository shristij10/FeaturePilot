"""
feature_flag_sdk
----------------
Python SDK for the Feature Management System.

Public API
----------
    from feature_flag_sdk import FeatureFlagClient

    client = FeatureFlagClient()
    enabled = client.is_enabled("dark_mode", environment="Production")
"""

from feature_flag_sdk.cache      import CacheKey, FlagCache
from feature_flag_sdk.client     import FeatureFlagClient
from feature_flag_sdk.config     import SDKConfig, settings
from feature_flag_sdk.exceptions import (
    FeatureFlagSDKError,
    FlagNotFoundError,
    HTTPError,
    InvalidRequestError,
    InvalidResponseError,
    NetworkError,
    TimeoutError,
)
from feature_flag_sdk.middleware import FeatureFlagMiddleware

__all__ = [
    # Client
    "FeatureFlagClient",
    # Middleware
    "FeatureFlagMiddleware",
    # Cache
    "FlagCache",
    "CacheKey",
    # Configuration
    "SDKConfig",
    "settings",
    # Exceptions
    "FeatureFlagSDKError",
    "NetworkError",
    "TimeoutError",
    "HTTPError",
    "FlagNotFoundError",
    "InvalidRequestError",
    "InvalidResponseError",
]
