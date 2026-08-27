"""
MindLedger - Water Repository
Data access layer for water_logs SQLite table operations and daily hydration analytics.

Author: MindLedger Team
Created: 2026-08-24
"""

import sqlite3
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


class WaterRepository:
    """Repository for managing water_logs table and daily intake history."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize WaterRepository and ensure schema table exists.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection
        self.conn.row_factory = sqlite3.Row
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        """Create water_logs table if not existing."""
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS water_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                amount_ml INTEGER NOT NULL DEFAULT 250,
                source TEXT NOT NULL CHECK(source IN ('notification_button', 'dashboard_widget', 'tray_menu', 'topbar', 'manual')),
                daily_goal_ml INTEGER DEFAULT 2000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_water_timestamp ON water_logs(timestamp)"
        )
        self.conn.commit()

    def log_drink(
        self,
        amount_ml: int = 250,
        source: str = "dashboard_widget",
        daily_goal_ml: int = 2000,
        timestamp: Optional[str] = None,
    ) -> int:
        """Record a hydration event.

        Returns:
            Inserted row ID.
        """
        valid_sources = {"notification_button", "dashboard_widget", "tray_menu", "topbar", "manual"}
        norm_source = source if source in valid_sources else "dashboard_widget"
        ts = timestamp or datetime.now().isoformat()
        cursor = self.conn.execute(
            """
            INSERT INTO water_logs (timestamp, amount_ml, source, daily_goal_ml)
            VALUES (?, ?, ?, ?)
            """,
            (ts, amount_ml, norm_source, daily_goal_ml),
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_today_intake(self, target_date: Optional[str] = None) -> int:
        """Get total milliliters of water consumed on target date."""
        d_str = target_date or date.today().isoformat()
        cursor = self.conn.execute(
            """
            SELECT COALESCE(SUM(amount_ml), 0) AS total_ml
            FROM water_logs
            WHERE date(timestamp) = ?
            """,
            (d_str,),
        )
        row = cursor.fetchone()
        return int(row["total_ml"]) if row else 0

    def get_today_logs(self, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get list of hydration events logged for target date."""
        d_str = target_date or date.today().isoformat()
        cursor = self.conn.execute(
            """
            SELECT id, timestamp, amount_ml, source, daily_goal_ml
            FROM water_logs
            WHERE date(timestamp) = ?
            ORDER BY timestamp DESC
            """,
            (d_str,),
        )
        return [dict(r) for r in cursor.fetchall()]

    def get_history(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get daily total water consumption summary for recent days."""
        cursor = self.conn.execute(
            """
            SELECT 
                date(timestamp) AS date,
                SUM(amount_ml) AS total_ml,
                COUNT(*) AS drink_count,
                MAX(daily_goal_ml) AS daily_goal_ml
            FROM water_logs
            WHERE timestamp >= datetime('now', ?)
            GROUP BY date(timestamp)
            ORDER BY date(timestamp) ASC
            """,
            (f"-{days} days",),
        )
        return [dict(r) for r in cursor.fetchall()]
