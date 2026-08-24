"""
MindLedger - Process API Integration Tests
Automated test suite verifying GET /api/v1/processes, POST /api/v1/processes/terminate, and 403 protected checks.

Author: MindLedger Team
Created: 2026-08-24
"""

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import psutil

from api.server import app

client = TestClient(app)


def test_get_processes_endpoint():
    """Verify GET /api/v1/processes returns 200 and standard envelope with process list."""
    response = client.get("/api/v1/processes?filter=all&sort_by=memory")
    assert response.status_code == 200

    payload = response.json()
    assert payload["success"] is True
    assert payload["error"] is None

    data = payload["data"]
    assert "total_processes" in data
    assert "user_processes_count" in data
    assert "hog_count" in data
    assert "total_ram_used_mb" in data
    assert isinstance(data["processes"], list)


def test_terminate_protected_process_returns_403():
    """Verify that attempting to terminate a protected binary returns HTTP 403 Forbidden."""
    mock_proc = MagicMock()
    mock_proc.name.return_value = "explorer.exe"

    with patch("psutil.Process", return_value=mock_proc):
        response = client.post(
            "/api/v1/processes/terminate",
            json={"pid": 1000, "process_name": "explorer.exe", "force": False},
        )
        assert response.status_code == 403
        payload = response.json()
        assert payload["detail"] is not None
        assert "Protected system process" in payload["detail"]


def test_terminate_unprotected_process_returns_200():
    """Verify that terminating a user process returns HTTP 200 and freed memory amount."""
    mock_proc = MagicMock()
    mock_proc.name.return_value = "discord.exe"
    mock_mem = MagicMock()
    mock_mem.rss = 314572800  # 300 MB
    mock_proc.memory_info.return_value = mock_mem

    with patch("psutil.Process", return_value=mock_proc):
        with patch("psutil.wait_procs", return_value=([mock_proc], [])):
            response = client.post(
                "/api/v1/processes/terminate",
                json={"pid": 8888, "process_name": "discord.exe", "force": False},
            )
            assert response.status_code == 200

            payload = response.json()
            assert payload["success"] is True
            assert payload["data"]["pid"] == 8888
            assert payload["data"]["process_name"] == "discord.exe"
            assert payload["data"]["memory_freed_mb"] == 300.0


def test_terminate_nonexistent_process_returns_404():
    """Verify that attempting to terminate a non-existent PID returns HTTP 404."""
    with patch("psutil.Process", side_effect=psutil.NoSuchProcess(pid=99999)):
        response = client.post(
            "/api/v1/processes/terminate",
            json={"pid": 99999, "process_name": "unknown.exe", "force": False},
        )
        assert response.status_code == 404
