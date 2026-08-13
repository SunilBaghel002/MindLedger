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
    CATEGORY_JOB_SEARCH,
    CATEGORY_LEARNING,
    CATEGORY_MUSIC,
    CATEGORY_SOCIAL_MEDIA,
    CATEGORY_SYSTEM,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_UNPRODUCTIVE,
)
from utils.logger import get_logger

logger = get_logger(__name__)

# Default Category Rules (rule_type, pattern, category, subcategory, productivity, priority)
DEFAULT_CATEGORY_RULES: List[Tuple[str, str, str, str, str, int]] = [
    # Application Rules (process name exact/contains match)
    ("app", "code.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "code", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "cursor.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "cursor", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "antigravity.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "devenv.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "pycharm.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "pycharm64.exe", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "pycharm", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE, 100),
    ("app", "python.exe", CATEGORY_CODING, "interpreter", PRODUCTIVITY_PRODUCTIVE, 95),
    ("app", "pythonw.exe", CATEGORY_CODING, "interpreter", PRODUCTIVITY_PRODUCTIVE, 95),
    ("app", "python", CATEGORY_CODING, "interpreter", PRODUCTIVITY_PRODUCTIVE, 95),
    ("app", "chrome.exe", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "chrome", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "msedge.exe", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "msedge", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "brave.exe", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "firefox.exe", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL, 80),
    ("app", "windowsterminal.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "cmd.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "powershell.exe", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "githubdesktop.exe", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "postman.exe", CATEGORY_CODING, "api_testing", PRODUCTIVITY_PRODUCTIVE, 90),
    ("app", "discord.exe", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_NEUTRAL, 50),
    ("app", "slack.exe", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_PRODUCTIVE, 80),
    ("app", "teams.exe", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_PRODUCTIVE, 80),
    ("app", "spotify.exe", CATEGORY_MUSIC, "listening", PRODUCTIVITY_NEUTRAL, 50),
    ("app", "vlc.exe", CATEGORY_ENTERTAINMENT, "movies", PRODUCTIVITY_UNPRODUCTIVE, 50),
    ("app", "explorer.exe", CATEGORY_SYSTEM, "file_manager", PRODUCTIVITY_NEUTRAL, 40),
    ("app", "notepad.exe", CATEGORY_SYSTEM, "other", PRODUCTIVITY_NEUTRAL, 40),

    # Domain Rules
    ("domain", "github.com", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "gitlab.com", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "stackoverflow.com", CATEGORY_CODING, "debugging", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "leetcode.com", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "hackerrank.com", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "developer.mozilla.org", CATEGORY_LEARNING, "documentation", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "docs.python.org", CATEGORY_LEARNING, "documentation", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "medium.com", CATEGORY_LEARNING, "reading", PRODUCTIVITY_PRODUCTIVE, 80),
    ("domain", "dev.to", CATEGORY_LEARNING, "reading", PRODUCTIVITY_PRODUCTIVE, 90),
    ("domain", "udemy.com", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "coursera.org", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "linkedin.com", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE, 80),
    ("domain", "naukri.com", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("domain", "indeed.com", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("domain", "wellfound.com", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE, 90),
    ("domain", "chatgpt.com", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 95),
    ("domain", "chat.openai.com", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 95),
    ("domain", "openai.com", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 95),
    ("domain", "claude.ai", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 95),
    ("domain", "lmarina.in", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "lmarina.com", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "lmarina.edu", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "gateoverflow.in", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "geeksforgeeks.org", CATEGORY_LEARNING, "documentation", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "nptel.ac.in", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "unacademy.com", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "pw.live", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 100),
    ("domain", "google.com", CATEGORY_BROWSING, "search", PRODUCTIVITY_NEUTRAL, 50),
    ("domain", "mail.google.com", CATEGORY_COMMUNICATION, "email", PRODUCTIVITY_NEUTRAL, 60),
    ("domain", "youtube.com", CATEGORY_BROWSING, "video", PRODUCTIVITY_NEUTRAL, 40),
    ("domain", "reddit.com", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE, 60),
    ("domain", "twitter.com", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE, 60),
    ("domain", "x.com", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE, 60),
    ("domain", "instagram.com", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE, 70),
    ("domain", "facebook.com", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE, 70),
    ("domain", "netflix.com", CATEGORY_ENTERTAINMENT, "movies", PRODUCTIVITY_UNPRODUCTIVE, 80),
    ("domain", "crunchyroll.com", CATEGORY_ENTERTAINMENT, "anime", PRODUCTIVITY_UNPRODUCTIVE, 80),

    # Window Title Pattern Rules (priority 110 to override app executable rules like chrome.exe)
    ("title_pattern", "leetcode", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "github", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "gitlab", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "chatgpt", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "claude", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "lmarina", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "gate smashers", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "neso academy", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "knowledge gate", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 110),
    ("title_pattern", "gate", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 110),

    # YouTube Channel Rules
    ("youtube_channel", "Fireship", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Traversy Media", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "freeCodeCamp.org", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "freeCodeCamp", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Web Dev Simplified", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "The Net Ninja", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Programming with Mosh", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Gate Smashers", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Neso Academy", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Knowledge Gate", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Unacademy Computer Science", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Physics Wallah", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "GeeksforGeeks", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Jenny's Lectures CS IT", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Abdul Bari", CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Amit Khurana", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Ravindrababu Ravula", CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE, 100),
    ("youtube_channel", "Lofi Girl", CATEGORY_MUSIC, "lofi", PRODUCTIVITY_NEUTRAL, 90),
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
        else:
            cursor.execute(
                """
                UPDATE category_rules
                SET category = ?, subcategory = ?, productivity = ?, priority = ?
                WHERE rule_type = ? AND pattern = ?
                """,
                (category, subcategory, productivity, priority, rule_type, pattern),
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
