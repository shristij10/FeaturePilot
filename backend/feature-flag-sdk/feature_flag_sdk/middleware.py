"""
feature_flag_sdk/middleware.py
------------------------------
ASGI middleware that injects a ``FeatureFlagClient`` into every request.

Supported frameworks
--------------------
FastAPI / Starlette
    ``FeatureFlagMiddleware`` is a standard ``BaseHTTPMiddleware`` subclass.
    It works with any Starlette-compatible application.

Architecture
------------
One ``FeatureFlagClient`` instance is created when the middleware is
instantiated (at application start-up time) and shared across all requests.
This is intentional:

* The client holds a single ``requests.Session`` with a persistent connection
  pool — reusing it across requests avoids the overhead of a TCP handshake
  on every flag evaluation.
* The in-process ``FlagCache`` is shared, so a result fetched for the first
  request that evaluates ``"dark_mode"`` is reused by every subsequent
  request within the cache TTL.  Without sharing, each request would cold-
  start its own cache and never benefit from prior evaluations.
* ``FeatureFlagClient`` is thread-safe: its cache uses a ``threading.Lock``
  and ``requests.Session`` is safe to call from multiple threads.

Request state
-------------
The client is attached to ``request.state.flag_client`` before the route
handler runs.  Route handlers and dependencies access it like this:

    from fastapi import Request

    @app.get("/dashboard")
    def dashboard(request: Request):
        if request.state.flag_client.is_enabled("dark_mode"):
            ...

Example: registering the middleware
------------------------------------

    # main.py
    from fastapi import FastAPI
    from feature_flag_sdk.middleware import FeatureFlagMiddleware
    from feature_flag_sdk.config import SDKConfig

    app = FastAPI()

    # Option 1 — use environment variables (FLAG_API_URL, API_KEY, CACHE_TTL)
    app.add_middleware(FeatureFlagMiddleware)

    # Option 2 — supply an explicit SDKConfig
    app.add_middleware(
        FeatureFlagMiddleware,
        config=SDKConfig(
            flag_api_url="https://flags.example.com",
            api_key="my-api-key",
            cache_ttl=120,
        ),
    )

    # Option 3 — bring your own pre-built FeatureFlagClient
    from feature_flag_sdk.client import FeatureFlagClient
    client = FeatureFlagClient(config=SDKConfig(cache_ttl=60))
    app.add_middleware(FeatureFlagMiddleware, client=client)


Example: using the client inside a route
-----------------------------------------

    from fastapi import FastAPI, Request

    app = FastAPI()
    app.add_middleware(FeatureFlagMiddleware)

    @app.get("/")
    def root(request: Request):
        dark = request.state.flag_client.is_enabled(
            "dark_mode",
            environment="Production",
        )
        return {"dark_mode": dark}


Example: using the client inside a FastAPI Dependency
------------------------------------------------------

    from fastapi import Depends, Request
    from feature_flag_sdk.client import FeatureFlagClient

    def get_flag_client(request: Request) -> FeatureFlagClient:
        \"\"\"Dependency that exposes the flag client injected by the middleware.\"\"\"
        return request.state.flag_client

    @app.get("/feature")
    def feature_route(
        flag_client: FeatureFlagClient = Depends(get_flag_client),
    ):
        return {"enabled": flag_client.is_enabled("my_feature")}
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from feature_flag_sdk.client import FeatureFlagClient
from feature_flag_sdk.config import SDKConfig

if TYPE_CHECKING:
    # Used only for type hints — not imported at runtime to avoid a hard
    # dependency on the caller's installed packages.
    from collections.abc import Awaitable, Callable


class FeatureFlagMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that injects a ``FeatureFlagClient`` into every request.

    The client is created **once** at middleware instantiation (i.e. at
    application start-up) and reused for every request.  This means the
    in-process ``FlagCache`` is shared across all concurrent requests, giving
    the cache its full benefit.

    The client is available to route handlers as::

        request.state.flag_client

    Parameters
    ----------
    app : ASGIApp
        The inner ASGI application.  Supplied automatically by FastAPI /
        Starlette when you call ``app.add_middleware()``.
    config : SDKConfig, optional
        SDK configuration.  When omitted, a fresh ``SDKConfig()`` is
        constructed, which reads ``FLAG_API_URL``, ``API_KEY``, and
        ``CACHE_TTL`` from environment variables.
        Ignored when ``client`` is supplied explicitly.
    client : FeatureFlagClient, optional
        A pre-built ``FeatureFlagClient`` to use for every request.
        Takes precedence over ``config`` when both are provided.
        Use this when you need fine-grained control over the client (e.g.
        injecting a custom session or cache in tests).

    Examples
    --------
    Minimal — reads configuration from environment variables:

        app.add_middleware(FeatureFlagMiddleware)

    With explicit configuration:

        app.add_middleware(
            FeatureFlagMiddleware,
            config=SDKConfig(flag_api_url="https://flags.example.com"),
        )

    With a pre-built client (useful in tests):

        app.add_middleware(FeatureFlagMiddleware, client=my_client)
    """

    def __init__(
        self,
        app:    ASGIApp,
        config: SDKConfig          | None = None,
        client: FeatureFlagClient  | None = None,
    ) -> None:
        super().__init__(app)

        # If a ready-made client is provided use it directly.
        # Otherwise build one from the supplied (or default) config.
        # The client is stored as an instance attribute so it lives for
        # the entire lifetime of the middleware — one client, all requests.
        if client is not None:
            self._client = client
        else:
            effective_config = config if config is not None else SDKConfig()
            self._client = FeatureFlagClient(config=effective_config)

    async def dispatch(
        self,
        request: Request,
        call_next: "Callable[[Request], Awaitable[Response]]",
    ) -> Response:
        """
        Attach the shared ``FeatureFlagClient`` to the request state, then
        pass control to the next middleware or route handler.

        This method runs for **every** HTTP request.  It performs a single
        attribute assignment (``O(1)``) before yielding to the next layer,
        adding negligible overhead.

        Parameters
        ----------
        request : Request
            The incoming Starlette / FastAPI ``Request`` object.
        call_next : Callable
            The next layer in the ASGI middleware stack.  Must be awaited to
            produce the ``Response``.

        Returns
        -------
        Response
            The response returned by the inner application.
        """
        # Attach the shared client to per-request state.
        # request.state is a plain namespace object that is isolated per
        # request, so this assignment is safe under concurrent requests
        # even though the client itself is shared.
        request.state.flag_client = self._client

        # Always call the next layer — this middleware never short-circuits
        # the request pipeline.
        return await call_next(request)
