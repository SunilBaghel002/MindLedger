"""
MindLedger - Limit API Integration Tests
Automated test suite verifying GET, POST, PUT, DELETE, and /snooze for /api/v1/limits endpoints.

Author: MindLedger Team
Created: 2026-08-24
"""

from fastapi.testclient import TestClient

from api.server import app

client = TestClient(app)


def test_limit_crud_flow():
    """Verify complete CRUD lifecycle for an app limit rule."""
    # 1. Create Limit
    create_payload = {
        "target_type": "app",
        "target_identifier": "test_game.exe",
        "display_name": "Test Game",
        "daily_limit_minutes": 45,
        "is_hard_block": True,
    }
    create_res = client.post("/api/v1/limits", json=create_payload)
    assert create_res.status_code in (200, 201)
    limit_data = create_res.json()["data"]
    limit_id = limit_data["id"]
    assert limit_data["display_name"] == "Test Game"
    assert limit_data["daily_limit_minutes"] == 45
    assert limit_data["is_hard_block"] is True

    # 2. Get All Limits
    get_res = client.get("/api/v1/limits")
    assert get_res.status_code == 200
    limits_list = get_res.json()["data"]["limits"]
    assert any(l["id"] == limit_id for l in limits_list)

    # 3. Update Limit
    update_res = client.put(f"/api/v1/limits/{limit_id}", json={"daily_limit_minutes": 50})
    assert update_res.status_code == 200
    assert update_res.json()["data"]["daily_limit_minutes"] == 50

    # 4. Snooze Limit
    snooze_res = client.post(f"/api/v1/limits/{limit_id}/snooze")
    assert snooze_res.status_code == 200
    snooze_data = snooze_res.json()["data"]
    assert snooze_data["snoozes_used"] == 1
    assert snooze_data["effective_limit_minutes"] == 55  # 50 + 5

    # 5. Delete Limit
    delete_res = client.delete(f"/api/v1/limits/{limit_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["data"]["deleted"] is True
