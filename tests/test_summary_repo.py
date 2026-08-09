"""
MindLedger - Summary Repository Unit Tests
Automated test suite for SummaryRepository, productivity scoring, daily summaries, top apps/domains/channels calculations, and periodic summaries.

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import os
import sqlite3
import tempfile
from datetime import datetime, timezone
import pytest

from database.connection import DatabaseManager
from database.migrations.v001_initial import up
from database.models import AppSession, BrowserSession, DailySummary, PeriodicSummary, YouTubeActivity
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.summary_repo import SummaryRepository, calculate_productivity_score
from database.repositories.youtube_repo import YouTubeRepository


@pytest.fixture
def temp_db():
    """Fixture creating a temporary SQLite database with v001_initial schema."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    db_mgr = DatabaseManager(db_path=db_path)
    with db_mgr.connection() as conn:
        up(conn)

    yield db_mgr, db_path

    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except PermissionError:
            pass


def test_calculate_productivity_score():
    """Test productivity score algorithm under various scenarios."""
    # Scenario 1: Zero activity
    score_zero = calculate_productivity_score(0, 0, 0, 0)
    assert score_zero == 0.0

    # Scenario 2: Balanced activity
    # Productive: 4h (14400s), Learning: 1h (3600s), Neutral: 2h (7200s), Unproductive: 1h (3600s)
    # Total = 28800
    # Raw = (14400*1.0 + 3600*0.85 + 7200*0.3 + 0) / 28800 = (14400 + 3060 + 2160) / 28800 = 19620 / 28800 = 0.68125 -> 68.125
    # Coding >= 14400 -> +5 bonus -> 73.1
    score = calculate_productivity_score(
        productive_seconds=14400,
        learning_seconds=3600,
        neutral_seconds=7200,
        unproductive_seconds=3600,
        coding_seconds=14400,
    )
    assert score == 73.1

    # Scenario 3: Heavy unproductive penalty
    score_unprod = calculate_productivity_score(
        productive_seconds=3600,
        learning_seconds=0,
        neutral_seconds=0,
        unproductive_seconds=14400,  # 4h unproductive >= 10800s (-5 penalty)
    )
    # Raw = 3600 / 18000 = 0.2 -> 20.0 - 5 = 15.0
    assert score_unprod == 15.0


def test_aggregate_daily_summary_empty(temp_db):
    """Test daily summary aggregation when no activity data exists."""
    db_mgr, _ = temp_db
    date_str = "2026-08-09"

    with db_mgr.connection() as conn:
        repo = SummaryRepository(conn)
        summary = repo.aggregate_daily_summary(date_str)

        assert summary.date == date_str
        assert summary.total_screen_time_seconds == 0
        assert summary.active_time_seconds == 0
        assert summary.productivity_score == 0.0
        assert summary.top_apps_json == "[]"
        assert summary.top_domains_json == "[]"
        assert summary.top_channels_json == "[]"


def test_aggregate_daily_summary_with_data(temp_db):
    """Test daily summary aggregation with app, browser, and YouTube activity."""
    db_mgr, _ = temp_db
    date_str = "2026-08-09"
    now = datetime.now(timezone.utc)

    with db_mgr.connection() as conn:
        app_repo = AppSessionRepository(conn)
        browser_repo = BrowserSessionRepository(conn)
        yt_repo = YouTubeRepository(conn)
        summary_repo = SummaryRepository(conn)

        # Seed App Sessions
        app_repo.save(
            AppSession(
                app_name="Code.exe",
                window_title="main.py - MindLedger",
                started_at=now,
                duration_seconds=7200,
                is_foreground=True,
                category="coding",
                productivity="productive",
                date=date_str,
            )
        )
        app_repo.save(
            AppSession(
                app_name="Chrome.exe",
                window_title="YouTube - Google Chrome",
                started_at=now,
                duration_seconds=3600,
                is_foreground=True,
                category="browsing",
                productivity="neutral",
                date=date_str,
            )
        )

        # Seed Browser Sessions
        browser_repo.save(
            BrowserSession(
                url="https://github.com/SunilBaghel002/MindLedger",
                domain="github.com",
                page_title="GitHub Repository",
                started_at=now,
                duration_seconds=1800,
                date=date_str,
            )
        )

        # Seed YouTube Activity
        yt_repo.save(
            YouTubeActivity(
                video_url="https://www.youtube.com/watch?v=12345",
                video_id="12345",
                video_title="Python Async Tutorial",
                channel_name="TechLead",
                started_at=now,
                watch_duration_seconds=1200,
                video_category="learning",
                is_productive=True,
                date=date_str,
            )
        )

        summary = summary_repo.aggregate_daily_summary(date_str)

        assert summary.date == date_str
        assert summary.total_screen_time_seconds == 10800
        assert summary.active_time_seconds == 10800
        assert summary.coding_seconds == 7200
        assert summary.browsing_seconds == 3600
        assert summary.productive_seconds == 7200
        assert summary.neutral_seconds == 3600
        assert summary.total_apps_used == 2
        assert summary.total_domains_visited == 1
        assert summary.total_youtube_videos == 1
        assert summary.most_used_app == "Code.exe"
        assert summary.most_visited_domain == "github.com"
        assert summary.most_watched_channel == "TechLead"

        # Check top apps JSON structure
        top_apps = json.loads(summary.top_apps_json)
        assert len(top_apps) == 2
        assert top_apps[0]["app_name"] == "Code.exe"
        assert top_apps[0]["duration_seconds"] == 7200


def test_save_and_get_daily_summary(temp_db):
    """Test persisting and fetching a DailySummary model directly."""
    db_mgr, _ = temp_db
    date_str = "2026-08-09"

    summary_obj = DailySummary(
        date=date_str,
        total_screen_time_seconds=5000,
        active_time_seconds=4500,
        idle_time_seconds=500,
        productive_seconds=4000,
        neutral_seconds=500,
        unproductive_seconds=500,
        productivity_score=80.0,
        top_apps_json=json.dumps([{"app_name": "VSCode", "duration_seconds": 4000}]),
    )

    with db_mgr.connection() as conn:
        repo = SummaryRepository(conn)
        saved = repo.save_daily_summary(summary_obj)
        fetched = repo.get_daily_summary(date_str)

        assert fetched is not None
        assert fetched.date == date_str
        assert fetched.total_screen_time_seconds == 5000
        assert fetched.productivity_score == 80.0
        assert fetched.top_apps_json == summary_obj.top_apps_json


def test_aggregate_weekly_summary(temp_db):
    """Test weekly summary aggregation over multiple daily summaries."""
    db_mgr, _ = temp_db

    with db_mgr.connection() as conn:
        repo = SummaryRepository(conn)

        # Create daily summaries for 3 consecutive days
        dates = ["2026-08-03", "2026-08-04", "2026-08-05"]
        scores = [70.0, 90.0, 50.0]

        for idx, date_s in enumerate(dates):
            repo.save_daily_summary(
                DailySummary(
                    date=date_s,
                    total_screen_time_seconds=7200,
                    productive_seconds=5000,
                    unproductive_seconds=1000,
                    learning_seconds=1200,
                    productivity_score=scores[idx],
                    top_apps_json=json.dumps([{"app_name": "VSCode", "duration_seconds": 5000}]),
                )
            )

        weekly = repo.aggregate_weekly_summary(
            period_start="2026-08-03",
            period_end="2026-08-09",
            period_label="Week 32, Aug 2026",
        )

        assert weekly.period_type == "weekly"
        assert weekly.period_label == "Week 32, Aug 2026"
        assert weekly.total_screen_time_seconds == 21600
        assert weekly.productive_seconds == 15000
        assert weekly.avg_daily_seconds == 7200
        assert weekly.avg_productivity_score == 70.0  # (70 + 90 + 50) / 3
        assert weekly.best_day == "2026-08-04"
        assert weekly.worst_day == "2026-08-05"


def test_aggregate_monthly_summary(temp_db):
    """Test monthly summary aggregation over daily summaries."""
    db_mgr, _ = temp_db

    with db_mgr.connection() as conn:
        repo = SummaryRepository(conn)

        repo.save_daily_summary(
            DailySummary(
                date="2026-08-01",
                total_screen_time_seconds=14400,
                productive_seconds=10000,
                unproductive_seconds=2000,
                learning_seconds=2400,
                productivity_score=85.0,
            )
        )

        monthly = repo.aggregate_monthly_summary(
            period_start="2026-08-01",
            period_end="2026-08-31",
            period_label="August 2026",
        )

        assert monthly.period_type == "monthly"
        assert monthly.period_label == "August 2026"
        assert monthly.total_screen_time_seconds == 14400
        assert monthly.avg_productivity_score == 85.0
        assert monthly.best_day == "2026-08-01"
