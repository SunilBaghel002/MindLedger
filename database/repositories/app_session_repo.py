"""
MindLedger - AppSession Repository
Data access repository for app_sessions SQLite table operations.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from database.models import AppSession
from utils.logger import get_logger

logger = get_logger(__name__)


class AppSessionRepository:
    """Repository for managing app_sessions table operations."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize the repository with an active database connection.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection

    def save(self, session: AppSession) -> int:
        """Save a new application tracking session to the database.

        Args:
            session: AppSession model instance.

        Returns:
            The inserted row ID.
        """
        cursor = self.conn.execute(
            """
            INSERT INTO app_sessions (
                app_name, app_path, window_title, started_at, ended_at,
                duration_seconds, is_foreground, category, subcategory,
                productivity, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.app_name,
                session.app_path,
                session.window_title,
                session.started_at.isoformat(),
                session.ended_at.isoformat() if session.ended_at else None,
                session.duration_seconds,
                1 if session.is_foreground else 0,
                session.category,
                session.subcategory,
                session.productivity,
                session.date,
            ),
        )
        self.conn.commit()
        return cursor.lastrowid

    def update_ended_at(self, session_id: int, ended_at: datetime, duration_seconds: int) -> bool:
        """Update an existing session with its ending timestamp and total duration.

        Args:
            session_id: Row ID of the session.
            ended_at: Timestamp when session ended.
            duration_seconds: Calculated duration in seconds.

        Returns:
            True if row updated, False otherwise.
        """
        cursor = self.conn.execute(
            """
            UPDATE app_sessions
            SET ended_at = ?, duration_seconds = ?
            WHERE id = ?
            """,
            (ended_at.isoformat(), duration_seconds, session_id),
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def update_duration(self, session_id: int, duration_seconds: int) -> bool:
        """Update an active session's current duration in real-time.

        Args:
            session_id: Row ID of the session.
            duration_seconds: Calculated duration in seconds.

        Returns:
            True if row updated, False otherwise.
        """
        cursor = self.conn.execute(
            """
            UPDATE app_sessions
            SET duration_seconds = ?
            WHERE id = ?
            """,
            (duration_seconds, session_id),
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def get_by_id(self, session_id: int) -> Optional[AppSession]:
        """Fetch an application session by its ID.

        Args:
            session_id: Primary key ID of the session.

        Returns:
            AppSession model or None if not found.
        """
        cursor = self.conn.execute(
            "SELECT * FROM app_sessions WHERE id = ?",
            (session_id,),
        )
        row = cursor.fetchone()
        return AppSession.from_row(row) if row else None

    def get_by_date(self, date_str: str) -> List[AppSession]:
        """Fetch all application sessions for a given date string (YYYY-MM-DD).

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            List of AppSession models.
        """
        cursor = self.conn.execute(
            "SELECT * FROM app_sessions WHERE date = ? ORDER BY started_at ASC",
            (date_str,),
        )
        rows = cursor.fetchall()
        return [AppSession.from_row(row) for row in rows]

    def get_top_apps(self, date_str: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Calculate top applications used on a given date by duration.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of apps to return.

        Returns:
            List of dicts containing app_name and total_seconds.
        """
        cursor = self.conn.execute(
            """
            SELECT app_name, MAX(category) as category, MAX(productivity) as productivity, SUM(duration_seconds) as total_seconds
            FROM app_sessions
            WHERE date = ? AND is_foreground = 1
            GROUP BY app_name
            ORDER BY total_seconds DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        return [
            {
                "app_name": row["app_name"],
                "category": row["category"],
                "productivity": row["productivity"],
                "total_seconds": row["total_seconds"],
            }
            for row in cursor.fetchall()
        ]

    def get_latest_session(self) -> Optional[AppSession]:
        """Fetch the most recent application session.

        Returns:
            AppSession model or None if table is empty.
        """
        cursor = self.conn.execute(
            "SELECT * FROM app_sessions ORDER BY id DESC LIMIT 1"
        )
        row = cursor.fetchone()
        return AppSession.from_row(row) if row else None

