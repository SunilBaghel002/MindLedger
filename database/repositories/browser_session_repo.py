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
        self.conn.commit()
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

    def get_by_date_range(self, start_date: str, end_date: str) -> List[BrowserSession]:
        """Fetch all browser sessions between start_date and end_date inclusive.

        Args:
            start_date: Start date string (YYYY-MM-DD).
            end_date: End date string (YYYY-MM-DD).

        Returns:
            List of BrowserSession models.
        """
        cursor = self.conn.execute(
            "SELECT * FROM browser_sessions WHERE date >= ? AND date <= ? ORDER BY started_at ASC",
            (start_date, end_date),
        )
        rows = cursor.fetchall()
        return [BrowserSession.from_row(row) for row in rows]

    def get_top_domains_range(
        self, start_date: str, end_date: str, category: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Calculate top domains visited within a date range by total duration and visit count.

        Args:
            start_date: Start date string (YYYY-MM-DD).
            end_date: End date string (YYYY-MM-DD).
            category: Optional productivity or category filter.
            limit: Maximum number of domains to return.

        Returns:
            List of dicts with domain, category, productivity, total_seconds, and visit_count.
        """
        if category and category.lower() != "all":
            cursor = self.conn.execute(
                """
                SELECT domain, MAX(category) as category, MAX(productivity) as productivity, SUM(duration_seconds) as total_seconds, COUNT(id) as visit_count
                FROM browser_sessions
                WHERE date >= ? AND date <= ? AND (LOWER(productivity) = ? OR LOWER(category) = ?)
                GROUP BY domain
                ORDER BY total_seconds DESC
                LIMIT ?
                """,
                (start_date, end_date, category.lower(), category.lower(), limit),
            )
        else:
            cursor = self.conn.execute(
                """
                SELECT domain, MAX(category) as category, MAX(productivity) as productivity, SUM(duration_seconds) as total_seconds, COUNT(id) as visit_count
                FROM browser_sessions
                WHERE date >= ? AND date <= ?
                GROUP BY domain
                ORDER BY total_seconds DESC
                LIMIT ?
                """,
                (start_date, end_date, limit),
            )

        return [
            {
                "domain": row["domain"],
                "category": row["category"],
                "productivity": row["productivity"],
                "total_seconds": row["total_seconds"],
                "visit_count": row["visit_count"],
            }
            for row in cursor.fetchall()
        ]

    def get_urls_for_domain(
        self, domain: str, start_date: str, end_date: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch URL breakdown and page titles visited under a specific domain within date range.

        Args:
            domain: Website domain string (e.g. github.com).
            start_date: Start date string (YYYY-MM-DD).
            end_date: End date string (YYYY-MM-DD).
            limit: Maximum number of URL records to return.

        Returns:
            List of dicts containing url, page_title, total_seconds, and visit_count.
        """
        cursor = self.conn.execute(
            """
            SELECT url, MAX(page_title) as page_title, SUM(duration_seconds) as total_seconds, COUNT(id) as visit_count
            FROM browser_sessions
            WHERE domain = ? AND date >= ? AND date <= ?
            GROUP BY url
            ORDER BY total_seconds DESC
            LIMIT ?
            """,
            (domain, start_date, end_date, limit),
        )
        return [
            {
                "url": row["url"],
                "page_title": row["page_title"],
                "total_seconds": row["total_seconds"],
                "visit_count": row["visit_count"],
            }
            for row in cursor.fetchall()
        ]
