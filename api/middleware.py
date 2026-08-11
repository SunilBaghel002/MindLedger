"""
MindLedger - API Middleware
Custom ASGI middleware for performance profiling, process-time header injection, and request logging.

Author: MindLedger Team
Created: 2026-08-11
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from utils.logger import get_logger

logger = get_logger(__name__)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware measuring endpoint request execution latency and injecting X-Process-Time-Ms header."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process incoming HTTP request and record execution duration.

        Args:
            request: FastAPI/Starlette Request instance.
            call_next: Callable to proceed to endpoint handler.

        Returns:
            Response with X-Process-Time-Ms header injected.
        """
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000.0

        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"

        if process_time_ms > 200.0:
            logger.warning(
                f"Slow Request Detected: {request.method} {request.url.path} took {process_time_ms:.2f}ms"
            )

        return response
