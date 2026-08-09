"""
MindLedger - Category API & Reclassification Integration Tests
Test suite verifying CRUD endpoints for category rules and historical reclassification functionality.

Author: MindLedger Team
Created: 2026-08-09
"""

import sqlite3
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from api.server import app
from config.constants import (
    CATEGORY_CODING,
    CATEGORY_ENTERTAINMENT,
    CATEGORY_UNCATEGORIZED,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_UNPRODUCTIVE,
)
from config.settings import settings
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as migrate_v001
from database.models import AppSession, BrowserSession, YouTubeActivity
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.youtube_repo import YouTubeRepository
from database.seed_data import seed_database


@pytest.fixture
def test_client(tmp_path, monkeypatch):
    """Fixture initializing temporary SQLite database and FastAPI TestClient."""
    db_file = tmp_path / "test_mindledger.db"
    db_path = str(db_file)

    monkeypatch.setattr(settings, "database_path", db_path)
    db_mgr = DatabaseManager(db_path)

    with db_mgr.connection() as conn:
        migrate_v001(conn)
        seed_database(conn)

    client = TestClient(app)
    yield client, db_mgr


def test_get_categories_endpoint(test_client):
    """Test GET /api/v1/categories endpoint."""
    client, _ = test_client

    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert "rules" in payload["data"]
    assert payload["data"]["count"] > 0


def test_get_categories_by_type_filter(test_client):
    """Test GET /api/v1/categories?rule_type=app endpoint."""
    client, _ = test_client

    response = client.get("/api/v1/categories?rule_type=app")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    rules = payload["data"]["rules"]
    assert all(r["rule_type"] == "app" for r in rules)


def test_create_get_update_delete_category_rule(test_client):
    """Test full CRUD lifecycle of a category rule via REST API."""
    client, _ = test_client

    # 1. Create (POST)
    new_rule_data = {
        "rule_type": "app",
        "pattern": "test_editor.exe",
        "category": CATEGORY_CODING,
        "subcategory": "ide",
        "productivity": PRODUCTIVITY_PRODUCTIVE,
        "priority": 150,
        "is_active": True,
    }

    create_resp = client.post("/api/v1/categories", json=new_rule_data)
    assert create_resp.status_code == 201
    create_payload = create_resp.json()
    assert create_payload["success"] is True
    rule_id = create_payload["data"]["id"]
    assert rule_id is not None

    # 2. Get by ID (GET)
    get_resp = client.get(f"/api/v1/categories/{rule_id}")
    assert get_resp.status_code == 200
    get_payload = get_resp.json()
    assert get_payload["data"]["pattern"] == "test_editor.exe"

    # 3. Update (PUT)
    update_data = {"priority": 300, "productivity": PRODUCTIVITY_NEUTRAL}
    put_resp = client.put(f"/api/v1/categories/{rule_id}", json=update_data)
    assert put_resp.status_code == 200
    put_payload = put_resp.json()
    assert put_payload["data"]["priority"] == 300
    assert put_payload["data"]["productivity"] == PRODUCTIVITY_NEUTRAL

    # 4. Delete (DELETE)
    del_resp = client.delete(f"/api/v1/categories/{rule_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["data"]["deleted"] is True

    # Confirm 404 after deletion
    get_del_resp = client.get(f"/api/v1/categories/{rule_id}")
    assert get_del_resp.status_code == 404


def test_reclassify_historical_data_endpoint(test_client):
    """Test POST /api/v1/categories/reclassify batch reclassification of tracking data."""
    client, db_mgr = test_client

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Insert unclassified sessions into database
    with db_mgr.connection() as conn:
        app_repo = AppSessionRepository(conn)
        browser_repo = BrowserSessionRepository(conn)
        yt_repo = YouTubeRepository(conn)

        # 1. Unclassified Code app session
        app_session = AppSession(
            app_name="code.exe",
            window_title="main.py - MindLedger",
            started_at=datetime.now(),
            duration_seconds=3600,
            category=CATEGORY_UNCATEGORIZED,
            productivity=PRODUCTIVITY_NEUTRAL,
            date=today_str,
        )
        app_repo.save(app_session)

        # 2. Unclassified GitHub browser session
        browser_session = BrowserSession(
            url="https://github.com/facebook/react",
            domain="github.com",
            page_title="facebook/react",
            started_at=datetime.now(),
            duration_seconds=1800,
            category=CATEGORY_UNCATEGORIZED,
            productivity=PRODUCTIVITY_NEUTRAL,
            date=today_str,
        )
        browser_repo.save(browser_session)

        # 3. Unclassified Fireship YouTube activity
        yt_activity = YouTubeActivity(
            video_url="https://www.youtube.com/watch?v=123",
            video_id="123",
            video_title="React in 100 Seconds",
            channel_name="Fireship",
            started_at=datetime.now(),
            watch_duration_seconds=600,
            video_category=CATEGORY_UNCATEGORIZED,
            is_productive=None,
            date=today_str,
        )
        yt_repo.upsert(yt_activity)

    # Call Reclassification API Endpoint
    reclass_resp = client.post("/api/v1/categories/reclassify", json={"from_date": today_str})
    assert reclass_resp.status_code == 200
    reclass_payload = reclass_resp.json()
    assert reclass_payload["success"] is True
    data = reclass_payload["data"]
    assert data["reclassified_app_sessions"] >= 1
    assert data["reclassified_browser_sessions"] >= 1
    assert data["reclassified_youtube_activities"] >= 1
    assert data["updated_daily_summaries"] >= 1

    # Verify database records were re-classified
    with db_mgr.connection() as conn:
        app_repo = AppSessionRepository(conn)
        browser_repo = BrowserSessionRepository(conn)
        yt_repo = YouTubeRepository(conn)

        apps = app_repo.get_by_date(today_str)
        code_app = next(a for a in apps if a.app_name == "code.exe")
        assert code_app.category == CATEGORY_CODING
        assert code_app.productivity == PRODUCTIVITY_PRODUCTIVE

        browsers = browser_repo.get_by_date(today_str)
        github_b = next(b for b in browsers if b.domain == "github.com")
        assert github_b.category == CATEGORY_CODING
        assert github_b.productivity == PRODUCTIVITY_PRODUCTIVE

        yts = yt_repo.get_by_date(today_str)
        fireship_yt = next(y for y in yts if y.channel_name == "Fireship")
        assert fireship_yt.video_category == "learning"
        assert fireship_yt.is_productive is True
