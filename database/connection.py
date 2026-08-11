"""
MindLedger - Database Connection Manager
SQLite database manager supporting connection pooling, WAL mode, foreign keys, row dict factory, and performance PRAGMAs.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import queue
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Optional, Tuple

from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseManager:
    """Manages thread-safe SQLite database connection pooling and transactions.

    Attributes:
        db_path: Path to the SQLite database file.
        max_connections: Maximum pool capacity for reusable connections.
    """

    def __init__(self, db_path: Optional[str] = None, max_connections: int = 10) -> None:
        """Initialize the DatabaseManager with connection pool.

        Args:
            db_path: Path to database file. Defaults to settings.database_path.
            max_connections: Maximum reusable connections in pool.
        """
        self._custom_db_path = db_path
        self.max_connections = max_connections
        self._pool: queue.Queue[Tuple[sqlite3.Connection, str]] = queue.Queue(maxsize=max_connections)
        self._created_count = 0
        self._lock = threading.Lock()
        self._ensure_db_dir()

    @property
    def db_path(self) -> str:
        """Dynamic database path property falling back to settings.database_path."""
        return self._custom_db_path or settings.database_path

    @db_path.setter
    def db_path(self, value: str) -> None:
        """Set custom database path and clear pooled connections to prevent target mismatch."""
        self._custom_db_path = value
        self.clear_pool()
        self._ensure_db_dir()

    @db_path.deleter
    def db_path(self) -> None:
        """Reset custom database path and clear pool for unit test mock patch cleanup."""
        self._custom_db_path = None
        self.clear_pool()


    def _ensure_db_dir(self) -> None:
        """Ensure the directory containing the database file exists."""
        db_file = Path(self.db_path)
        if db_file.parent and not db_file.parent.exists():
            db_file.parent.mkdir(parents=True, exist_ok=True)

    def _configure_pragmas(self, conn: sqlite3.Connection) -> None:
        """Apply performance and integrity PRAGMAs to SQLite connection.

        Args:
            conn: sqlite3 connection instance.
        """
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA cache_size=-64000;")  # 64MB cache
        conn.execute("PRAGMA temp_store=MEMORY;")
        try:
            conn.execute("PRAGMA mmap_size=268435456;")  # 256MB mmap
        except sqlite3.OperationalError:
            pass

    def get_connection(self) -> sqlite3.Connection:
        """Fetch a connection from the pool or create a new configured connection.

        Returns:
            Configured sqlite3.Connection instance matching current db_path.
        """
        current_path = self.db_path

        while not self._pool.empty():
            try:
                conn, conn_path = self._pool.get_nowait()
                if conn_path == current_path:
                    try:
                        conn.execute("SELECT 1;")
                        return conn
                    except (sqlite3.Error, AttributeError):
                        pass
                else:
                    try:
                        conn.close()
                    except Exception:
                        pass
            except queue.Empty:
                break

        with self._lock:
            self._created_count += 1

        conn = sqlite3.connect(current_path, timeout=30.0, check_same_thread=False)
        self._configure_pragmas(conn)
        return conn

    def release_connection(self, conn: sqlite3.Connection) -> None:
        """Return a connection back to the pool, or close if pool is full/target changed.

        Args:
            conn: sqlite3 connection instance to release.
        """
        current_path = self.db_path
        try:
            self._pool.put_nowait((conn, current_path))
        except queue.Full:
            try:
                conn.close()
            except Exception:
                pass

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
            self.release_connection(conn)

    def pool_stats(self) -> dict:
        """Get live metrics on connection pool usage.

        Returns:
            Dict containing pool size, available connections, and total created connections.
        """
        return {
            "max_connections": self.max_connections,
            "available_in_pool": self._pool.qsize(),
            "total_created": self._created_count,
        }

    def clear_pool(self) -> None:
        """Clear and close all pooled connections."""
        while not self._pool.empty():
            try:
                conn, _ = self._pool.get_nowait()
                conn.close()
            except Exception:
                pass

    def close_all(self) -> None:
        """Close all pooled connections cleanly."""
        self.clear_pool()


# Default singleton DatabaseManager instance
db_manager = DatabaseManager()
