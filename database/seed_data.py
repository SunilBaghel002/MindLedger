"""
MindLedger - Seed Data Manager
Seeds default category classification rules and application settings into SQLite database.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from typing import List, Tuple

from config.constants import (
    CATEGORY_BROWSING,
    CATEGORY_CODING,
    CATEGORY_COMMUNICATION,
    CATEGORY_ENTERTAINMENT,
    CATEGORY_LEARNING,
    CATEGORY_MUSIC,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_UNPRODUCTIVE,
)
from utils.logger import get_logger

logger = get_logger(__name__)

# Default Category Rules (rule_type, pattern, category, subcategory, productivity, priority)
DEFAULT_CATEGORY_RULES: List[Tuple[str, str, str, str, str, int]] = [
    # Applications
    ("app", "code.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "devenv.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "pycharm.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "windowsterminal.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "cmd.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "powershell.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "discord.exe", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_NEUTRAL, 50),
    ("app", "slack.exe", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_PRODUCTIVE, 80),
    ("app", "spotify.exe", CATEGORY_MUSIC, "music", PRODUCTIVITY_NEUTRAL, 50),
    ("app", "vlc.exe", CATEGORY_ENTERTAINMENT, "media", PRODUCTIVITY_UNPRODUCTIVE, 50),

    # Domains
    ("domain", "github.com", CATEGORY_CODING, "repository", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "stackoverflow.com", CATEGORY_LEARNING, "qa", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "leetcode.com", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "linkedin.com", CATEGORY_BROWSING, "jobs", PRODUCTIVITY_NEUTRAL, 70),
    ("domain", "youtube.com", CATEGORY_ENTERTAINMENT, "video", PRODUCTIVITY_NEUTRAL, 50),
    ("domain", "reddit.com", CATEGORY_ENTERTAINMENT, "social", PRODUCTIVITY_UNPRODUCTIVE, 60),
    ("domain", "twitter.com", CATEGORY_ENTERTAINMENT, "social", PRODUCTIVITY_UNPRODUCTIVE, 60),
    ("domain", "x.com", CATEGORY_ENTERTAINMENT, "social", PRODUCTIVITY_UNPRODUCTIVE, 60),
]

DEFAULT_SETTINGS: List[Tuple[str, str, str]] = [
    ("poll_interval_seconds", "2", "integer"),
    ("idle_threshold_seconds", "300", "integer"),
    ("auto_start_on_boot", "true", "boolean"),
    ("daily_report_time", "23:55", "string"),
]


def seed_database(conn: sqlite3.Connection) -> None:
    """Seed initial category rules and settings if database is empty.

    Args:
        conn: sqlite3 Connection instance.
    """
    logger.info("Seeding initial database rules and settings...")

    cursor = conn.cursor()

    # Seed Category Rules
    for rule in DEFAULT_CATEGORY_RULES:
        rule_type, pattern, category, subcategory, productivity, priority = rule
        cursor.execute(
            "SELECT 1 FROM category_rules WHERE rule_type = ? AND pattern = ?",
            (rule_type, pattern),
        )
        if not cursor.fetchone():
            cursor.execute(
                """
                INSERT INTO category_rules
                    (rule_type, pattern, category, subcategory, productivity, priority)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (rule_type, pattern, category, subcategory, productivity, priority),
            )

    # Seed Default Settings
    for setting in DEFAULT_SETTINGS:
        key, value, data_type = setting
        cursor.execute(
            """
            INSERT OR IGNORE INTO settings (key, value, data_type)
            VALUES (?, ?, ?)
            """,
            (key, value, data_type),
        )

    logger.info("Database seeding completed.")
