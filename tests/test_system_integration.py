"""
MindLedger - System Integration Unit Tests
Automated test suite for AutostartManager, SystemTrayApp, multi-threading tracking loop, and graceful shutdown.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import sys
import tempfile
import threading
import time
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image

from database.connection import DatabaseManager
from database.migrations.v001_initial import up
from database.repositories.app_session_repo import AppSessionRepository
from main import tracking_loop, stop_event
from tray_app import SystemTrayApp, create_default_tray_image
from utils.autostart import AutostartManager


@pytest.fixture
def temp_db():
    """Fixture providing temporary SQLite DB manager."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db_mgr = DatabaseManager(db_path=db_path)
    with db_mgr.connection() as conn:
        up(conn)

    yield db_mgr, db_path

    # Teardown
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass


def test_autostart_manager():
    """Test AutostartManager instance methods."""
    manager = AutostartManager(app_name="MindLedgerTestKey")
    assert isinstance(manager.is_enabled(), bool)


def test_system_tray_image():
    """Test default tray image creation."""
    img = create_default_tray_image(64, 64)
    assert isinstance(img, Image.Image)
    assert img.size == (64, 64)
    assert img.mode == "RGBA"


def test_system_tray_app_callbacks():
    """Test SystemTrayApp status updates and toggle callbacks."""
    pause_called = []
    quit_called = []

    def on_pause(paused):
        pause_called.append(paused)

    def on_quit():
        quit_called.append(True)

    app = SystemTrayApp(
        on_quit_callback=on_quit, on_toggle_pause_callback=on_pause
    )
    assert app.is_paused is False

    # Toggle pause
    app._on_toggle_pause(None, None)
    assert app.is_paused is True
    assert len(pause_called) == 1
    assert pause_called[0] is True

    # Test dashboard launch patch
    with patch("webbrowser.open") as mock_open:
        app._on_open_dashboard(None, None)
        mock_open.assert_called_once()

    # Test quit callback
    app._on_quit(None, None)
    assert len(quit_called) == 1


def test_tracking_thread_and_graceful_shutdown(temp_db):
    """Test background tracking loop execution and graceful session shutdown."""
    db_mgr, db_path = temp_db

    mock_window = {
        "app_name": "VSCode.exe",
        "app_path": "C:\\VSCode\\Code.exe",
        "window_title": "main.py - MindLedger",
        "pid": 5678,
    }

    stop_event.clear()

    with patch.object(db_mgr, "db_path", db_path), \
         patch("database.connection.db_manager.db_path", db_path), \
         patch("config.settings.settings.database_path", db_path), \
         patch("config.settings.settings.poll_interval_seconds", 1), \
         patch("core.window_tracker.get_active_window_info", return_value=mock_window):

        thread = threading.Thread(target=tracking_loop, daemon=True)
        thread.start()

        # Allow tracking loop to execute 2 ticks
        time.sleep(1.5)

        # Trigger graceful shutdown
        stop_event.set()
        thread.join(timeout=3.0)
        assert not thread.is_alive()

        # Verify session was persisted in SQLite DB
        with db_mgr.connection() as conn:
            repo = AppSessionRepository(conn)
            sessions = repo.get_by_date(time.strftime("%Y-%m-%d"))
            assert len(sessions) >= 1
            assert sessions[0].app_name == "VSCode.exe"
