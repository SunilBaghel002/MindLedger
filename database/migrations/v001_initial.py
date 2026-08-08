"""
MindLedger - Database Migration v001 Initial
Initial database schema migration creating core tables and indexes.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from utils.logger import get_logger

logger = get_logger(__name__)


def up(conn: sqlite3.Connection) -> None:
    """Apply migration: Create all core tables and indexes.

    Args:
        conn: sqlite3 connection instance.
    """
    logger.info("Running database migration v001_initial (UP)...")

    cursor = conn.cursor()

    # 1. Application Sessions Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS app_sessions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name        TEXT NOT NULL,
            app_path        TEXT,
            window_title    TEXT,
            started_at      TIMESTAMP NOT NULL,
            ended_at        TIMESTAMP,
            duration_seconds INTEGER DEFAULT 0,
            is_foreground   BOOLEAN DEFAULT 1,
            category        TEXT DEFAULT 'uncategorized',
            subcategory     TEXT,
            productivity    TEXT DEFAULT 'neutral',
            date            TEXT NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 2. Browser Sessions Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS browser_sessions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            url             TEXT NOT NULL,
            domain          TEXT NOT NULL,
            page_title      TEXT,
            tab_id          INTEGER,
            started_at      TIMESTAMP NOT NULL,
            ended_at        TIMESTAMP,
            duration_seconds INTEGER DEFAULT 0,
            is_active       BOOLEAN DEFAULT 1,
            category        TEXT DEFAULT 'uncategorized',
            subcategory     TEXT,
            productivity    TEXT DEFAULT 'neutral',
            date            TEXT NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 3. YouTube Activity Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS youtube_activity (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            video_url             TEXT,
            video_id              TEXT,
            video_title           TEXT,
            channel_name          TEXT,
            channel_url           TEXT,
            channel_id            TEXT,
            started_at            TIMESTAMP NOT NULL,
            ended_at              TIMESTAMP,
            watch_duration_seconds INTEGER DEFAULT 0,
            video_category        TEXT DEFAULT 'uncategorized',
            is_productive         BOOLEAN,
            date                  TEXT NOT NULL,
            created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 4. Daily Summaries Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_summaries (
            id                        INTEGER PRIMARY KEY AUTOINCREMENT,
            date                      TEXT UNIQUE NOT NULL,
            total_screen_time_seconds INTEGER DEFAULT 0,
            active_time_seconds       INTEGER DEFAULT 0,
            idle_time_seconds         INTEGER DEFAULT 0,
            productive_seconds        INTEGER DEFAULT 0,
            neutral_seconds           INTEGER DEFAULT 0,
            unproductive_seconds      INTEGER DEFAULT 0,
            learning_seconds          INTEGER DEFAULT 0,
            coding_seconds            INTEGER DEFAULT 0,
            browsing_seconds          INTEGER DEFAULT 0,
            youtube_seconds           INTEGER DEFAULT 0,
            communication_seconds     INTEGER DEFAULT 0,
            most_used_app             TEXT,
            most_used_app_seconds     INTEGER DEFAULT 0,
            most_visited_domain       TEXT,
            most_visited_domain_seconds INTEGER DEFAULT 0,
            most_watched_channel      TEXT,
            most_watched_channel_seconds INTEGER DEFAULT 0,
            total_apps_used           INTEGER DEFAULT 0,
            total_domains_visited     INTEGER DEFAULT 0,
            total_youtube_videos      INTEGER DEFAULT 0,
            productivity_score        REAL DEFAULT 0.0,
            top_apps_json             TEXT,
            top_domains_json          TEXT,
            top_channels_json         TEXT,
            insights_json             TEXT,
            email_sent                BOOLEAN DEFAULT 0,
            created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 5. Periodic Summaries Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS periodic_summaries (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            period_type           TEXT NOT NULL,
            period_label          TEXT NOT NULL,
            period_start          TEXT NOT NULL,
            period_end            TEXT NOT NULL,
            total_screen_time_seconds INTEGER DEFAULT 0,
            productive_seconds    INTEGER DEFAULT 0,
            unproductive_seconds  INTEGER DEFAULT 0,
            learning_seconds      INTEGER DEFAULT 0,
            avg_daily_seconds     INTEGER DEFAULT 0,
            avg_productivity_score REAL DEFAULT 0.0,
            best_day              TEXT,
            worst_day             TEXT,
            top_apps_json         TEXT,
            top_domains_json      TEXT,
            top_channels_json     TEXT,
            trends_json           TEXT,
            comparison_json       TEXT,
            email_sent            BOOLEAN DEFAULT 0,
            created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 6. Category Rules Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS category_rules (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_type   TEXT NOT NULL,
            pattern     TEXT NOT NULL,
            category    TEXT NOT NULL,
            subcategory TEXT,
            productivity TEXT NOT NULL,
            priority    INTEGER DEFAULT 0,
            is_active   BOOLEAN DEFAULT 1,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 7. Settings Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT NOT NULL,
            data_type   TEXT DEFAULT 'string',
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # 8. Tracking State Table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tracking_state (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            last_app_name   TEXT,
            last_window     TEXT,
            last_timestamp  TIMESTAMP,
            is_idle         BOOLEAN DEFAULT 0,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    # Performance Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_date ON app_sessions(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_name ON app_sessions(app_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_category ON app_sessions(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_browser_date ON browser_sessions(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_browser_domain ON browser_sessions(domain);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_youtube_date ON youtube_activity(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_youtube_channel ON youtube_activity(channel_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_summaries(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_type ON category_rules(rule_type);")

    logger.info("Database migration v001_initial completed successfully.")


def down(conn: sqlite3.Connection) -> None:
    """Revert migration: Drop all created tables.

    Args:
        conn: sqlite3 connection instance.
    """
    logger.info("Reverting database migration v001_initial (DOWN)...")
    cursor = conn.cursor()
    tables = [
        "app_sessions",
        "browser_sessions",
        "youtube_activity",
        "daily_summaries",
        "periodic_summaries",
        "category_rules",
        "settings",
        "tracking_state",
    ]
    for table in tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table};")
    logger.info("Database migration v001_initial reverted successfully.")
