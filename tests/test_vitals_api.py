"""
MindLedger - Dashboard Vitals API Unit Tests
Automated test suite for GET /api/v1/dashboard/vitals telemetry endpoint.

Author: MindLedger Team
Created: 2026-08-24
"""

import os
import tempfile
from datetime import datetime
from unittest.mock import MagicMock, patch
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

    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass


def test_get_dashboard_vitals_success(temp_db):
    """Test GET /api/v1/dashboard/vitals returns 200 and standard envelope with vitals fields."""
    db_mgr, _ = temp_db

    with patch("api.routes.dashboard_routes.db_manager", db_mgr):
        response = client.get("/api/v1/dashboard/vitals")
        assert response.status_code == 200

        payload = response.json()
        assert payload["success"] is True
        assert payload["error"] is None

        data = payload["data"]
        assert "is_tracking" in data
        assert "current_app" in data
        assert "active_session_seconds" in data
        assert "screen_time_today_seconds" in data
        assert "productivity_score" in data
        assert "battery" in data
        assert "memory" in data
        assert "hydration" in data
        assert "limits_warning" in data

        # Check battery sub-payload
        battery = data["battery"]
        assert "percent" in battery
        assert "power_plugged" in battery
        assert "status_text" in battery

        # Check memory sub-payload
        memory = data["memory"]
        assert "used_gb" in memory
        assert "total_gb" in memory
        assert "percent" in memory


def test_get_dashboard_vitals_with_active_session(temp_db):
    """Test GET /api/v1/dashboard/vitals correctly surfaces latest active session."""
    db_mgr, _ = temp_db

    now = datetime.now()
    session = AppSession(
        id=None,
        app_name="Visual Studio Code",
        window_title="MindLedger - main.py",
        started_at=now,
        ended_at=None,
        duration_seconds=350,
        is_foreground=True,
        category="Development",
        subcategory="Coding",
        productivity="productive",
        date=now.strftime("%Y-%m-%d"),
    )

    with db_mgr.connection() as conn:
        repo = AppSessionRepository(conn)
        repo.save(session)

    with patch("api.routes.dashboard_routes.db_manager", db_mgr):
        with patch("api.routes.dashboard_routes.IdleDetector.is_idle", return_value=False):
            response = client.get("/api/v1/dashboard/vitals")
            assert response.status_code == 200

            payload = response.json()
            assert payload["success"] is True
            data = payload["data"]
            assert data["is_tracking"] is True
            assert data["current_app"] == "Visual Studio Code"
            assert data["active_session_seconds"] == 350
