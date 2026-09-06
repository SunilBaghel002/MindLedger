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


def test_test_notification_and_dismiss_endpoints():
    """Verify POST /api/v1/water/test-notification triggers reminder and POST /dismiss clears it."""
    # Trigger test notification
    response = client.post("/api/v1/water/test-notification")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["reminder_due"] is True

    # Status reflects reminder_due = True
    status_resp = client.get("/api/v1/water/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["reminder_due"] is True

    # Dismiss reminder
    dismiss_resp = client.post("/api/v1/water/dismiss")
    assert dismiss_resp.status_code == 200
    assert dismiss_resp.json()["data"]["reminder_due"] is False

    # Status reflects reminder_due = False
    status_after = client.get("/api/v1/water/status")
    assert status_after.json()["data"]["reminder_due"] is False


def test_delete_water_log_and_clear_endpoints():
    """Verify DELETE /api/v1/water/logs/{log_id} and DELETE /api/v1/water/logs."""
    # Log two drinks
    r1 = client.post("/api/v1/water/drink", json={"amount_ml": 250, "source": "test"})
    assert r1.status_code == 200
    r2 = client.post("/api/v1/water/drink", json={"amount_ml": 500, "source": "test"})
    assert r2.status_code == 200

    # Fetch logs list
    logs_resp = client.get("/api/v1/water/logs")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()["data"]["logs"]
    assert len(logs) >= 2

    # Delete the latest log
    target_id = logs[0]["id"]
    del_resp = client.delete(f"/api/v1/water/logs/{target_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Clear remaining logs for today
    clear_resp = client.delete("/api/v1/water/logs")
    assert clear_resp.status_code == 200
    assert clear_resp.json()["success"] is True

    # Confirm today's logs are empty
    after_clear_resp = client.get("/api/v1/water/logs")
    assert len(after_clear_resp.json()["data"]["logs"]) == 0


