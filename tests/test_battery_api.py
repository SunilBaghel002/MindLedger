"""
MindLedger - Battery API Integration Tests
Automated test suite verifying /api/v1/battery/status, /health, /drainers, and /history endpoints.

Author: MindLedger Team
Created: 2026-08-24
"""

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from api.server import app

client = TestClient(app)


def test_get_battery_status_endpoint():
    """Verify GET /api/v1/battery/status returns 200 and valid status payload."""
    response = client.get("/api/v1/battery/status")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["error"] is None

    data = payload["data"]
    assert "percent" in data
    assert "is_plugged" in data
    assert "charging_status" in data
    assert "time_remaining_formatted" in data


def test_get_battery_health_endpoint():
    """Verify GET /api/v1/battery/health returns 200 and hardware metrics."""
    response = client.get("/api/v1/battery/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True

    data = payload["data"]
    assert "current_percentage" in data
    assert "wear_level_percent" in data
    assert "design_capacity_mwh" in data
    assert "full_charge_capacity_mwh" in data


def test_get_battery_drainers_endpoint():
    """Verify GET /api/v1/battery/drainers returns ranked list of high power apps."""
    response = client.get("/api/v1/battery/drainers?limit=5")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True

    data = payload["data"]
    assert "count" in data
    assert "drainers" in data
    assert isinstance(data["drainers"], list)


def test_get_battery_history_endpoint():
    """Verify GET /api/v1/battery/history returns time-series discharge points."""
    response = client.get("/api/v1/battery/history")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True

    data = payload["data"]
    assert "date" in data
    assert "points" in data
    assert len(data["points"]) > 0
    first_pt = data["points"][0]
    assert "percent" in first_pt
    assert "timestamp" in first_pt
