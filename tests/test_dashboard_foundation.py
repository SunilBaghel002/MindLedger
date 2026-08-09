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


def test_browser_analytics_endpoints():
    """Verify GET /api/v1/browser/analytics and /api/v1/browser/domain-details endpoints."""
    client = TestClient(app)
    res1 = client.get("/api/v1/browser/analytics?range_preset=30d")
    assert res1.status_code == 200
    j1 = res1.json()
    assert j1["success"] is True
    assert j1["data"]["date_range"] == "30d"
    assert "top_domains" in j1["data"]

    res2 = client.get("/api/v1/browser/domain-details?domain=github.com&range_preset=today")
    assert res2.status_code == 200
    j2 = res2.json()
    assert j2["success"] is True
    assert isinstance(j2["data"], list)
