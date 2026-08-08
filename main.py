"""
MindLedger - Main Entry Point & Thread Orchestrator
Main entry point starting background window tracking thread, API server thread, system tray app, and signal handlers.

Author: MindLedger Team
Created: 2026-08-08
"""

import signal
import sys
import threading
import time
from typing import Optional

from api.server import run_api_server_in_thread
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from core.event_processor import EventProcessor
from database.connection import db_manager
from database.migrations.v001_initial import up as run_v001_migration
from database.seed_data import seed_database
from tray_app import SystemTrayApp
from utils.logger import get_logger

logger = get_logger(__name__)

# Global runtime handles
event_processor: Optional[EventProcessor] = None
tray_app: Optional[SystemTrayApp] = None
api_thread: Optional[threading.Thread] = None
stop_event = threading.Event()
pause_event = threading.Event()


def initialize_database() -> None:
    """Run database migrations and seed default configuration."""
    logger.info(f"Initializing database at: {settings.database_path}")
    with db_manager.connection() as conn:
        run_v001_migration(conn)
        seed_database(conn)
    logger.info("Database initialization and seeding completed successfully.")


def tracking_loop() -> None:
    """Background thread loop executing EventProcessor ticks every N seconds."""
    global event_processor
    logger.info("Tracking loop background thread started.")

    with db_manager.connection() as conn:
        event_processor = EventProcessor(db_conn=conn)
        event_processor.start()

        while not stop_event.is_set():
            if not pause_event.is_set():
                try:
                    res = event_processor.tick()
                    if res and tray_app:
                        if res.get("status") == "active":
                            app_title = res.get("app_name", "Active")
                            tray_app.update_status_text(f"Tracking ({app_title})")
                        elif res.get("status") == "idle":
                            tray_app.update_status_text("Idle")
                except Exception as e:
                    logger.error(f"Error in tracking loop tick: {e}", exc_info=True)

            # Sleep poll interval or until stop signal
            stop_event.wait(timeout=settings.poll_interval_seconds)

        # Clean shutdown of tracking engine
        if event_processor:
            event_processor.stop()

    logger.info("Tracking loop background thread terminated cleanly.")


def shutdown(signum: Optional[int] = None, frame: Optional[object] = None) -> None:
    """Gracefully signal stop_event and stop system tray without forcing sys.exit from worker thread."""
    if stop_event.is_set():
        return

    logger.info(f"Initiating graceful shutdown (signal={signum})...")
    stop_event.set()

    if tray_app:
        tray_app.stop()


def main() -> None:
    """Initialize services, start background threads, and launch system tray app."""
    global tray_app, api_thread

    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Host: {settings.app_host}:{settings.app_port}")
    logger.info(f"Database: {settings.database_path}")
    logger.info(
        f"Poll Interval: {settings.poll_interval_seconds}s | Idle Threshold: {settings.idle_threshold_seconds}s"
    )

    # 1. Initialize Database & Seed Rules
    initialize_database()

    # 2. Register Signal Handlers
    try:
        signal.signal(signal.SIGINT, shutdown)
        signal.signal(signal.SIGTERM, shutdown)
    except (ValueError, AttributeError):
        pass  # Non-main thread signal handling fallback

    # 3. Start Background Tracking Thread
    tracking_thread = threading.Thread(
        target=tracking_loop, name="TrackingThread", daemon=True
    )
    tracking_thread.start()

    # 4. Start Background API Server Thread (FastAPI + Uvicorn)
    api_thread = run_api_server_in_thread(
        host=settings.app_host, port=settings.app_port
    )

    # 5. Start System Tray App (Detached)
    tray_app = SystemTrayApp(
        on_quit_callback=shutdown,
        on_toggle_pause_callback=lambda paused: (
            pause_event.set() if paused else pause_event.clear()
        ),
    )
    tray_app.run_detached()

    # 6. Main Thread Sleep Loop (Responsive to SIGINT / Ctrl+C)
    try:
        while not stop_event.is_set():
            time.sleep(0.5)
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received on main thread.")
        shutdown()

    # Final cleanup on main thread
    shutdown()
    logger.info("Graceful shutdown completed successfully.")
    sys.exit(0)


if __name__ == "__main__":
    main()
