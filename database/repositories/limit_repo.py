"""
MindLedger - App & Domain Limits Repository
Data access layer for app_limits and app_limit_logs SQLite tables.

Author: MindLedger Team
Created: 2026-08-24
"""

import sqlite3
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


class LimitRepository:
    """Repository for managing app/website daily usage limits and logs."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize LimitRepository and ensure schema tables exist.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection
        self.conn.row_factory = sqlite3.Row
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        """Create app_limits and app_limit_logs tables if not existing."""
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_type TEXT NOT NULL CHECK(target_type IN ('app', 'domain')),
                target_identifier TEXT NOT NULL,
                display_name TEXT NOT NULL,
                daily_limit_minutes INTEGER NOT NULL,
                warning_threshold_minutes INTEGER,
                is_hard_block BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                max_snoozes_per_day INTEGER DEFAULT 2,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_target_unique ON app_limits(target_type, target_identifier)"
        )

        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_limit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                limit_id INTEGER NOT NULL,
                date DATE NOT NULL,
                used_seconds INTEGER DEFAULT 0,
                is_exceeded BOOLEAN DEFAULT 0,
                snoozes_used INTEGER DEFAULT 0,
                last_notified_at DATETIME,
                FOREIGN KEY(limit_id) REFERENCES app_limits(id) ON DELETE CASCADE
            )
            """
        )
        self.conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_limit_date ON app_limit_logs(limit_id, date)"
        )
        self.conn.commit()

    def create_limit(
        self,
        target_type: str,
        target_identifier: str,
        display_name: str,
        daily_limit_minutes: int,
        is_hard_block: bool = False,
        warning_threshold_minutes: Optional[int] = None,
        max_snoozes: int = 2,
    ) -> int:
        """Create a new daily limit rule."""
        clean_target = target_identifier.strip().lower()
        warn_mins = warning_threshold_minutes or int(daily_limit_minutes * 0.8)

        cursor = self.conn.execute(
            """
            INSERT INTO app_limits (
                target_type, target_identifier, display_name, daily_limit_minutes,
                warning_threshold_minutes, is_hard_block, is_active, max_snoozes_per_day
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (
                target_type.lower(),
                clean_target,
                display_name.strip(),
                daily_limit_minutes,
                warn_mins,
                1 if is_hard_block else 0,
                max_snoozes,
            ),
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_all_limits(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """Fetch all configured app/domain limits."""
        query = "SELECT * FROM app_limits"
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY id ASC"

        cursor = self.conn.execute(query)
        return [dict(row) for row in cursor.fetchall()]

    def get_limit_by_id(self, limit_id: int) -> Optional[Dict[str, Any]]:
        """Fetch a single limit by ID."""
        cursor = self.conn.execute(
            "SELECT * FROM app_limits WHERE id = ?",
            (limit_id,),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_limit_by_target(self, target_type: str, target_identifier: str) -> Optional[Dict[str, Any]]:
        """Find limit rule matching target type and identifier."""
        cursor = self.conn.execute(
            """
            SELECT * FROM app_limits 
            WHERE target_type = ? AND target_identifier = ? AND is_active = 1
            """,
            (target_type.lower(), target_identifier.strip().lower()),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def update_limit(
        self,
        limit_id: int,
        daily_limit_minutes: Optional[int] = None,
        warning_threshold_minutes: Optional[int] = None,
        is_hard_block: Optional[bool] = None,
        is_active: Optional[bool] = None,
    ) -> bool:
        """Update existing limit configuration."""
        fields = []
        params = []

        if daily_limit_minutes is not None:
            fields.append("daily_limit_minutes = ?")
            params.append(daily_limit_minutes)
        if warning_threshold_minutes is not None:
            fields.append("warning_threshold_minutes = ?")
            params.append(warning_threshold_minutes)
        if is_hard_block is not None:
            fields.append("is_hard_block = ?")
            params.append(1 if is_hard_block else 0)
        if is_active is not None:
            fields.append("is_active = ?")
            params.append(1 if is_active else 0)

        if not fields:
            return False

        params.append(limit_id)
        cursor = self.conn.execute(
            f"UPDATE app_limits SET {', '.join(fields)} WHERE id = ?",
            params,
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def delete_limit(self, limit_id: int) -> bool:
        """Delete a limit rule and its daily logs."""
        cursor = self.conn.execute(
            "DELETE FROM app_limits WHERE id = ?",
            (limit_id,),
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def get_or_create_daily_log(self, limit_id: int, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Get or initialize today's usage log for a limit."""
        d_str = target_date or date.today().isoformat()
        cursor = self.conn.execute(
            "SELECT * FROM app_limit_logs WHERE limit_id = ? AND date = ?",
            (limit_id, d_str),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)

        self.conn.execute(
            """
            INSERT OR IGNORE INTO app_limit_logs (limit_id, date, used_seconds, is_exceeded, snoozes_used)
            VALUES (?, ?, 0, 0, 0)
            """,
            (limit_id, d_str),
        )
        self.conn.commit()

        cursor = self.conn.execute(
            "SELECT * FROM app_limit_logs WHERE limit_id = ? AND date = ?",
            (limit_id, d_str),
        )
        return dict(cursor.fetchone())

    def record_usage(
        self,
        limit_id: int,
        added_seconds: int,
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add active seconds to today's usage log."""
        d_str = target_date or date.today().isoformat()
        self.get_or_create_daily_log(limit_id, d_str)

        self.conn.execute(
            """
            UPDATE app_limit_logs
            SET used_seconds = used_seconds + ?
            WHERE limit_id = ? AND date = ?
            """,
            (added_seconds, limit_id, d_str),
        )
        self.conn.commit()
        return self.get_or_create_daily_log(limit_id, d_str)

    def use_snooze(self, limit_id: int, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Increment snooze count for today."""
        d_str = target_date or date.today().isoformat()
        self.get_or_create_daily_log(limit_id, d_str)

        self.conn.execute(
            """
            UPDATE app_limit_logs
            SET snoozes_used = snoozes_used + 1
            WHERE limit_id = ? AND date = ?
            """,
            (limit_id, d_str),
        )
        self.conn.commit()
        return self.get_or_create_daily_log(limit_id, d_str)
