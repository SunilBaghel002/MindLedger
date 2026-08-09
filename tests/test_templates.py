"""
MindLedger - Email Templates Unit Tests
Automated test suite for TemplateRenderer and Jinja2 HTML email templates (daily, weekly, monthly reports).

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import pytest

from database.models import DailySummary, PeriodicSummary
from reports.template_renderer import TemplateRenderer, format_duration_filter


@pytest.fixture
def sample_daily_summary():
    """Fixture returning sample DailySummary model."""
    return DailySummary(
        date="2026-08-09",
        total_screen_time_seconds=28800,
        active_time_seconds=25200,
        idle_time_seconds=3600,
        productive_seconds=18000,
        neutral_seconds=7200,
        unproductive_seconds=3600,
        productivity_score=82.5,
        top_apps_json=json.dumps(
            [{"app_name": "Code.exe", "duration_seconds": 14400, "percentage": 50.0}]
        ),
        top_domains_json=json.dumps(
            [{"domain": "github.com", "duration_seconds": 3600, "percentage": 50.0}]
        ),
        top_channels_json=json.dumps(
            [{"channel_name": "TechLead", "watch_duration_seconds": 1800, "percentage": 50.0}]
        ),
        insights_json=json.dumps(["Great focus day!", "Coding peak at 2 PM."]),
    )


@pytest.fixture
def sample_periodic_summary():
    """Fixture returning sample PeriodicSummary model."""
    return PeriodicSummary(
        period_type="weekly",
        period_label="Week 32, Aug 2026",
        period_start="2026-08-03",
        period_end="2026-08-09",
        total_screen_time_seconds=180000,
        avg_daily_seconds=25714,
        avg_productivity_score=79.2,
        best_day="2026-08-05",
        worst_day="2026-08-03",
        top_apps_json=json.dumps(
            [{"app_name": "VSCode", "duration_seconds": 90000}]
        ),
        top_domains_json=json.dumps(
            [{"domain": "github.com", "duration_seconds": 30000}]
        ),
    )


def test_format_duration_filter():
    """Test format_duration_filter formatting logic."""
    assert format_duration_filter(0) == "0m"
    assert format_duration_filter(45) == "0m"
    assert format_duration_filter(120) == "2m"
    assert format_duration_filter(3600) == "1h 0m"
    assert format_duration_filter(8100) == "2h 15m"


def test_render_daily_report(sample_daily_summary):
    """Test rendering daily report HTML string."""
    renderer = TemplateRenderer()
    html = renderer.render_daily_report(
        sample_daily_summary,
        has_charts=True,
        insights=["Awesome progress!"],
    )

    assert isinstance(html, str)
    assert "<!DOCTYPE html>" in html
    assert "Daily Activity Report for 2026-08-09" in html
    assert "Code.exe" in html
    assert "github.com" in html
    assert "TechLead" in html
    assert "Awesome progress!" in html
    assert "cid:chart_productivity" in html
    assert "cid:chart_apps" in html


def test_render_weekly_report(sample_periodic_summary):
    """Test rendering weekly report HTML string."""
    renderer = TemplateRenderer()
    html = renderer.render_weekly_report(sample_periodic_summary, has_charts=True)

    assert isinstance(html, str)
    assert "<!DOCTYPE html>" in html
    assert "Week 32, Aug 2026" in html
    assert "VSCode" in html
    assert "github.com" in html
    assert "2026-08-05" in html


def test_render_monthly_report(sample_periodic_summary):
    """Test rendering monthly report HTML string."""
    sample_periodic_summary.period_type = "monthly"
    sample_periodic_summary.period_label = "August 2026"

    renderer = TemplateRenderer()
    html = renderer.render_monthly_report(sample_periodic_summary, has_charts=False)

    assert isinstance(html, str)
    assert "<!DOCTYPE html>" in html
    assert "August 2026" in html
    assert "VSCode" in html
    assert "github.com" in html
