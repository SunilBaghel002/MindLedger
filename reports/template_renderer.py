"""
MindLedger - Template Renderer
Jinja2 template loader and HTML email report renderer.

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import os
from typing import Any, Dict, List, Optional
from jinja2 import Environment, FileSystemLoader

from database.models import DailySummary, PeriodicSummary
from utils.logger import get_logger

logger = get_logger(__name__)

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")


def format_duration_filter(seconds: int) -> str:
    """Jinja2 custom filter to format seconds into a readable duration string e.g. 2h 15m."""
    if not seconds or seconds <= 0:
        return "0m"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


class TemplateRenderer:
    """Renders Jinja2 HTML templates for email reports."""

    def __init__(self, templates_dir: Optional[str] = None) -> None:
        """Initialize TemplateRenderer with Jinja2 environment.

        Args:
            templates_dir: Optional custom template directory path.
        """
        target_dir = templates_dir if templates_dir else TEMPLATES_DIR
        self.env = Environment(
            loader=FileSystemLoader(target_dir),
            autoescape=True,
        )
        self.env.filters["format_duration"] = format_duration_filter

    def render_daily_report(
        self,
        summary: DailySummary,
        has_charts: bool = False,
        insights: Optional[List[str]] = None,
    ) -> str:
        """Render daily report HTML string from DailySummary model.

        Args:
            summary: DailySummary model instance.
            has_charts: Whether CID charts are embedded in the email.
            insights: Optional list of AI insight strings.

        Returns:
            Rendered HTML report string.
        """
        template = self.env.get_template("daily_report.html")

        top_apps = json.loads(summary.top_apps_json) if summary.top_apps_json else []
        top_domains = json.loads(summary.top_domains_json) if summary.top_domains_json else []
        top_channels = json.loads(summary.top_channels_json) if summary.top_channels_json else []

        insights_list = (
            insights
            if insights is not None
            else (json.loads(summary.insights_json) if summary.insights_json else [])
        )

        return template.render(
            summary=summary,
            top_apps=top_apps,
            top_domains=top_domains,
            top_channels=top_channels,
            insights=insights_list,
            has_charts=has_charts,
        )

    def render_weekly_report(
        self, summary: PeriodicSummary, has_charts: bool = False
    ) -> str:
        """Render weekly report HTML string from PeriodicSummary model.

        Args:
            summary: PeriodicSummary model instance.
            has_charts: Whether CID charts are embedded.

        Returns:
            Rendered HTML report string.
        """
        template = self.env.get_template("weekly_report.html")

        top_apps = json.loads(summary.top_apps_json) if summary.top_apps_json else []
        top_domains = json.loads(summary.top_domains_json) if summary.top_domains_json else []

        return template.render(
            summary=summary,
            top_apps=top_apps,
            top_domains=top_domains,
            has_charts=has_charts,
        )

    def render_monthly_report(
        self, summary: PeriodicSummary, has_charts: bool = False
    ) -> str:
        """Render monthly report HTML string from PeriodicSummary model.

        Args:
            summary: PeriodicSummary model instance.
            has_charts: Whether CID charts are embedded.

        Returns:
            Rendered HTML report string.
        """
        template = self.env.get_template("monthly_report.html")

        top_apps = json.loads(summary.top_apps_json) if summary.top_apps_json else []
        top_domains = json.loads(summary.top_domains_json) if summary.top_domains_json else []

        return template.render(
            summary=summary,
            top_apps=top_apps,
            top_domains=top_domains,
            has_charts=has_charts,
        )
