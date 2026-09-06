"""
MindLedger - Global Pytest Configuration & Test Isolation
Ensures every unit and integration test executes against an isolated, temporary SQLite database,
preventing any test executions from ever writing or modifying the user's real database.

Author: MindLedger Team
Created: 2026-09-06
"""

import os
import pytest
from config.settings import settings
from core.hydration_scheduler import hydration_scheduler
from database.connection import db_manager
from database.migrations.v001_initial import up as migrate_v001
from database.seed_data import seed_database


@pytest.fixture(autouse=True)
def isolate_database_for_tests(tmp_path, monkeypatch):
    """Automatically isolate all tests to a temporary SQLite database.

    Runs for every test, ensuring zero bleed into production databases.
    """
    test_db_path = str(tmp_path / "test_mindledger.db")
    monkeypatch.setattr(settings, "database_path", test_db_path)
    db_manager.db_path = test_db_path

    # Initialize schema and seed data in test database
    with db_manager.connection() as conn:
        migrate_v001(conn)
        seed_database(conn)

    # Reset hydration_scheduler state for isolated testing
    hydration_scheduler.active_work_seconds = 0
    hydration_scheduler.snooze_seconds_remaining = 0
    hydration_scheduler.reminder_due = False
    hydration_scheduler.reminder_message = None

    yield test_db_path

    # Teardown and reset pool
    db_manager.clear_pool()
    del db_manager.db_path
