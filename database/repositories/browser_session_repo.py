"""
MindLedger - BrowserSession Repository
Data access repository for browser_sessions SQLite table operations.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from typing import Any, Dict, List, Optional

from database.models import BrowserSession
from utils.logger import get_logger

logger = get_logger(__name__)


class BrowserSessionRepository:
    """Repository for managing browser_sessions table operations."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize the repository with an active database connection.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection

    def save(self, session: BrowserSession) -> int:
        """Save a new browser tab session to the database.

        Args:
            session: BrowserSession model instance.

        Returns:
            The inserted row ID.
        """
        cursor = self.conn.execute(
            """
            INSERT INTO browser_sessions (
                url, domain, page_title, tab_id, started_at, ended_at,
                duration_seconds, is_active, category, subcategory,
                productivity, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session.url,
                session.domain,
                session.page_title,
                session.tab_id,
                session.started_at.isoformat(),
                session.ended_at.isoformat() if session.ended_at else None,
                session.duration_seconds,
                1 if session.is_active else 0,
                session.category,
                session.subcategory,
                session.productivity,
                session.date,
            ),
        )
        return cursor.lastrowid

    def get_by_id(self, session_id: int) -> Optional[BrowserSession]:
        """Fetch a browser session by its ID.

        Args:
            session_id: Primary key ID of the session.

        Returns:
            BrowserSession model or None if not found.
        """
        cursor = self.conn.execute(
            "SELECT * FROM browser_sessions WHERE id = ?",
            (session_id,),
        )
        row = cursor.fetchone()
        return BrowserSession.from_row(row) if row else None

    def get_by_date(self, date_str: str) -> List[BrowserSession]:
        """Fetch all browser sessions for a given date string (YYYY-MM-DD).

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            List of BrowserSession models.
        """
        cursor = self.conn.execute(
            "SELECT * FROM browser_sessions WHERE date = ? ORDER BY started_at ASC",
            (date_str,),
        )
        rows = cursor.fetchall()
        return [BrowserSession.from_row(row) for row in rows]

    def get_total_duration(self, date_str: str) -> int:
        """Calculate total browsing duration in seconds for a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            Total duration in seconds.
        """
        cursor = self.conn.execute(
            "SELECT SUM(duration_seconds) FROM browser_sessions WHERE date = ?",
            (date_str,),
        )
        result = cursor.fetchone()[0]
        return int(result) if result else 0

    def get_unique_domain_count(self, date_str: str) -> int:
        """Count unique domains visited on a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            Number of distinct domains.
        """
        cursor = self.conn.execute(
            "SELECT COUNT(DISTINCT domain) FROM browser_sessions WHERE date = ?",
            (date_str,),
        )
        result = cursor.fetchone()[0]
        return int(result) if result else 0

    def get_top_domains(self, date_str: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Calculate top domains visited on a given date by duration.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of domains to return.

        Returns:
            List of dicts containing domain, category, productivity, and total_seconds.
        """
        cursor = self.conn.execute(
            """
            SELECT domain, MAX(category) as category, MAX(productivity) as productivity, SUM(duration_seconds) as total_seconds
            FROM browser_sessions
            WHERE date = ?
            GROUP BY domain
            ORDER BY total_seconds DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        return [
            {
                "domain": row["domain"],
                "category": row["category"],
                "productivity": row["productivity"],
                "total_seconds": row["total_seconds"],
            }
            for row in cursor.fetchall()
        ]
