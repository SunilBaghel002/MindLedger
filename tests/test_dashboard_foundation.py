from datetime import date, datetime
from fastapi.testclient import TestClient

from api.server import app
from database.connection import db_manager
from database.models import AppSession, BrowserSession
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository


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
