"""
MindLedger - Database Migration v002 Performance Indexes
Creates compound database indexes for high-frequency analytics and real-time dashboard queries.

Author: MindLedger Team
Created: 2026-08-11
"""

import sqlite3
from utils.logger import get_logger

logger = get_logger(__name__)


def up(conn: sqlite3.Connection) -> None:
    """Apply migration v002: Create performance compound indexes.

    Args:
        conn: sqlite3 connection instance.
    """
    logger.info("Running database migration v002_performance_indexes (UP)...")
    cursor = conn.cursor()

    # Compound index for app_sessions analytics queries (date range, foreground state, productivity)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_app_sessions_date_fg_prod ON app_sessions(date, is_foreground, productivity);"
    )

    # Compound index for app_sessions category filtering
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_app_sessions_date_fg_cat ON app_sessions(date, is_foreground, category);"
    )

    # Index on active sessions lookup (ended_at IS NULL)
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_app_sessions_ended_at ON app_sessions(ended_at);"
    )

    # Compound index for browser domain range queries
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_browser_sessions_date_domain ON browser_sessions(date, domain);"
    )

    # Compound index for YouTube channel activity range queries
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_youtube_activity_date_channel ON youtube_activity(date, channel_name);"
    )

    logger.info("Database migration v002_performance_indexes completed successfully.")


def down(conn: sqlite3.Connection) -> None:
    """Revert migration v002: Drop performance compound indexes.

    Args:
        conn: sqlite3 connection instance.
    """
    logger.info("Reverting database migration v002_performance_indexes (DOWN)...")
    cursor = conn.cursor()

    cursor.execute("DROP INDEX IF EXISTS idx_app_sessions_date_fg_prod;")
    cursor.execute("DROP INDEX IF EXISTS idx_app_sessions_date_fg_cat;")
    cursor.execute("DROP INDEX IF EXISTS idx_app_sessions_ended_at;")
    cursor.execute("DROP INDEX IF EXISTS idx_browser_sessions_date_domain;")
    cursor.execute("DROP INDEX IF EXISTS idx_youtube_activity_date_channel;")

    logger.info("Database migration v002_performance_indexes reverted successfully.")
