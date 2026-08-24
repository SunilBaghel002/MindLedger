"""
MindLedger - Water API Integration Tests
Automated test suite verifying GET /api/v1/water/status, POST /drink, POST /snooze, and GET /history.

Author: MindLedger Team
Created: 2026-08-24
"""

from fastapi.testclient import TestClient

from api.server import app

client = TestClient(app)


def test_get_water_status_endpoint():
    """Verify GET /api/v1/water/status returns standard structure with goal progress."""
    response = client.get("/api/v1/water/status")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["error"] is None

    data = payload["data"]
    assert "today_intake_ml" in data
    assert "daily_goal_ml" in data
    assert "glasses_drank" in data
    assert "target_glasses" in data
    assert "next_reminder_formatted" in data


def test_log_water_drink_endpoint():
    """Verify POST /api/v1/water/drink increments daily intake."""
    response = client.post(
        "/api/v1/water/drink",
        json={"amount_ml": 250, "source": "dashboard_widget"},
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["today_intake_ml"] >= 250
    assert payload["data"]["glasses_drank"] >= 1


def test_snooze_water_endpoint():
    """Verify POST /api/v1/water/snooze extends reminder countdown."""
    response = client.post(
        "/api/v1/water/snooze",
        json={"minutes": 10},
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["snoozed_minutes"] == 10


def test_get_water_history_endpoint():
    """Verify GET /api/v1/water/history returns recent intake points."""
    response = client.get("/api/v1/water/history?days=7")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert "days_logged" in payload["data"]
    assert isinstance(payload["data"]["history"], list)
