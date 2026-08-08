"""
MindLedger - Settings Configuration
App settings dataclass / Pydantic model for environment variables.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

from config.constants import (
    DEFAULT_DB_FILENAME,
    DEFAULT_HOST,
    DEFAULT_IDLE_THRESHOLD_SECONDS,
    DEFAULT_POLL_INTERVAL_SECONDS,
    DEFAULT_PORT,
)

# Load environment variables from .env if present
load_dotenv()


@dataclass
class Settings:
    """Application Settings dataclass.

    Attributes:
        app_host: Host binding for local API server (strictly 127.0.0.1).
        app_port: Local port for API server (default: 8787).
        log_level: Application log level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        database_path: Absolute or relative path to SQLite database file.
        poll_interval_seconds: Polling frequency for active window tracking.
        idle_threshold_seconds: Seconds of inactivity before idle state is triggered.
        smtp_server: Host for SMTP email delivery.
        smtp_port: Port for SMTP email delivery.
        smtp_username: SMTP login email address.
        smtp_password: SMTP app password or secret.
        report_recipient_email: Email address to receive report summaries.
    """

    app_host: str = os.getenv("APP_HOST", DEFAULT_HOST)
    app_port: int = int(os.getenv("APP_PORT", str(DEFAULT_PORT)))
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # Database
    database_path: str = os.getenv("DATABASE_PATH", DEFAULT_DB_FILENAME)

    # Tracking Configuration
    poll_interval_seconds: int = int(
        os.getenv("POLL_INTERVAL_SECONDS", str(DEFAULT_POLL_INTERVAL_SECONDS))
    )
    idle_threshold_seconds: int = int(
        os.getenv("IDLE_THRESHOLD_SECONDS", str(DEFAULT_IDLE_THRESHOLD_SECONDS))
    )

    # SMTP Settings (Optional until Phase 3)
    smtp_server: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: Optional[str] = os.getenv("SMTP_USERNAME")
    smtp_password: Optional[str] = os.getenv("SMTP_PASSWORD")
    report_recipient_email: Optional[str] = os.getenv("REPORT_RECIPIENT_EMAIL")

    def __post_init__(self) -> None:
        """Enforce security guardrails after initialization."""
        # Privacy Guardrail: Ensure app_host is strictly local
        if self.app_host not in ("127.0.0.1", "localhost"):
            raise ValueError(
                f"Security Violation: APP_HOST must be 127.0.0.1 for privacy-first architecture. Got: {self.app_host}"
            )


# Singleton settings instance
settings = Settings()
