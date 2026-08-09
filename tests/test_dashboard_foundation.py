"""
MindLedger - Test Dashboard Foundation Phase 5A
Tests for Dashboard HTML routes, static asset serving, and live tracking status endpoint.
"""

from fastapi.testclient import TestClient

from api.server import app


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
    """Verify GET /api/v1/apps/analytics returns valid JSON schema with range_preset and category."""
    client = TestClient(app)
    response = client.get("/api/v1/apps/analytics?range_preset=7d&category=productive")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["date_range"] == "7d"
    assert "top_apps" in json_data["data"]
    assert "category_breakdown" in json_data["data"]
    assert "trend" in json_data["data"]
