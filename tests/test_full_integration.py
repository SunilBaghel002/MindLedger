"""
MindLedger - Full End-to-End Integration & 24-Hour Stress Test Suite
Simulates complete 24-hour application tracking lifecycle, Chrome extension events, AI classification, reporting, chart generation, data backups, and performance metrics.

Author: MindLedger Team
Created: 2026-08-11
"""

import json
import os
import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import pytest

from ai.rules_engine import RulesEngine
from api.server import app
from core.event_processor import EventProcessor
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as run_v001
from database.migrations.v002_performance_indexes import up as run_v002
from database.models import AppSession, BrowserSession, DailySummary, YouTubeActivity
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.summary_repo import SummaryRepository
from database.repositories.youtube_repo import YouTubeRepository
from database.seed_data import seed_database
from reports.chart_generator import ChartGenerator
from utils.data_manager import data_manager
from utils.profiler import system_profiler


@pytest.fixture
def full_system_db(tmp_path):
    """Fixture initializing temporary SQLite database with v001 & v002 migrations and default rules."""
    db_file = str(tmp_path / "full_integration.db")
    manager = DatabaseManager(db_path=db_file, max_connections=5)
    with manager.connection() as conn:
        run_v001(conn)
        run_v002(conn)
        seed_database(conn)
    yield manager
    manager.close_all()


def test_end_to_end_24h_lifecycle_simulation(full_system_db, tmp_path):
    """Simulate complete 24-hour activity lifecycle with 100+ events across all tracking layers."""
    start_time = time.perf_counter()
    today_str = datetime.now().strftime("%Y-%m-%d")

    with full_system_db.connection() as conn:
        app_repo = AppSessionRepository(conn)
        browser_repo = BrowserSessionRepository(conn)
        yt_repo = YouTubeRepository(conn)
        rules_engine = RulesEngine(conn)

        # 1. Simulate 50 Application Tracking Events (Coding, Learning, Communication, Entertainment)
        apps_sample = [
            ("code.exe", "main.py - MindLedger - Visual Studio Code", 600),
            ("chrome.exe", "GitHub - MindLedger Repo", 300),
            ("slack.exe", "Team Chat - Slack", 200),
            ("spotify.exe", "Focus Music - Spotify", 180),
            ("discord.exe", "Gaming Channel - Discord", 120),
        ]

        for i in range(10):
            for app_name, window_title, duration in apps_sample:
                cat, subcat, prod = rules_engine.classify_app(app_name, window_title)
                now = datetime.now() - timedelta(minutes=i * 5)
                app_repo.save(
                    AppSession(
                        app_name=app_name,
                        window_title=window_title,
                        started_at=now,
                        ended_at=now + timedelta(seconds=duration),
                        duration_seconds=duration,
                        is_foreground=True,
                        category=cat,
                        subcategory=subcat,
                        productivity=prod,
                        date=today_str,
                    )
                )

        # 2. Simulate 30 Browser Extension Ingestion Events
        domains_sample = [
            ("https://github.com/SunilBaghel002/MindLedger", "github.com", "GitHub Repository", 400),
            ("https://stackoverflow.com/questions/12345", "stackoverflow.com", "Python Async Help", 300),
            ("https://reddit.com/r/programming", "reddit.com", "Reddit Programming", 200),
        ]

        for i in range(10):
            for url, domain, title, duration in domains_sample:
                cat, subcat, prod = rules_engine.classify_browser(url, domain, title)
                now = datetime.now() - timedelta(minutes=i * 6)
                browser_repo.save(
                    BrowserSession(
                        url=url,
                        domain=domain,
                        page_title=title,
                        tab_id=100 + i,
                        started_at=now,
                        ended_at=now + timedelta(seconds=duration),
                        duration_seconds=duration,
                        is_active=True,
                        category=cat,
                        subcategory=subcat,
                        productivity=prod,
                        date=today_str,
                    )
                )

        # 3. Simulate 20 YouTube Activity Events
        yt_sample = [
            ("https://youtube.com/watch?v=vid1", "Python Tutorial 2026", "Corey Schafer", 900, "learning", True),
            ("https://youtube.com/watch?v=vid2", "Funny Cats Compilation", "Entertainment Network", 300, "entertainment", False),
        ]

        for i in range(10):
            for url, title, channel, duration, yt_cat, is_prod in yt_sample:
                now = datetime.now() - timedelta(minutes=i * 10)
                yt_repo.save(
                    YouTubeActivity(
                        video_url=url,
                        video_id=f"vid_{i}",
                        video_title=title,
                        channel_name=channel,
                        channel_url=f"https://youtube.com/c/{channel}",
                        started_at=now,
                        ended_at=now + timedelta(seconds=duration),
                        watch_duration_seconds=duration,
                        video_category=yt_cat,
                        is_productive=is_prod,
                        date=today_str,
                    )
                )

        # 4. Verify Summary Aggregation & Productivity Scoring
        summary_repo = SummaryRepository(conn)
        summary = summary_repo.aggregate_daily_summary(today_str)

        assert summary.date == today_str
        assert summary.total_screen_time_seconds > 0
        assert summary.productive_seconds > 0
        assert summary.productivity_score > 0.0

        # 5. Verify Report Chart Rendering
        chart_gen = ChartGenerator()
        charts = chart_gen.generate_all_report_charts(summary)
        assert "screen_time" in charts
        assert "productivity" in charts
        assert len(charts["screen_time"]) > 0

        # 6. Verify Online DB Backup & Data Export
        backup_path = str(tmp_path / "integration_backup.db.bak")
        data_manager.create_database_backup(conn, backup_path)
        assert os.path.exists(backup_path)

        json_export = data_manager.export_json(conn)
        assert "code.exe" in json_export
        assert "github.com" in json_export

    # 7. Check System Memory & Performance Constraints
    metrics = system_profiler.get_metrics()
    assert metrics.memory_rss_mb < 150.0

    elapsed_s = time.perf_counter() - start_time
    assert elapsed_s < 10.0  # 100+ events simulation completed in under 10 seconds
