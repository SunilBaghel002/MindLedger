"""
MindLedger - Test Suite for Browser & YouTube Tracking Pipeline (Phase 2C & 2D)
Tests repositories (BrowserSessionRepository, YouTubeRepository) and FastAPI API endpoints (POST & GET).

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import tempfile
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from api.server import app
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as v001_up
from database.models import BrowserSession, YouTubeActivity
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.youtube_repo import YouTubeRepository


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database initialized with v001_initial schema."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    manager = DatabaseManager(db_path)
    with manager.get_connection() as conn:
        v001_up(conn)
        conn.commit()

    yield manager

    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except PermissionError:
        pass


def test_browser_session_repository(temp_db):
    """Test BrowserSessionRepository insert, retrieval, and top domains aggregation."""
    with temp_db.get_connection() as conn:
        repo = BrowserSessionRepository(conn)

        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")

        session1 = BrowserSession(
            url="https://github.com/SunilBaghel002/MindLedger",
            domain="github.com",
            page_title="MindLedger Repository",
            tab_id=1,
            started_at=now,
            ended_at=now,
            duration_seconds=120,
            category="coding",
            productivity="productive",
            date=date_str,
        )

        session2 = BrowserSession(
            url="https://github.com/fastapi/fastapi",
            domain="github.com",
            page_title="FastAPI Repository",
            tab_id=1,
            started_at=now,
            ended_at=now,
            duration_seconds=180,
            category="coding",
            productivity="productive",
            date=date_str,
        )

        session_id1 = repo.save(session1)
        session_id2 = repo.save(session2)
        conn.commit()

        assert session_id1 > 0
        assert session_id2 > 0

        # Retrieve by ID
        fetched = repo.get_by_id(session_id1)
        assert fetched is not None
        assert fetched.domain == "github.com"
        assert fetched.duration_seconds == 120

        # Retrieve by date
        sessions = repo.get_by_date(date_str)
        assert len(sessions) == 2

        # Aggregation: top domains
        top_domains = repo.get_top_domains(date_str, limit=5)
        assert len(top_domains) == 1
        assert top_domains[0]["domain"] == "github.com"
        assert top_domains[0]["total_seconds"] == 300

        # Total duration & count
        assert repo.get_total_duration(date_str) == 300
        assert repo.get_unique_domain_count(date_str) == 1


def test_youtube_repository(temp_db):
    """Test YouTubeRepository insert, retrieval, and top channels aggregation."""
    with temp_db.get_connection() as conn:
        repo = YouTubeRepository(conn)

        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")

        activity1 = YouTubeActivity(
            video_url="https://www.youtube.com/watch?v=abc123",
            video_id="abc123",
            video_title="Python Tutorial for Beginners",
            channel_name="Programming with Mosh",
            channel_url="https://www.youtube.com/@programmingwithmosh",
            started_at=now,
            ended_at=now,
            watch_duration_seconds=600,
            video_category="learning",
            is_productive=True,
            date=date_str,
        )

        act_id1 = repo.save(activity1)
        conn.commit()

        assert act_id1 > 0

        fetched = repo.get_by_id(act_id1)
        assert fetched is not None
        assert fetched.video_id == "abc123"
        assert fetched.channel_name == "Programming with Mosh"
        assert fetched.watch_duration_seconds == 600

        top_channels = repo.get_top_channels(date_str, limit=5)
        assert len(top_channels) == 1
        assert top_channels[0]["channel_name"] == "Programming with Mosh"
        assert top_channels[0]["total_seconds"] == 600

        assert repo.get_total_watch_time(date_str) == 600
        assert repo.get_video_count(date_str) == 1


def test_browser_api_endpoints(temp_db, monkeypatch):
    """Test POST /api/v1/events/browser and POST /api/v1/events/youtube endpoints."""
    import api.routes.browser_routes as br
    monkeypatch.setattr(br, "db_manager", temp_db)

    client = TestClient(app)

    # 1. Test POST /api/v1/events/browser
    now_iso = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")

    browser_payload = {
        "url": "https://github.com/SunilBaghel002/MindLedger",
        "domain": "github.com",
        "title": "MindLedger GitHub",
        "started_at": now_iso,
        "ended_at": now_iso,
        "duration_seconds": 45,
        "tab_id": 10,
    }

    res = client.post("/api/v1/events/browser", json=browser_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "id" in data["data"]
    assert data["data"]["id"] > 0

    # 2. Test POST /api/v1/events/youtube
    youtube_payload = {
        "type": "YOUTUBE_EVENT",
        "video_id": "xyz789",
        "video_title": "FastAPI Crash Course Tutorial",
        "channel_name": "FreeCodeCamp",
        "channel_url": "https://www.youtube.com/@freecodecamp",
        "video_url": "https://www.youtube.com/watch?v=xyz789",
        "is_short": False,
        "watch_duration_seconds": 180,
        "video_duration_seconds": 3600,
        "timestamp": now_iso,
    }

    res_yt = client.post("/api/v1/events/youtube", json=youtube_payload)
    assert res_yt.status_code == 200
    data_yt = res_yt.json()
    assert data_yt["success"] is True
    assert "id" in data_yt["data"]

    # 3. Test GET /api/v1/browser/today
    res_b_today = client.get(f"/api/v1/browser/today?date={today_str}")
    assert res_b_today.status_code == 200
    b_data = res_b_today.json()["data"]
    assert b_data["date"] == today_str
    assert b_data["total_browsing_seconds"] == 45
    assert b_data["total_unique_domains"] == 1
    assert len(b_data["top_domains"]) == 1

    # 4. Test GET /api/v1/browser/domains
    res_b_domains = client.get(f"/api/v1/browser/domains?date={today_str}")
    assert res_b_domains.status_code == 200
    d_data = res_b_domains.json()["data"]
    assert d_data["count"] == 1
    assert d_data["domains"][0]["domain"] == "github.com"

    # 5. Test GET /api/v1/youtube/today
    res_y_today = client.get(f"/api/v1/youtube/today?date={today_str}")
    assert res_y_today.status_code == 200
    y_data = res_y_today.json()["data"]
    assert y_data["date"] == today_str
    assert y_data["total_watch_seconds"] == 180
    assert y_data["total_videos_count"] == 1
    assert len(y_data["top_channels"]) == 1

    # 6. Test GET /api/v1/youtube/channels
    res_y_channels = client.get(f"/api/v1/youtube/channels?date={today_str}")
    assert res_y_channels.status_code == 200
    c_data = res_y_channels.json()["data"]
    assert c_data["count"] == 1
    assert c_data["channels"][0]["channel_name"] == "FreeCodeCamp"
