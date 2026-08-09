"""
MindLedger - Insights Generator Unit Tests
Test suite verifying AI insight triggers, pattern detection, template formatting, and historical comparison insights.

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import pytest

from ai.insights_generator import InsightsGenerator


def test_generate_daily_insights_high_productivity():
    """Test high productivity score trigger (>= 75)."""
    summary = {
        "total_screen_time_seconds": 28800,
        "productive_seconds": 20000,
        "learning_seconds": 5000,
        "unproductive_seconds": 3800,
        "productivity_score": 85.0,
    }

    insights = InsightsGenerator.generate_daily_insights(summary)
    assert len(insights) > 0
    assert any("🎉 Great day!" in i for i in insights)


def test_generate_daily_insights_medium_and_low():
    """Test medium productivity (50-75) and low productivity (< 50) triggers."""
    medium_summary = {
        "total_screen_time_seconds": 28800,
        "productive_seconds": 14000,
        "unproductive_seconds": 14000,
        "productivity_score": 60.0,
    }
    med_insights = InsightsGenerator.generate_daily_insights(medium_summary)
    assert any("👍 Decent day" in i for i in med_insights)

    low_summary = {
        "total_screen_time_seconds": 28800,
        "productive_seconds": 5000,
        "unproductive_seconds": 20000,
        "most_used_app": "vlc.exe",
        "most_used_app_seconds": 18000,
        "productivity_score": 30.0,
    }
    low_insights = InsightsGenerator.generate_daily_insights(low_summary)
    assert any("⚠️ Heads up" in i for i in low_insights)
    assert any("vlc.exe" in i for i in low_insights)


def test_generate_daily_insights_coding_streak():
    """Test coding streak trigger for 4+ hours of coding work."""
    summary = {
        "total_screen_time_seconds": 28800,
        "coding_seconds": 18000,  # 5 hours
        "productivity_score": 90.0,
    }
    insights = InsightsGenerator.generate_daily_insights(summary)
    assert any("💻 Coding beast!" in i for i in insights)
    assert any("5.0h" in i for i in insights)


def test_generate_daily_insights_youtube_split():
    """Test YouTube usage split trigger with top channels."""
    summary = {
        "total_screen_time_seconds": 28800,
        "youtube_seconds": 7200,  # 2 hours
        "productivity_score": 70.0,
        "top_channels_json": json.dumps([
            {"channel_name": "Fireship", "duration_seconds": 5400, "category": "learning"},
            {"channel_name": "Funny Channel", "duration_seconds": 1800, "category": "entertainment"},
        ]),
    }
    insights = InsightsGenerator.generate_daily_insights(summary)
    assert any("📺 YouTube usage:" in i for i in insights)
    assert any("75% educational" in i for i in insights)


def test_generate_daily_insights_historical_comparison():
    """Test productivity comparison insights against 7-day average."""
    today_summary = {
        "total_screen_time_seconds": 28800,
        "productivity_score": 88.0,
    }
    past_7_days = [
        {"productivity_score": 70.0},
        {"productivity_score": 75.0},
        {"productivity_score": 72.0},
    ]

    insights = InsightsGenerator.generate_daily_insights(today_summary, past_7_days)
    assert any("📈 Productivity score is up" in i for i in insights)


def test_generate_weekly_insights():
    """Test weekly summary insights generation."""
    weekly_summary = {
        "total_screen_time_seconds": 180000,  # 50 hours
        "avg_productivity_score": 82.5,
        "best_day": "Wednesday",
    }
    past_weeks = [{"avg_productivity_score": 75.0}]

    insights = InsightsGenerator.generate_weekly_insights(weekly_summary, past_weeks)
    assert any("🗓️ Weekly Summary:" in i for i in insights)
    assert any("🌟 Peak performance day" in i for i in insights)
    assert any("📈 Weekly average score improved" in i for i in insights)
