"""
MindLedger - API Server
FastAPI application setup, CORS configuration, and background Uvicorn ASGI server runner.

Author: MindLedger Team
Created: 2026-08-08
"""

import threading
from typing import Optional

from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.middleware import PerformanceMiddleware
from api.routes.browser_routes import router as browser_router
from api.routes.category_routes import router as category_router
from api.routes.data_routes import router as data_router
from api.routes.dashboard_routes import page_router, router as dashboard_router
from api.routes.process_routes import router as process_router
from api.routes.battery_routes import router as battery_router
from api.routes.limit_routes import router as limit_router
from api.routes.water_routes import router as water_router
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

    app.add_middleware(PerformanceMiddleware)

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
    app.include_router(process_router)
    app.include_router(battery_router)
    app.include_router(limit_router)
    app.include_router(water_router)
    app.include_router(browser_router)
    app.include_router(category_router)
    app.include_router(data_router)
    app.include_router(page_router)


    # Mount Static Files for Dashboard UI (React dist assets & static fallback)
    dist_dir = Path(__file__).resolve().parent.parent / "dashboard" / "dist"
    static_dir = Path(__file__).resolve().parent.parent / "dashboard" / "static"

    if (dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="dist_assets")
        app.mount("/dashboard/assets", StaticFiles(directory=str(dist_dir / "assets")), name="dashboard_assets")

    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

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
