"""
MindLedger - Window Tracker Unit Tests
Automated test suite for platform_utils, IdleDetector, WindowTracker, SessionManager, and EventProcessor.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
import tempfile
import time
from datetime import datetime
from unittest.mock import MagicMock, patch
import pytest

from core.event_processor import EventProcessor
from core.idle_detector import IdleDetector
from core.platform_utils import get_active_window_info, is_linux, is_mac, is_windows
from core.session_manager import SessionManager
from core.window_tracker import WindowTracker
from database.connection import DatabaseManager
from database.migrations.v001_initial import up
from database.repositories.app_session_repo import AppSessionRepository


@pytest.fixture
def temp_db():
    """Fixture providing temporary SQLite DB manager."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db_mgr = DatabaseManager(db_path=db_path)
    with db_mgr.connection() as conn:
        up(conn)

    yield db_mgr

    # Teardown
    import os
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass


def test_platform_utils():
    """Test platform detection utilities and get_active_window_info structure."""
    assert isinstance(is_windows(), bool)
    assert isinstance(is_mac(), bool)
    assert isinstance(is_linux(), bool)

    # get_active_window_info return format check
    info = get_active_window_info()
    if info is not None:
        assert "app_name" in info
        assert "window_title" in info
        assert "pid" in info


def test_idle_detector():
    """Test IdleDetector threshold calculations and touch_activity."""
    # Test active state with high threshold (1 hour)
    detector = IdleDetector(threshold_seconds=3600)
    assert detector.is_idle() is False
    assert detector.get_idle_time_seconds() >= 0.0

    # Test threshold evaluation with small threshold and simulated activity
    detector_small = IdleDetector(threshold_seconds=1)
    detector_small._last_simulated_activity = time.time() - 2.0
    with patch("core.idle_detector.win32api", None):
        assert detector_small.is_idle() is True


def test_window_tracker():
    """Test WindowTracker polling state."""
    tracker = WindowTracker(poll_interval=1)
    assert tracker.is_tracking is False
    assert tracker.poll() is None

    tracker.start()
    assert tracker.is_tracking is True

    # Poll returns dict or None depending on OS handle
    res = tracker.poll()
    if res:
        assert tracker.get_last_window_info() == res

    tracker.stop()
    assert tracker.is_tracking is False


def test_session_manager(temp_db):
    """Test SessionManager lifecycle, app switching, and database persistence."""
    with temp_db.connection() as conn:
        sm = SessionManager(db_conn=conn)

        # Start session 1 (VSCode)
        s1 = sm.start_session(
            app_name="Code.exe",
            app_path="C:\\VSCode\\Code.exe",
            window_title="main.py - MindLedger",
            category="coding",
            productivity="productive",
        )
        assert s1.app_name == "Code.exe"
        assert s1.id is not None
        assert sm.current_session is not None

        # Same window polling -> continues s1
        s1_cont = sm.handle_window_change(
            app_name="Code.exe",
            window_title="main.py - MindLedger",
            category="coding",
            productivity="productive",
        )
        assert s1_cont.id == s1.id

        # App switch -> ends s1 and starts s2 (Chrome)
        s2 = sm.handle_window_change(
            app_name="chrome.exe",
            window_title="GitHub - MindLedger",
            category="browsing",
            productivity="productive",
        )
        assert s2.id != s1.id
        assert s2.app_name == "chrome.exe"

        # End active session
        ended_s2 = sm.end_current_session()
        assert ended_s2 is not None
        assert ended_s2.app_name == "chrome.exe"
        assert sm.current_session is None

        # Verify DB records
        repo = AppSessionRepository(conn)
        sessions = repo.get_by_date(datetime.now().strftime("%Y-%m-%d"))
        assert len(sessions) == 2


def test_event_processor(temp_db):
    """Test EventProcessor tick execution cycle with mocked active window."""
    with temp_db.connection() as conn:
        ep = EventProcessor(db_conn=conn, poll_interval=1, idle_threshold=300)
        ep.start()

        mock_window = {
            "app_name": "pycharm.exe",
            "app_path": "C:\\PyCharm\\pycharm.exe",
            "window_title": "test_window_tracker.py",
            "pid": 1234,
        }

        with patch("core.window_tracker.get_active_window_info", return_value=mock_window):
            res = ep.tick()
            assert res["status"] == "active"
            assert res["app_name"] == "pycharm.exe"

            # Tick again with same window
            res2 = ep.tick()
            assert res2["status"] == "active"

        ep.stop()
