"""
MindLedger - Data Manager Test Suite
Automated unit and integration tests covering JSON/CSV export, JSON import, live SQLite backup, data archival, cleanup, and API endpoints.

Author: MindLedger Team
Created: 2026-08-11
"""

import json
import os
import tempfile
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import pytest

from api.server import app
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as run_v001
from database.models import AppSession, CategoryRule
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.category_rule_repo import CategoryRuleRepository
from utils.data_manager import data_manager


@pytest.fixture
def data_db(tmp_path):
    """Fixture providing temporary SQLite DB populated with sample sessions and rules."""
    db_file = str(tmp_path / "data_test.db")
    manager = DatabaseManager(db_path=db_file)
    with manager.connection() as conn:
        run_v001(conn)
        repo = AppSessionRepository(conn)
        now = datetime.now()
        repo.save(
            AppSession(
                app_name="vscode.exe",
                window_title="main.py - MindLedger",
                started_at=now,
                duration_seconds=300,
                is_foreground=True,
                category="coding",
                productivity="productive",
                date=now.strftime("%Y-%m-%d"),
            )
        )
        old_date = (now - timedelta(days=200)).strftime("%Y-%m-%d")
        repo.save(
            AppSession(
                app_name="old_app.exe",
                window_title="Legacy Session",
                started_at=now - timedelta(days=200),
                duration_seconds=600,
                is_foreground=True,
                category="browsing",
                productivity="neutral",
                date=old_date,
            )
        )
        rule_repo = CategoryRuleRepository(conn)
        rule_repo.save(
            CategoryRule(
                rule_type="app",
                pattern="vscode.exe",
                category="coding",
                productivity="productive",
            )
        )
    yield manager
    manager.close_all()


def test_export_json_and_csv(data_db):
    """Test exporting tracking dataset to JSON and CSV formats."""
    with data_db.connection() as conn:
        json_str = data_manager.export_json(conn)
        assert "app_sessions" in json_str
        assert "vscode.exe" in json_str

        csv_str = data_manager.export_csv(conn, "app_sessions")
        assert "app_name" in csv_str
        assert "vscode.exe" in csv_str


def test_import_json(data_db, tmp_path):
    """Test importing JSON tracking dataset into SQLite database."""
    with data_db.connection() as conn:
        json_str = data_manager.export_json(conn)

    # Create fresh database and import JSON
    import_db_file = str(tmp_path / "import_target.db")
    import_mgr = DatabaseManager(db_path=import_db_file)
    with import_mgr.connection() as conn:
        run_v001(conn)
        counts = data_manager.import_json(conn, json_str)
        assert counts["app_sessions"] >= 2
        assert counts["category_rules"] >= 1

        repo = AppSessionRepository(conn)
        sessions = repo.get_by_date(datetime.now().strftime("%Y-%m-%d"))
        assert len(sessions) >= 1
    import_mgr.close_all()


def test_create_database_backup(data_db, tmp_path):
    """Test online SQLite database backup creation."""
    backup_file = str(tmp_path / "backups" / "test_backup.db.bak")
    with data_db.connection() as conn:
        actual_path = data_manager.create_database_backup(conn, backup_file)
        assert os.path.exists(actual_path)
        assert os.path.getsize(actual_path) > 0


def test_archive_and_cleanup(data_db, tmp_path):
    """Test compressing entries older than X months into zip archive and deleting raw entries."""
    archive_dir = str(tmp_path / "archives")
    with data_db.connection() as conn:
        res = data_manager.archive_and_cleanup(conn, archive_dir=archive_dir, months_to_keep=6)
        assert res["archived_count"] >= 1
        assert res["archive_file"] is not None
        assert os.path.exists(res["archive_file"])

        # Verify old session was removed from DB
        cursor = conn.execute("SELECT COUNT(*) FROM app_sessions WHERE app_name = 'old_app.exe';")
        assert cursor.fetchone()[0] == 0


def test_data_api_endpoints():
    """Test FastAPI data management endpoints (/api/v1/data/*)."""
    client = TestClient(app)

    # Test GET export JSON
    exp_res = client.get("/api/v1/data/export?format=json")
    assert exp_res.status_code == 200
    assert "Content-Disposition" in exp_res.headers

    # Test GET export CSV
    csv_res = client.get("/api/v1/data/export?format=csv&table=app_sessions")
    assert csv_res.status_code == 200

    # Test POST backup
    bak_res = client.post("/api/v1/data/backup")
    assert bak_res.status_code == 200
    assert bak_res.json()["success"] is True

    # Test POST cleanup
    clean_res = client.post("/api/v1/data/cleanup?months_to_keep=6")
    assert clean_res.status_code == 200
    assert clean_res.json()["success"] is True
