"""
MindLedger - Chart Generator Unit Tests
Automated test suite for ChartGenerator (screen time, productivity donut, top apps/domains/channels, PNG rendering).

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import os
import tempfile
import pytest

from database.models import DailySummary
from reports.chart_generator import ChartGenerator


@pytest.fixture
def sample_daily_summary():
    """Fixture returning a realistic DailySummary object."""
    return DailySummary(
        date="2026-08-09",
        total_screen_time_seconds=28800,  # 8h
        active_time_seconds=25200,        # 7h
        idle_time_seconds=3600,           # 1h
        productive_seconds=18000,        # 5h
        neutral_seconds=7200,            # 2h
        unproductive_seconds=3600,       # 1h
        learning_seconds=7200,           # 2h
        coding_seconds=14400,            # 4h
        browsing_seconds=3600,           # 1h
        youtube_seconds=3600,            # 1h
        communication_seconds=1800,      # 30m
        most_used_app="Code.exe",
        most_used_app_seconds=14400,
        most_visited_domain="github.com",
        most_visited_domain_seconds=3600,
        most_watched_channel="TechLead",
        most_watched_channel_seconds=1800,
        total_apps_used=5,
        total_domains_visited=3,
        total_youtube_videos=2,
        productivity_score=78.5,
        top_apps_json=json.dumps(
            [
                {"app_name": "Code.exe", "duration_seconds": 14400, "percentage": 50.0},
                {"app_name": "Chrome.exe", "duration_seconds": 7200, "percentage": 25.0},
                {"app_name": "Slack.exe", "duration_seconds": 1800, "percentage": 6.2},
            ]
        ),
        top_domains_json=json.dumps(
            [
                {"domain": "github.com", "duration_seconds": 3600, "percentage": 50.0},
                {"domain": "stackoverflow.com", "duration_seconds": 1800, "percentage": 25.0},
                {"domain": "youtube.com", "duration_seconds": 1800, "percentage": 25.0},
            ]
        ),
        top_channels_json=json.dumps(
            [
                {"channel_name": "TechLead", "watch_duration_seconds": 1800, "percentage": 50.0},
                {"channel_name": "Fireship", "watch_duration_seconds": 1800, "percentage": 50.0},
            ]
        ),
    )


def test_generate_screen_time_bar_chart(sample_daily_summary):
    """Test generating screen time bar chart returning valid PNG bytes."""
    generator = ChartGenerator()
    png_bytes = generator.generate_screen_time_bar_chart(sample_daily_summary)

    assert isinstance(png_bytes, bytes)
    assert len(png_bytes) > 0
    assert png_bytes.startswith(b"\x89PNG")


def test_generate_productivity_donut_chart(sample_daily_summary):
    """Test generating productivity donut chart returning valid PNG bytes."""
    generator = ChartGenerator()
    png_bytes = generator.generate_productivity_donut_chart(sample_daily_summary)

    assert isinstance(png_bytes, bytes)
    assert len(png_bytes) > 0
    assert png_bytes.startswith(b"\x89PNG")


def test_generate_app_usage_bar_chart(sample_daily_summary):
    """Test generating app usage bar chart for empty and non-empty inputs."""
    generator = ChartGenerator()

    # Populated
    top_apps = json.loads(sample_daily_summary.top_apps_json)
    png_bytes = generator.generate_app_usage_bar_chart(top_apps)
    assert isinstance(png_bytes, bytes)
    assert png_bytes.startswith(b"\x89PNG")

    # Empty fallback
    png_empty = generator.generate_app_usage_bar_chart([])
    assert isinstance(png_empty, bytes)
    assert png_empty.startswith(b"\x89PNG")


def test_generate_website_usage_bar_chart(sample_daily_summary):
    """Test generating website usage bar chart."""
    generator = ChartGenerator()

    top_domains = json.loads(sample_daily_summary.top_domains_json)
    png_bytes = generator.generate_website_usage_bar_chart(top_domains)
    assert isinstance(png_bytes, bytes)
    assert png_bytes.startswith(b"\x89PNG")

    png_empty = generator.generate_website_usage_bar_chart([])
    assert isinstance(png_empty, bytes)
    assert png_empty.startswith(b"\x89PNG")


def test_generate_youtube_breakdown_chart(sample_daily_summary):
    """Test generating YouTube channel breakdown chart."""
    generator = ChartGenerator()

    top_channels = json.loads(sample_daily_summary.top_channels_json)
    png_bytes = generator.generate_youtube_breakdown_chart(
        top_channels, sample_daily_summary.youtube_seconds
    )
    assert isinstance(png_bytes, bytes)
    assert png_bytes.startswith(b"\x89PNG")

    png_empty = generator.generate_youtube_breakdown_chart([], 0)
    assert isinstance(png_empty, bytes)
    assert png_empty.startswith(b"\x89PNG")


def test_generate_all_report_charts(sample_daily_summary):
    """Test generating all 5 charts together and saving to a temporary directory."""
    generator = ChartGenerator()

    with tempfile.TemporaryDirectory() as temp_dir:
        charts = generator.generate_all_report_charts(
            sample_daily_summary, output_dir=temp_dir
        )

        assert set(charts.keys()) == {
            "screen_time",
            "productivity",
            "apps",
            "websites",
            "youtube",
        }

        for key, png_bytes in charts.items():
            assert isinstance(png_bytes, bytes)
            assert png_bytes.startswith(b"\x89PNG")

            expected_file = os.path.join(temp_dir, f"{sample_daily_summary.date}_{key}.png")
            assert os.path.exists(expected_file)
            assert os.path.getsize(expected_file) > 0
