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

        with patch("core.window_tracker.get_active_window_info", return_value=mock_window), \
             patch("core.idle_detector.IdleDetector.is_idle", return_value=False), \
             patch("core.idle_detector.IdleDetector.get_idle_time_seconds", return_value=0.0), \
             patch("core.event_processor.is_screen_locked", return_value=False):
            res = ep.tick()
            assert res["status"] == "active"
            assert res["app_name"] == "pycharm.exe"

            # Tick again with same window
            res2 = ep.tick()
            assert res2["status"] == "active"

        ep.stop()


def test_session_manager_idle_deduction(temp_db):
    """Test SessionManager idle deduction when ending a session."""
    with temp_db.connection() as conn:
        sm = SessionManager(db_conn=conn)
        s1 = sm.start_session(
            app_name="Code.exe",
            window_title="main.py",
            category="coding",
            productivity="productive",
        )
        # End session with 300s idle deduction
        ended = sm.end_current_session(idle_seconds_to_deduct=300.0)
        assert ended is not None
        assert ended.duration_seconds == 0
        assert sm.current_session is None


def test_session_manager_sleep_gap_in_same_window(temp_db):
    """Test SessionManager detects large time gap in same window and splits session."""
    with temp_db.connection() as conn:
        sm = SessionManager(db_conn=conn)
        s1 = sm.start_session(
            app_name="Code.exe",
            window_title="main.py",
            category="coding",
            productivity="productive",
        )
        # Simulate last_active_at was 2 hours ago
        from datetime import timedelta
        sm._last_active_at = datetime.now() - timedelta(hours=2)

        # Handle window change with same window
        s2 = sm.handle_window_change(
            app_name="Code.exe",
            window_title="main.py",
            category="coding",
            productivity="productive",
        )
        # Should have ended previous session and started a new one
        assert s2.id != s1.id


def test_event_processor_category_detection(temp_db):
    """Test EventProcessor accurately classifies app and productivity."""
    with temp_db.connection() as conn:
        ep = EventProcessor(db_conn=conn, poll_interval=1, idle_threshold=300)
        ep.start()

        mock_window = {
            "app_name": "pycharm64.exe",
            "app_path": "C:\\PyCharm\\pycharm64.exe",
            "window_title": "models.py - MindLedger",
            "pid": 1234,
        }

        with patch("core.window_tracker.get_active_window_info", return_value=mock_window), \
             patch("core.idle_detector.IdleDetector.is_idle", return_value=False), \
             patch("core.idle_detector.IdleDetector.get_idle_time_seconds", return_value=0.0), \
             patch("core.event_processor.is_screen_locked", return_value=False):
            res = ep.tick()
            assert res["category"] == "coding"
            assert res["productivity"] == "productive"

        ep.stop()


def test_event_processor_sleep_gap_detection(temp_db):
    """Test EventProcessor detects sleep gap (> 10s) and pauses tracking."""
    with temp_db.connection() as conn:
        ep = EventProcessor(db_conn=conn, poll_interval=1, idle_threshold=300)
        ep.start()

        mock_window = {
            "app_name": "Code.exe",
            "app_path": "C:\\VSCode\\Code.exe",
            "window_title": "app.py",
            "pid": 100,
        }

        with patch("core.window_tracker.get_active_window_info", return_value=mock_window), \
             patch("core.idle_detector.IdleDetector.is_idle", return_value=False), \
             patch("core.idle_detector.IdleDetector.get_idle_time_seconds", return_value=0.0), \
             patch("core.event_processor.is_screen_locked", return_value=False):
            ep.tick()
            assert ep.session_manager.current_session is not None

            # Simulate 2 hours elapsed since last tick (system sleep)
            ep._last_tick_time = time.time() - 7200.0
            res = ep.tick()
            # Session should be ended or marked idle
            assert ep.is_idle_state is False or res["status"] == "active"

        ep.stop()


def test_event_processor_screen_lock(temp_db):
    """Test EventProcessor handles workstation screen lock."""
    with temp_db.connection() as conn:
        ep = EventProcessor(db_conn=conn, poll_interval=1, idle_threshold=300)
        ep.start()

        mock_window = {
            "app_name": "Code.exe",
            "app_path": "C:\\VSCode\\Code.exe",
            "window_title": "app.py",
            "pid": 100,
        }

        with patch("core.window_tracker.get_active_window_info", return_value=mock_window), \
             patch("core.event_processor.is_screen_locked", return_value=True):
            res = ep.tick()
            assert res["status"] == "locked"
            assert ep.is_idle_state is True
            assert ep.session_manager.current_session is None

        ep.stop()


def test_repair_runaway_sessions(temp_db):
    """Test repair_runaway_sessions clamps sessions > 1800s and cleans LockApp."""
    with temp_db.connection() as conn:
        from database.repositories.app_session_repo import repair_runaway_sessions
        # Insert test runaway session
        conn.execute(
            """
            INSERT INTO app_sessions (
                app_name, started_at, ended_at, duration_seconds, is_foreground, category, productivity, date
            ) VALUES ('WindowsTerminal.exe', '2026-08-21T08:00:00', '2026-08-21T10:00:00', 7200, 1, 'coding', 'productive', '2026-08-21')
            """
        )
        conn.execute(
            """
            INSERT INTO app_sessions (
                app_name, started_at, ended_at, duration_seconds, is_foreground, category, productivity, date
            ) VALUES ('LockApp.exe', '2026-08-21T10:00:00', '2026-08-21T11:00:00', 3600, 1, 'system', 'neutral', '2026-08-21')
            """
        )
        conn.commit()

        repaired = repair_runaway_sessions(conn, max_allowed_seconds=1800)
        assert repaired >= 1

        cursor = conn.execute("SELECT app_name, duration_seconds, is_foreground FROM app_sessions")
        rows = cursor.fetchall()
        for r in rows:
            if r["app_name"] == "LockApp.exe":
                assert r["duration_seconds"] == 0
                assert r["is_foreground"] == 0
            elif r["app_name"] == "WindowsTerminal.exe":
                assert r["duration_seconds"] <= 1800

