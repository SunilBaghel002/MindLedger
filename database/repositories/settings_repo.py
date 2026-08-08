"""
MindLedger - Settings Repository
Data access repository for key-value settings stored in SQLite database.

Author: MindLedger Team
Created: 2026-08-08
"""

import json
import sqlite3
from typing import Any, Dict, Optional

from database.models import SettingItem
from utils.logger import get_logger

logger = get_logger(__name__)


class SettingsRepository:
    """Repository for managing application settings in the settings table."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize the repository with an active database connection.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Retrieve a setting value by key.

        Args:
            key: Setting key name.
            default: Default value if key is not found.

        Returns:
            Setting value string or default.
        """
        cursor = self.conn.execute(
            "SELECT value FROM settings WHERE key = ?",
            (key,),
        )
        row = cursor.fetchone()
        return row["value"] if row else default

    def set(self, key: str, value: Any, data_type: str = "string") -> bool:
        """Set or update a setting value.

        Args:
            key: Setting key name.
            value: Setting value.
            data_type: Setting type string ('string', 'integer', 'boolean', 'json').

        Returns:
            True if setting saved successfully.
        """
        if data_type == "json" and not isinstance(value, str):
            val_str = json.dumps(value)
        else:
            val_str = str(value)

        cursor = self.conn.execute(
            """
            INSERT INTO settings (key, value, data_type, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                data_type = excluded.data_type,
                updated_at = CURRENT_TIMESTAMP
            """,
            (key, val_str, data_type),
        )
        return cursor.rowcount > 0

    def get_all(self) -> Dict[str, SettingItem]:
        """Fetch all settings as a dictionary keyed by setting name.

        Returns:
            Dict mapping key to SettingItem models.
        """
        cursor = self.conn.execute("SELECT * FROM settings")
        rows = cursor.fetchall()
        return {row["key"]: SettingItem.from_row(row) for row in rows}
