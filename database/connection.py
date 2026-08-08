"""
MindLedger - Database Connection Manager
SQLite database manager supporting WAL mode, foreign keys, row dict factory, and connection context management.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional

from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseManager:
    """Manages SQLite database connections and transactions.

    Attributes:
        db_path: Path to the SQLite database file.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        """Initialize the DatabaseManager.

        Args:
            db_path: Path to database file. Defaults to settings.database_path.
        """
        self.db_path = db_path or settings.database_path
        self._ensure_db_dir()

    def _ensure_db_dir(self) -> None:
        """Ensure the directory containing the database file exists."""
        db_file = Path(self.db_path)
        if db_file.parent and not db_file.parent.exists():
            db_file.parent.mkdir(parents=True, exist_ok=True)

    def get_connection(self) -> sqlite3.Connection:
        """Create and configure a new SQLite connection.

        Returns:
            Configured sqlite3.Connection with Row factory, WAL mode, and 30s timeout enabled.
        """
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    @contextmanager
    def connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Context manager providing a transactional database connection.

        Yields:
            sqlite3.Connection instance with auto-commit on success or rollback on error.
        """
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database transaction error: {e}")
            raise
        finally:
            conn.close()


# Default singleton DatabaseManager instance
db_manager = DatabaseManager()
