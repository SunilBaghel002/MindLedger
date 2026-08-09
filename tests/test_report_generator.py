"""
MindLedger - Report Generator & Email Sender Unit Tests
Automated test suite for EmailSender, MIME structure, mock SMTP delivery, ReportGenerator workflow, unsent email retries, and APScheduler.

Author: MindLedger Team
Created: 2026-08-09
"""

import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
import pytest

from database.connection import DatabaseManager
from database.migrations.v001_initial import up
from database.models import AppSession
from database.repositories.app_session_repo import AppSessionRepository
from reports.email_sender import EmailSender
from reports.report_generator import ReportGenerator


@pytest.fixture
def temp_db():
    """Fixture creating a temporary SQLite database with initial schema."""
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


def test_email_sender_build_mime_message():
    """Test EmailSender MIME message construction with CID attachments."""
    sender = EmailSender(sender_email="sender@mindledger.local")
    html_body = "<h1>Test Report</h1>"
    chart_cids = {
        "chart_productivity": b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
    }

    msg = sender.build_mime_message(
        recipient="user@example.com",
        subject="Daily Report",
        html_content=html_body,
        chart_images=chart_cids,
    )

    assert msg["Subject"] == "Daily Report"
    assert msg["To"] == "user@example.com"
    assert msg["From"] == "sender@mindledger.local"

    # Check payload parts
    payloads = msg.get_payload()
    assert len(payloads) == 2
    assert payloads[0].get_content_type() == "text/html"
    assert payloads[1].get_content_type() == "image/png"
    assert payloads[1].get("Content-ID") == "<chart_productivity>"


def test_email_sender_mock_send():
    """Test EmailSender send_report_email with mocked SMTP server."""
    sender = EmailSender(
        smtp_server="smtp.example.com",
        smtp_port=587,
        smtp_username="test_user",
        smtp_password="test_password",
        sender_email="sender@example.com",
    )

    with patch("smtplib.SMTP") as mock_smtp_class:
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__.return_value = mock_server

        success = sender.send_report_email(
            recipient="target@example.com",
            subject="Test Subject",
            html_content="<p>Test</p>",
        )

        assert success is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test_user", "test_password")
        mock_server.send_message.assert_called_once()


def test_email_sender_missing_credentials():
    """Test EmailSender handles unconfigured credentials gracefully without exception."""
    sender = EmailSender(smtp_username="", smtp_password="")
    success = sender.send_report_email(
        recipient="target@example.com",
        subject="Test",
        html_content="<p>Test</p>",
    )
    assert success is False


def test_report_generator_daily_workflow(temp_db):
    """Test ReportGenerator daily report aggregation, chart rendering, and sending."""
    db_mgr, _ = temp_db
    date_str = "2026-08-09"
    now = datetime.now(timezone.utc)

    with db_mgr.connection() as conn:
        # Seed app session
        app_repo = AppSessionRepository(conn)
        app_repo.save(
            AppSession(
                app_name="VSCode",
                started_at=now,
                duration_seconds=7200,
                category="coding",
                productivity="productive",
                date=date_str,
            )
        )

        # Mock EmailSender to return True
        mock_email_sender = MagicMock(spec=EmailSender)
        mock_email_sender.send_report_email.return_value = True

        generator = ReportGenerator(conn, email_sender=mock_email_sender)
        daily_summary = generator.generate_and_send_daily_report(
            date_str=date_str, recipient="user@example.com"
        )

        assert daily_summary.date == date_str
        assert daily_summary.total_screen_time_seconds == 7200
        assert daily_summary.email_sent is True
        mock_email_sender.send_report_email.assert_called_once()


def test_report_generator_weekly_and_monthly(temp_db):
    """Test ReportGenerator weekly and monthly report generation workflows."""
    db_mgr, _ = temp_db

    with db_mgr.connection() as conn:
        mock_email_sender = MagicMock(spec=EmailSender)
        mock_email_sender.send_report_email.return_value = True

        generator = ReportGenerator(conn, email_sender=mock_email_sender)

        # Weekly
        weekly = generator.generate_and_send_weekly_report(
            period_start="2026-08-03",
            period_end="2026-08-09",
            period_label="Week 32, Aug 2026",
            recipient="user@example.com",
        )
        assert weekly.period_type == "weekly"
        assert weekly.email_sent is True

        # Monthly
        monthly = generator.generate_and_send_monthly_report(
            period_start="2026-08-01",
            period_end="2026-08-31",
            period_label="August 2026",
            recipient="user@example.com",
        )
        assert monthly.period_type == "monthly"
        assert monthly.email_sent is True


def test_report_generator_retry_unsent(temp_db):
    """Test ReportGenerator retry_unsent_reports functionality."""
    db_mgr, _ = temp_db

    with db_mgr.connection() as conn:
        # Create an unsent report in database
        summary_repo = ReportGenerator(conn).summary_repo
        daily_summary = summary_repo.aggregate_daily_summary("2026-08-08")
        assert daily_summary.email_sent is False

        # Mock EmailSender to succeed on retry
        mock_email_sender = MagicMock(spec=EmailSender)
        mock_email_sender.send_report_email.return_value = True

        generator = ReportGenerator(conn, email_sender=mock_email_sender)
        retried_count = generator.retry_unsent_reports(recipient="user@example.com")

        assert retried_count == 1

        # Check DB updated
        updated_summary = summary_repo.get_daily_summary("2026-08-08")
        assert updated_summary is not None
        assert updated_summary.email_sent is True


def test_report_generator_scheduler(temp_db):
    """Test setup_report_scheduler starting background scheduler."""
    db_mgr, _ = temp_db
    with db_mgr.connection() as conn:
        generator = ReportGenerator(conn)
        scheduler = generator.setup_report_scheduler(recipient="user@example.com")
        if scheduler:
            assert scheduler.running is True
            scheduler.shutdown(wait=False)
