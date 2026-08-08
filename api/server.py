"""
MindLedger - API Server
FastAPI application setup, CORS configuration, and background Uvicorn ASGI server runner.

Author: MindLedger Team
Created: 2026-08-08
"""

import threading
from typing import Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.dashboard_routes import router as dashboard_router
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)


def create_app() -> FastAPI:
    """Instantiate and configure the FastAPI application.

    Returns:
        Configured FastAPI instance with local CORS middleware and routers mounted.
    """
    app = FastAPI(
        title=APP_NAME,
        version=APP_VERSION,
        description="MindLedger Personal Wellbeing Analytics API",
        docs_url="/docs",
        redoc_url=None,
    )

    # Privacy & Security: Localhost CORS ONLY
    allowed_origins = [
        "http://127.0.0.1",
        "http://localhost",
        f"http://127.0.0.1:{settings.app_port}",
        f"http://localhost:{settings.app_port}",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=r"http://(127\.0\.0\.1|localhost)(:\d+)?",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Mount Route Modules
    app.include_router(dashboard_router)

    return app


# Singleton FastAPI app instance
app = create_app()


def run_api_server(host: Optional[str] = None, port: Optional[int] = None) -> None:
    """Programmatically start the Uvicorn ASGI server.

    Args:
        host: Host binding IP. Defaults to settings.app_host.
        port: Port number. Defaults to settings.app_port.
    """
    bind_host = host or settings.app_host
    bind_port = port or settings.app_port

    logger.info(f"Starting Uvicorn API server on http://{bind_host}:{bind_port}")
    uvicorn.run(
        app,
        host=bind_host,
        port=bind_port,
        log_level=settings.log_level.lower(),
        access_log=False,
    )


def run_api_server_in_thread(
    host: Optional[str] = None, port: Optional[int] = None
) -> threading.Thread:
    """Launch the Uvicorn API server in a dedicated background daemon thread.

    Args:
        host: Host binding IP.
        port: Port number.

    Returns:
        The started daemon threading.Thread instance.
    """
    thread = threading.Thread(
        target=run_api_server,
        args=(host, port),
        name="APIServerThread",
        daemon=True,
    )
    thread.start()
    logger.info("API server thread launched.")
    return thread
