from datetime import date, datetime
from fastapi.testclient import TestClient

from api.server import app
from database.connection import db_manager
from database.models import AppSession, BrowserSession, YouTubeActivity
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.youtube_repo import YouTubeRepository


def test_dashboard_index_html_route():
    """Verify GET /dashboard returns index.html content."""
    client = TestClient(app)
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert "MindLedger" in response.text
    assert "<!DOCTYPE html>" in response.text


def test_dashboard_subpage_html_route():
    """Verify GET /dashboard/apps returns dashboard content."""
    client = TestClient(app)
    response = client.get("/dashboard/apps")
    assert response.status_code == 200
    assert "MindLedger" in response.text or "<!DOCTYPE html>" in response.text


def test_dashboard_static_files_mounting():
    """Verify GET /static/css/variables.css and /static/js/app.js return static assets."""
    client = TestClient(app)
    
    css_res = client.get("/static/css/variables.css")
    assert css_res.status_code == 200
    assert "--primary-blue" in css_res.text

    js_res = client.get("/static/js/app.js")
    assert js_res.status_code == 200
    assert "MindLedgerApp" in js_res.text


def test_live_tracking_status_endpoint():
    """Verify GET /api/v1/dashboard/live returns valid JSON schema."""
    client = TestClient(app)
    response = client.get("/api/v1/dashboard/live")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "is_tracking" in json_data["data"]
    assert "current_app" in json_data["data"]


def test_apps_analytics_endpoint():
    """Verify GET /api/v1/apps/analytics returns seeded data, breakdown, and category filtering."""
    now = datetime.now()
    today_str = now.date().isoformat()
    with db_manager.connection() as conn:
        repo = AppSessionRepository(conn)
        repo.save(AppSession(app_name="VSCode", window_title="main.py", category="Coding", productivity="productive", duration_seconds=600, started_at=now, date=today_str))
        repo.save(AppSession(app_name="Spotify", window_title="Music", category="Music", productivity="neutral", duration_seconds=300, started_at=now, date=today_str))

    client = TestClient(app)
    response = client.get("/api/v1/apps/analytics?range_preset=today&category=productive")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["date_range"] == "today"
    assert json_data["data"]["total_screen_time_seconds"] >= 600
    assert len(json_data["data"]["top_apps"]) >= 1
    assert json_data["data"]["top_apps"][0]["app_name"] == "VSCode"
    assert "category_breakdown" in json_data["data"]


def test_browser_analytics_endpoints():
    """Verify GET /api/v1/browser/analytics and /api/v1/browser/domain-details endpoints with seeded sessions."""
    now = datetime.now()
    today_str = now.date().isoformat()
    with db_manager.connection() as conn:
        repo = BrowserSessionRepository(conn)
        repo.save(BrowserSession(url="https://github.com/test", domain="github.com", page_title="GitHub Test", duration_seconds=400, category="Dev", productivity="productive", started_at=now, date=today_str))

    client = TestClient(app)
    res1 = client.get("/api/v1/browser/analytics?range_preset=today")
    assert res1.status_code == 200
    j1 = res1.json()
    assert j1["success"] is True
    assert j1["data"]["date_range"] == "today"
    assert j1["data"]["total_browsing_seconds"] >= 400
    assert "top_domains" in j1["data"]

    res2 = client.get("/api/v1/browser/domain-details?domain=github.com&range_preset=today")
    assert res2.status_code == 200
    j2 = res2.json()
    assert j2["success"] is True
    assert isinstance(j2["data"], list)
    assert len(j2["data"]) >= 1
    assert j2["data"][0]["url"] == "https://github.com/test"


def test_youtube_analytics_endpoint():
    """Verify GET /api/v1/youtube/analytics returns YouTube metrics, channels, and video history."""
    now = datetime.now()
    today_str = now.date().isoformat()
    with db_manager.connection() as conn:
        repo = YouTubeRepository(conn)
        repo.save(
            YouTubeActivity(
                video_url="https://youtube.com/watch?v=12345",
                video_id="12345",
                video_title="FastAPI Python Tutorial",
                channel_name="Tech Channel",
                watch_duration_seconds=500,
                video_category="Educational",
                is_productive=True,
                started_at=now,
                date=today_str,
            )
        )

    client = TestClient(app)
    response = client.get("/api/v1/youtube/analytics?range_preset=today&search=FastAPI")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["date_range"] == "today"
    assert json_data["data"]["total_watch_seconds"] >= 500
    assert len(json_data["data"]["top_channels"]) >= 1
    assert json_data["data"]["top_channels"][0]["channel_name"] == "Tech Channel"
    assert len(json_data["data"]["history"]) >= 1
    assert "FastAPI" in json_data["data"]["history"][0]["video_title"]


def test_reports_endpoints():
    """Verify GET /api/v1/reports/history, POST /reports/generate, and HTML download endpoints."""
    client = TestClient(app)
    today_str = date.today().isoformat()

    # Generate Report
    gen_res = client.post("/api/v1/reports/generate", json={"report_type": "daily", "date": today_str, "send_email": False})
    assert gen_res.status_code == 200
    gen_json = gen_res.json()
    assert gen_json["success"] is True
    assert gen_json["data"]["report_type"] == "daily"

    # History List
    hist_res = client.get("/api/v1/reports/history")
    assert hist_res.status_code == 200
    hist_json = hist_res.json()
    assert hist_json["success"] is True
    assert "reports" in hist_json["data"]

    # HTML Download
    dl_res = client.get(f"/api/v1/reports/download/html?report_type=daily&date_str={today_str}")
    assert dl_res.status_code == 200
    assert "MindLedger" in dl_res.text or "<html" in dl_res.text


def test_settings_and_rules_endpoints():
    """Verify GET/POST /api/v1/settings, Category Rules CRUD, and Data Export endpoints."""
    client = TestClient(app)

    # Fetch settings
    s_res = client.get("/api/v1/settings")
    assert s_res.status_code == 200
    s_json = s_res.json()
    assert s_json["success"] is True
    assert "tracking_enabled" in s_json["data"]

    # Update settings
    up_res = client.post("/api/v1/settings", json={"idle_threshold_seconds": 600, "recipient_email": "test@example.com"})
    assert up_res.status_code == 200
    up_json = up_res.json()
    assert up_json["success"] is True
    assert up_json["data"]["idle_threshold_seconds"] == 600

    # Category Rules CRUD
    create_res = client.post("/api/v1/settings/rules", json={"rule_type": "app", "pattern": "test_vscode", "category": "Development", "productivity": "productive"})
    assert create_res.status_code == 200
    create_json = create_res.json()
    assert create_json["success"] is True
    rule_id = create_json["data"]["id"]

    rules_res = client.get("/api/v1/settings/rules")
    assert rules_res.status_code == 200
    assert any(r["pattern"] == "test_vscode" for r in rules_res.json()["data"])

    del_res = client.delete(f"/api/v1/settings/rules/{rule_id}")
    assert del_res.status_code == 200

    # Export Data
    exp_res = client.get("/api/v1/settings/export")
    assert exp_res.status_code == 200
    assert "app_sessions" in exp_res.text
