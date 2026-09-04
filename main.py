"""
MindLedger - Main Entry Point & Thread Orchestrator
Main entry point starting background window tracking thread, API server thread, system tray app, and signal handlers.

Author: MindLedger Team
Created: 2026-08-08
"""

import io
import signal
import sys
import threading
import time
from typing import Optional

# Safe streams for windowed / no-console environments (console=False in PyInstaller)
class SafeStream(io.StringIO):
    """Fallback stream preventing crashes when sys.stdout or sys.stderr is None in GUI mode."""

    def write(self, s: str) -> int:
        return len(s) if s else 0

    def flush(self) -> None:
        pass

    def isatty(self) -> bool:
        return False


if sys.stdout is None:
    sys.stdout = SafeStream()
if sys.stderr is None:
    sys.stderr = SafeStream()

from api.server import run_api_server_in_thread
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from core.event_processor import EventProcessor
from database.connection import db_manager
from database.migrations.v001_initial import up as run_v001_migration
from database.migrations.v002_performance_indexes import up as run_v002_migration
from database.repositories.app_session_repo import repair_runaway_sessions
from database.seed_data import seed_database
from tray_app import SystemTrayApp, open_native_desktop_window, close_native_desktop_window

from utils.logger import get_logger

logger = get_logger(__name__)

import socket

# Global runtime handles
event_processor: Optional[EventProcessor] = None
tray_app: Optional[SystemTrayApp] = None
api_thread: Optional[threading.Thread] = None
stop_event = threading.Event()
pause_event = threading.Event()
_instance_lock_socket: Optional[socket.socket] = None



def ensure_single_instance() -> Optional[socket.socket]:
    """Ensure only one instance of MindLedger runs at a time using a localhost socket lock."""
    global _instance_lock_socket
    _instance_lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        _instance_lock_socket.bind(("127.0.0.1", 8788))
    except socket.error:
        logger.info("Another instance of MindLedger is already running. Signaling it to restore native window.")
        signaled = False
        try:
            import urllib.request
            req = urllib.request.Request(
                f"http://{settings.app_host}:{settings.app_port}/api/v1/system/show-window",
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    signaled = True
                    logger.info("Successfully signaled running MindLedger instance to restore native window.")
        except Exception as e:
            logger.debug(f"Could not signal running instance via API: {e}")

        if not signaled:
            # Fallback to standalone app mode window if API was not immediately reachable
            try:
                from tray_app import launch_app_window
                launch_app_window(f"http://{settings.app_host}:{settings.app_port}/dashboard")
            except Exception as e:
                logger.error(f"Fallback launch failed: {e}")

        sys.exit(0)
    return _instance_lock_socket



def initialize_database() -> None:
    """Run database migrations and seed default configuration."""
    logger.info(f"Initializing database at: {settings.database_path}")
    with db_manager.connection() as conn:
        run_v001_migration(conn)
        run_v002_migration(conn)
        seed_database(conn)
        repair_runaway_sessions(conn)
    logger.info("Database initialization, seeding, and session sanity checks completed successfully.")





def tracking_loop() -> None:
    """Background thread loop executing EventProcessor ticks every N seconds."""
    global event_processor
    logger.info("Tracking loop background thread started.")

    from core.hydration_scheduler import hydration_scheduler

    with db_manager.connection() as conn:
        event_processor = EventProcessor(db_conn=conn)
        event_processor.start()

        last_hydration_tick = time.time()

        while not stop_event.is_set():
            if not pause_event.is_set():
                try:
                    res = event_processor.tick()

                    # Smart Hydration Countdown Tick & Desktop Push Notification
                    now_ts = time.time()
                    elapsed_tick = now_ts - last_hydration_tick
                    last_hydration_tick = now_ts

                    is_user_active = bool(res and res.get("status") == "active")
                    active_app = (res.get("app_name") or "") if res else ""
                    is_deep_coding = any(k in active_app.lower() for k in ["code", "antigravity", "pycharm", "cursor", "sublime", "studio"])

                    reminder_event = hydration_scheduler.tick(
                        elapsed_wall_clock=elapsed_tick,
                        is_user_active=is_user_active,
                        is_deep_work=is_deep_coding,
                    )
                    # Reminder events are now handled by the frontend overlay
                    # The hydration_scheduler tracks reminder_due state internally
                    # and the dashboard polls /api/v1/water/status to show the overlay

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
    close_native_desktop_window()

    if tray_app:
        tray_app.stop()


def wait_for_api_server(host: str, port: int, timeout: float = 6.0) -> bool:
    """Wait for API server to become responsive before launching desktop window."""
    import urllib.request

    start = time.time()
    endpoints = [
        f"http://{host}:{port}/api/v1/system/status",
        f"http://{host}:{port}/api/v1/water/status",
        f"http://{host}:{port}/dashboard",
    ]
    while time.time() - start < timeout:
        for url in endpoints:
            try:
                with urllib.request.urlopen(url, timeout=0.5) as resp:
                    if resp.status == 200:
                        logger.info(f"API server is ready at {url} (took {time.time() - start:.2f}s)")
                        return True
            except Exception:
                pass
        time.sleep(0.1)
    logger.warning("Timed out waiting for API server readiness. Proceeding with window launch.")
    return False


def main() -> None:
    """Initialize services, start background threads, and launch system tray app."""
    global tray_app, api_thread

    ensure_single_instance()

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

    # Wait for API server to bind socket and respond
    wait_for_api_server(settings.app_host, settings.app_port)

    # 5. Start System Tray App (Detached)
    tray_app = SystemTrayApp(
        on_quit_callback=shutdown,
        on_toggle_pause_callback=lambda paused: (
            pause_event.set() if paused else pause_event.clear()
        ),
    )

    tray_app.run_detached()

    # 6. Open Standalone Native Desktop Application Window (Main Thread GUI Loop)
    open_native_desktop_window()

    # Main Thread Wait Loop if GUI Window is closed
    try:
        while not stop_event.is_set():
            time.sleep(0.5)
    except KeyboardInterrupt:
        shutdown()

    # Final cleanup on main thread
    shutdown()
    tracking_thread.join()
    logger.info("Graceful shutdown completed successfully.")
    sys.exit(0)




if __name__ == "__main__":
    main()
