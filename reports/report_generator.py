"""
MindLedger - Report Generator & Automation Coordinator
Coordinates summary data aggregation, chart rendering, Jinja2 template rendering, email sending, and APScheduler background automation.

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config.settings import settings
from database.models import DailySummary, PeriodicSummary
from database.repositories.summary_repo import SummaryRepository
from reports.chart_generator import ChartGenerator
from reports.email_sender import EmailSender
from reports.template_renderer import TemplateRenderer
from utils.logger import get_logger

logger = get_logger(__name__)


class ReportGenerator:
    """Orchestrates end-to-end report generation, chart rendering, template execution, and email delivery."""

    def __init__(
        self,
        connection: sqlite3.Connection,
        email_sender: Optional[EmailSender] = None,
        chart_generator: Optional[ChartGenerator] = None,
        template_renderer: Optional[TemplateRenderer] = None,
    ) -> None:
        """Initialize ReportGenerator.

        Args:
            connection: Active sqlite3.Connection instance.
            email_sender: Optional EmailSender instance.
            chart_generator: Optional ChartGenerator instance.
            template_renderer: Optional TemplateRenderer instance.
        """
        self.conn = connection
        self.summary_repo = SummaryRepository(connection)
        self.email_sender = email_sender or EmailSender()
        self.chart_generator = chart_generator or ChartGenerator()
        self.template_renderer = template_renderer or TemplateRenderer()
        self.settings = settings


    def generate_and_send_daily_report(
        self, date_str: Optional[str] = None, recipient: Optional[str] = None
    ) -> DailySummary:
        """Aggregate daily summary, render charts and HTML, send email, and update status.

        Args:
            date_str: Date string (YYYY-MM-DD). Defaults to today's date.
            recipient: Target recipient email. Defaults to settings RECIPIENT_EMAIL.

        Returns:
            Updated DailySummary object.
        """
        if not date_str:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        target_recipient = recipient or getattr(self.settings, "report_recipient_email", "") or ""

        logger.info(f"Generating daily report for date {date_str}...")
        summary = self.summary_repo.aggregate_daily_summary(date_str)

        # Generate charts
        chart_bytes_map = self.chart_generator.generate_all_report_charts(summary)

        # Map to CID keys for inline HTML rendering
        cid_images = {
            "chart_screen_time": chart_bytes_map.get("screen_time", b""),
            "chart_productivity": chart_bytes_map.get("productivity", b""),
            "chart_apps": chart_bytes_map.get("apps", b""),
            "chart_websites": chart_bytes_map.get("websites", b""),
            "chart_youtube": chart_bytes_map.get("youtube", b""),
        }

        # Render HTML
        html_content = self.template_renderer.render_daily_report(
            summary, has_charts=True
        )

        subject = f"MindLedger Daily Activity Report - {summary.date}"
        sent_success = self.email_sender.send_report_email(
            recipient=target_recipient,
            subject=subject,
            html_content=html_content,
            chart_images=cid_images,
        )

        summary.email_sent = sent_success
        return self.summary_repo.save_daily_summary(summary)

    def generate_and_send_weekly_report(
        self,
        period_start: str,
        period_end: str,
        period_label: str,
        recipient: Optional[str] = None,
    ) -> PeriodicSummary:
        """Aggregate weekly summary, render charts/HTML, send email, and update status.

        Args:
            period_start: Start date string (YYYY-MM-DD).
            period_end: End date string (YYYY-MM-DD).
            period_label: Period label string (e.g. "Week 32, Aug 2026").
            recipient: Target recipient email.

        Returns:
            Updated PeriodicSummary object.
        """
        target_recipient = recipient or getattr(self.settings, "report_recipient_email", "") or ""

        logger.info(f"Generating weekly report for period {period_label}...")
        summary = self.summary_repo.aggregate_weekly_summary(
            period_start=period_start,
            period_end=period_end,
            period_label=period_label,
        )

        # Create dummy summary for chart rendering of weekly productivity score
        temp_daily = DailySummary(
            date=period_end,
            productive_seconds=summary.productive_seconds,
            unproductive_seconds=summary.unproductive_seconds,
            learning_seconds=summary.learning_seconds,
            productivity_score=summary.avg_productivity_score,
        )
        donut_bytes = self.chart_generator.generate_productivity_donut_chart(temp_daily)

        html_content = self.template_renderer.render_weekly_report(
            summary, has_charts=True
        )
        subject = f"MindLedger Weekly Summary Report - {period_label}"

        sent_success = self.email_sender.send_report_email(
            recipient=target_recipient,
            subject=subject,
            html_content=html_content,
            chart_images={"chart_productivity": donut_bytes},
        )

        summary.email_sent = sent_success
        return self.summary_repo.save_periodic_summary(summary)

    def generate_and_send_monthly_report(
        self,
        period_start: str,
        period_end: str,
        period_label: str,
        recipient: Optional[str] = None,
    ) -> PeriodicSummary:
        """Aggregate monthly summary, render HTML, send email, and update status.

        Args:
            period_start: Start date string (YYYY-MM-DD).
            period_end: End date string (YYYY-MM-DD).
            period_label: Period label string (e.g. "August 2026").
            recipient: Target recipient email.

        Returns:
            Updated PeriodicSummary object.
        """
        target_recipient = recipient or getattr(self.settings, "report_recipient_email", "") or ""

        logger.info(f"Generating monthly report for period {period_label}...")
        summary = self.summary_repo.aggregate_monthly_summary(
            period_start=period_start,
            period_end=period_end,
            period_label=period_label,
        )

        html_content = self.template_renderer.render_monthly_report(
            summary, has_charts=False
        )
        subject = f"MindLedger Monthly Summary Report - {period_label}"

        sent_success = self.email_sender.send_report_email(
            recipient=target_recipient,
            subject=subject,
            html_content=html_content,
            chart_images=None,
        )

        summary.email_sent = sent_success
        return self.summary_repo.save_periodic_summary(summary)

    def retry_unsent_reports(self, recipient: Optional[str] = None) -> int:
        """Fetch and retry sending email for all daily summaries where email_sent = 0.

        Args:
            recipient: Target recipient email address.

        Returns:
            Count of successfully retried and sent reports.
        """
        cursor = self.conn.execute(
            "SELECT date FROM daily_summaries WHERE email_sent = 0 ORDER BY date ASC"
        )
        rows = cursor.fetchall()
        if not rows:
            return 0

        success_count = 0
        for row in rows:
            date_s = row["date"]
            logger.info(f"Retrying unsent report for date {date_s}...")
            summary = self.generate_and_send_daily_report(date_s, recipient=recipient)
            if summary.email_sent:
                success_count += 1

        return success_count

    def setup_report_scheduler(self, recipient: Optional[str] = None) -> Optional[Any]:
        """Configure APScheduler to automatically trigger daily, weekly, and monthly reports.

        Args:
            recipient: Target recipient email.

        Returns:
            Started BackgroundScheduler instance or None if APScheduler unavailable.
        """
        try:
            from apscheduler.schedulers.background import BackgroundScheduler

            scheduler = BackgroundScheduler(daemon=True)

            # Daily report at 23:55
            scheduler.add_job(
                func=self.generate_and_send_daily_report,
                trigger="cron",
                hour=23,
                minute=55,
                kwargs={"recipient": recipient},
                id="daily_report_job",
                replace_existing=True,
            )

            # Retry unsent emails every hour
            scheduler.add_job(
                func=self.retry_unsent_reports,
                trigger="cron",
                minute=0,
                kwargs={"recipient": recipient},
                id="retry_unsent_job",
                replace_existing=True,
            )

            scheduler.start()
            logger.info("APScheduler report automation started successfully.")
            return scheduler
        except Exception as e:
            logger.warning(f"Could not start BackgroundScheduler: {e}")
            return None
