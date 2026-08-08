"""
MindLedger - Database Unit Tests
Automated test suite for DatabaseManager, v001_initial migration, seed data, AppSessionRepository, and SettingsRepository.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path
import pytest

from database.connection import DatabaseManager
from database.migrations.v001_initial import down, up
from database.models import AppSession, CategoryRule, SettingItem
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.settings_repo import SettingsRepository
from database.seed_data import seed_database


@pytest.fixture
def temp_db():
    """Fixture creating a temporary SQLite database and running v001 initial migration."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db_mgr = DatabaseManager(db_path=db_path)
    with db_mgr.connection() as conn:
        up(conn)
        seed_database(conn)

    yield db_mgr, db_path

    # Teardown
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass


def test_database_connection(temp_db):
    """Test DatabaseManager context manager, journal mode, and foreign keys."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        foreign_keys = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
        assert journal_mode.lower() == "wal"
        assert foreign_keys == 1


def test_migration_up_and_down(temp_db):
    """Test running migration UP and DOWN operations."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        # Down migration
        down(conn)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row["name"] for row in cursor.fetchall()]
        assert "app_sessions" not in tables
        assert "settings" not in tables

        # Re-apply Up migration
        up(conn)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row["name"] for row in cursor.fetchall()]
        assert "app_sessions" in tables
        assert "category_rules" in tables
        assert "settings" in tables


def test_seed_data(temp_db):
    """Test that default rules and settings are seeded properly."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        rules_count = conn.execute("SELECT COUNT(*) FROM category_rules;").fetchone()[0]
        settings_count = conn.execute("SELECT COUNT(*) FROM settings;").fetchone()[0]

        assert rules_count > 0
        assert settings_count > 0


def test_app_session_repository(temp_db):
    """Test AppSessionRepository CRUD operations and top app aggregation."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        repo = AppSessionRepository(conn)
        now = datetime.now()

        session1 = AppSession(
            app_name="Code.exe",
            app_path="C:\\Program Files\\VSCode\\Code.exe",
            window_title="main.py - MindLedger",
            started_at=now,
            duration_seconds=120,
            is_foreground=True,
            category="coding",
            productivity="productive",
            date="2026-08-08",
        )

        session_id = repo.save(session1)
        assert session_id > 0

        # Retrieve by ID
        fetched = repo.get_by_id(session_id)
        assert fetched is not None
        assert fetched.app_name == "Code.exe"
        assert fetched.category == "coding"

        # Update ended_at
        ended_time = datetime.now()
        updated = repo.update_ended_at(session_id, ended_time, 300)
        assert updated is True

        fetched_updated = repo.get_by_id(session_id)
        assert fetched_updated.duration_seconds == 300

        # Get by date
        sessions = repo.get_by_date("2026-08-08")
        assert len(sessions) >= 1
        assert sessions[0].app_name == "Code.exe"

        # Get top apps
        top_apps = repo.get_top_apps("2026-08-08", limit=5)
        assert len(top_apps) == 1
        assert top_apps[0]["app_name"] == "Code.exe"
        assert top_apps[0]["total_seconds"] == 300


def test_settings_repository(temp_db):
    """Test SettingsRepository get, set, and get_all operations."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        repo = SettingsRepository(conn)

        # Get existing seeded setting
        poll_interval = repo.get("poll_interval_seconds")
        assert poll_interval == "2"

        # Set new setting
        repo.set("custom_key", "custom_val", "string")
        assert repo.get("custom_key") == "custom_val"

        # Update existing setting
        repo.set("poll_interval_seconds", "5", "integer")
        assert repo.get("poll_interval_seconds") == "5"

        # Get all settings
        all_settings = repo.get_all()
        assert "poll_interval_seconds" in all_settings
        assert "custom_key" in all_settings
