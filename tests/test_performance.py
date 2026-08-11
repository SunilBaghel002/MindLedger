"""
MindLedger - Performance & Optimization Benchmarks Test Suite
Automated performance benchmarks for database connection pooling, query speed, API latency, and profiler metrics.

Author: MindLedger Team
Created: 2026-08-11
"""

import time
from fastapi.testclient import TestClient
import pytest

from api.server import app
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as run_v001
from database.migrations.v002_performance_indexes import up as run_v002
from utils.profiler import system_profiler


@pytest.fixture
def perf_db(tmp_path):
    """Fixture initializing temporary SQLite database with connection pooling and v002 performance indexes."""
    db_file = str(tmp_path / "perf_test.db")
    manager = DatabaseManager(db_path=db_file, max_connections=5)
    with manager.connection() as conn:
        run_v001(conn)
        run_v002(conn)
    yield manager
    manager.close_all()


def test_database_connection_pooling(perf_db):
    """Test that connection manager reuses connections from pool efficiently."""
    initial_stats = perf_db.pool_stats()
    assert initial_stats["max_connections"] == 5

    # Execute 50 consecutive queries using pool context manager
    start_t = time.perf_counter()
    for _ in range(50):
        with perf_db.connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM app_sessions;")
            cursor.fetchone()
    elapsed_ms = (time.perf_counter() - start_t) * 1000.0

    # 50 query executions should complete in under 500ms total (< 10ms per query)
    assert elapsed_ms < 500.0

    stats = perf_db.pool_stats()
    assert stats["available_in_pool"] >= 1


def test_compound_performance_indexes_exist(perf_db):
    """Verify that compound indexes created by v002 migration are active in SQLite database."""
    with perf_db.connection() as conn:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index';"
        )
        index_names = {row["name"] for row in cursor.fetchall()}

    expected_indexes = {
        "idx_app_sessions_date_fg_prod",
        "idx_app_sessions_date_fg_cat",
        "idx_app_sessions_ended_at",
        "idx_browser_sessions_date_domain",
        "idx_youtube_activity_date_channel",
    }
    for idx in expected_indexes:
        assert idx in index_names


def test_api_performance_latency():
    """Verify that API server endpoints respond quickly and inject X-Process-Time-Ms header."""
    client = TestClient(app)
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert "X-Process-Time-Ms" in response.headers
    process_time = float(response.headers["X-Process-Time-Ms"])
    assert process_time < 100.0  # Latency under 100ms


def test_system_performance_endpoint():
    """Verify GET /api/v1/system/perf returns RAM, CPU, Thread, and DB Pool diagnostic data."""
    client = TestClient(app)
    response = client.get("/api/v1/system/perf")

    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True

    data = res_json["data"]
    assert "cpu_percent" in data
    assert "memory_rss_mb" in data
    assert "active_threads_count" in data
    assert "db_pool_stats" in data

    # Memory usage check: process RSS under 150MB
    assert data["memory_rss_mb"] < 150.0


def test_system_profiler_garbage_collection():
    """Verify SystemProfiler manual garbage collection frees memory."""
    collected = system_profiler.trigger_garbage_collection()
    assert isinstance(collected, int)
