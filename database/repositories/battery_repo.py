"""
MindLedger - Battery Repository
Data access layer for battery_logs SQLite table operations and historical time-series queries.

Author: MindLedger Team
Created: 2026-08-24
"""

import sqlite3
from datetime import datetime, date
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


class BatteryRepository:
    """Repository for managing battery_logs table and historical telemetry."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize BatteryRepository and ensure table exists.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection
        self.conn.row_factory = sqlite3.Row
        self._ensure_table()

    def _ensure_table(self) -> None:
        """Ensure battery_logs table exists with index."""
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS battery_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                percent INTEGER NOT NULL,
                is_plugged BOOLEAN NOT NULL,
                seconds_left INTEGER,
                discharge_rate_per_hour REAL,
                active_app TEXT,
                active_domain TEXT,
                top_drainer_name TEXT
            )
            """
        )
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_battery_timestamp ON battery_logs(timestamp)"
        )
        self.conn.commit()

    def log_snapshot(
        self,
        percent: int,
        is_plugged: bool,
        seconds_left: Optional[int] = None,
        discharge_rate: Optional[float] = None,
        active_app: Optional[str] = None,
        active_domain: Optional[str] = None,
        top_drainer_name: Optional[str] = None,
    ) -> int:
        """Log a battery telemetry point to database.

        Returns:
            The inserted row ID.
        """
        cursor = self.conn.execute(
            """
            INSERT INTO battery_logs (
                percent, is_plugged, seconds_left, discharge_rate_per_hour,
                active_app, active_domain, top_drainer_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                percent,
                1 if is_plugged else 0,
                seconds_left,
                discharge_rate,
                active_app,
                active_domain,
                top_drainer_name,
            ),
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_history(self, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve battery percentage and discharge rate history.

        Args:
            target_date: Date in YYYY-MM-DD format (defaults to today).

        Returns:
            List of dictionary points with time, percent, discharge_rate, is_plugged.
        """
        d_str = target_date or date.today().isoformat()
        cursor = self.conn.execute(
            """
            SELECT timestamp, percent, is_plugged, discharge_rate_per_hour, top_drainer_name
            FROM battery_logs
            WHERE date(timestamp) = ?
            ORDER BY timestamp ASC
            """,
            (d_str,),
        )
        rows = cursor.fetchall()
        return [
            {
                "timestamp": row["timestamp"],
                "percent": row["percent"],
                "is_plugged": bool(row["is_plugged"]),
                "discharge_rate": row["discharge_rate_per_hour"],
                "top_drainer": row["top_drainer_name"],
            }
            for row in rows
        ]
