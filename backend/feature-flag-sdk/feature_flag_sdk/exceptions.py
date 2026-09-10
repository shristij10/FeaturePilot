"""
feature_flag_sdk/exceptions.py
-------------------------------
All SDK-specific exception classes.

Every exception the SDK raises is a subclass of ``FeatureFlagSDKError`` so
callers can catch the entire family with a single ``except`` clause while
still being able to handle specific failure modes individually.

Hierarchy
---------
FeatureFlagSDKError                  — base class for all SDK errors
├── NetworkError                     — connection-level failure (no response)
│   └── TimeoutError                 — request exceeded the configured timeout
├── HTTPError                        — server returned a non-2xx status code
│   ├── FlagNotFoundError            — 404: flag key or environment not found
│   └── InvalidRequestError          — 422: request payload failed validation
└── InvalidResponseError             — response arrived but could not be parsed
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class FeatureFlagSDKError(Exception):
    """
    Base class for every exception raised by the Feature Flag SDK.

    Catching this class is sufficient to handle all SDK errors:

        try:
            enabled = client.is_enabled("my_flag", environment="Production")
        except FeatureFlagSDKError as exc:
            logger.warning("Flag evaluation failed: %s", exc)
            enabled = False   # safe fallback
    """


# ---------------------------------------------------------------------------
# Network-level errors  (no HTTP response received)
# ---------------------------------------------------------------------------

class NetworkError(FeatureFlagSDKError):
    """
    Raised when a network-level failure prevents the request from completing.

    This covers DNS resolution failures, refused connections, and any other
    ``requests.ConnectionError`` that occurs before an HTTP response is
    received.  It does *not* cover timeouts (see ``TimeoutError``).
    """


class TimeoutError(NetworkError):
    """
    Raised when the request to the Feature Management System API exceeds the
    configured timeout and no response is received.

    This is a subclass of ``NetworkError`` so callers that only care whether
    the network layer failed can catch either class.
    """


# ---------------------------------------------------------------------------
# HTTP-level errors  (response received, status is non-2xx)
# ---------------------------------------------------------------------------

class HTTPError(FeatureFlagSDKError):
    """
    Raised when the API returns an HTTP error status code (non-2xx).

    Attributes
    ----------
    status_code : int
        The HTTP status code returned by the server (e.g. 500).
    detail : str
        The ``detail`` string extracted from the response body, or a generic
        message when the body cannot be parsed.
    """

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail      = detail
        super().__init__(f"HTTP {status_code}: {detail}")


class FlagNotFoundError(HTTPError):
    """
    Raised when the API returns HTTP 404.

    This happens when either the ``flag_key`` or the ``environment`` name
    passed to ``is_enabled()`` does not match any record in the backend.

    Attributes
    ----------
    status_code : int
        Always ``404``.
    detail : str
        The ``detail`` string from the response body, naming which resource
        was not found.
    """

    def __init__(self, detail: str) -> None:
        super().__init__(status_code=404, detail=detail)


class InvalidRequestError(HTTPError):
    """
    Raised when the API returns HTTP 422 (Unprocessable Entity).

    This indicates that the request payload failed Pydantic validation on the
    server side.  The ``detail`` attribute contains the joined validation
    messages that explain which fields were invalid.

    Attributes
    ----------
    status_code : int
        Always ``422``.
    detail : str
        Joined validation error messages from the FastAPI response body.
    """

    def __init__(self, detail: str) -> None:
        super().__init__(status_code=422, detail=detail)


# ---------------------------------------------------------------------------
# Response parsing errors  (response arrived but is malformed)
# ---------------------------------------------------------------------------

class InvalidResponseError(FeatureFlagSDKError):
    """
    Raised when the API returns HTTP 2xx but the response body cannot be
    parsed or is missing an expected field.

    This should not occur under normal circumstances — it indicates either a
    version mismatch between the SDK and the backend, or a middleware/proxy
    that modified the response.

    Attributes
    ----------
    message : str
        Human-readable description of what was wrong with the response.
    """

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)
