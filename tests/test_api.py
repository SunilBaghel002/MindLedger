"""
MindLedger - API Unit & Integration Tests
Automated test suite for FastAPI endpoints: /health, /dashboard/today, and /apps/today.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import tempfile
from datetime import datetime
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from api.server import app
from database.connection import DatabaseManager
from database.migrations.v001_initial import up
from database.models import AppSession
from database.repositories.app_session_repo import AppSessionRepository

client = TestClient(app)


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


def test_health_endpoint():
    """Test GET /api/v1/health returns success envelope and health payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ok"
    assert payload["data"]["app"] == "MindLedger"
    assert payload["error"] is None


def test_get_dashboard_today(temp_db):
    """Test GET /api/v1/dashboard/today overview calculation."""
    db_mgr, db_path = temp_db

    with db_mgr.connection() as conn:
        repo = AppSessionRepository(conn)
        now = datetime.now()
        repo.save(
            AppSession(
                app_name="Code.exe",
                window_title="main.py - MindLedger",
                started_at=now,
                duration_seconds=300,
                is_foreground=True,
                category="coding",
                productivity="productive",
                date=now.strftime("%Y-%m-%d"),
            )
        )

    with patch.object(db_mgr, "db_path", db_path), \
         patch("database.connection.db_manager.db_path", db_path):
        response = client.get("/api/v1/dashboard/today")
        assert response.status_code == 200

        payload = response.json()
        assert payload["success"] is True

        data = payload["data"]
        assert data["total_screen_time_seconds"] == 300
        assert data["productive_time_seconds"] == 300
        assert data["productivity_score"] == 100.0
        assert len(data["top_apps"]) == 1
        assert data["top_apps"][0]["app_name"] == "Code.exe"


def test_get_apps_today(temp_db):
    """Test GET /api/v1/apps/today app usage list."""
    db_mgr, db_path = temp_db

    with db_mgr.connection() as conn:
        repo = AppSessionRepository(conn)
        now = datetime.now()
        repo.save(
            AppSession(
                app_name="chrome.exe",
                window_title="StackOverflow",
                started_at=now,
                duration_seconds=150,
                is_foreground=True,
                category="learning",
                productivity="productive",
                date=now.strftime("%Y-%m-%d"),
            )
        )

    with patch.object(db_mgr, "db_path", db_path), \
         patch("database.connection.db_manager.db_path", db_path):
        response = client.get("/api/v1/apps/today")
        assert response.status_code == 200

        payload = response.json()
        assert payload["success"] is True

        data = payload["data"]
        assert data["total_sessions_count"] == 1
        assert data["total_screen_time_seconds"] == 150
        assert len(data["top_apps"]) == 1
        assert data["top_apps"][0]["app_name"] == "chrome.exe"
        assert len(data["recent_sessions"]) == 1
        assert data["recent_sessions"][0]["app_name"] == "chrome.exe"


def test_show_window_endpoint():
    """Test POST and GET /api/v1/system/show-window endpoint triggers native window restore."""
    with patch("tray_app.show_native_desktop_window", return_value=True):
        resp_post = client.post("/api/v1/system/show-window")
        assert resp_post.status_code == 200
        data = resp_post.json()
        assert data["success"] is True
        assert data["data"]["restored"] is True

        resp_get = client.get("/api/v1/system/show-window")
        assert resp_get.status_code == 200
        assert resp_get.json()["success"] is True

