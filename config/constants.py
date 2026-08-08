"""
MindLedger - Configuration Constants
Global application constants, default settings, and category definitions.

Author: MindLedger Team
Created: 2026-08-08
"""

from typing import Final, List

# Application Metadata
APP_NAME: Final[str] = "MindLedger"
APP_VERSION: Final[str] = "0.1.0"
APP_DESCRIPTION: Final[str] = "Personal Digital Wellbeing Desktop Application"

# Network & Server Constants
DEFAULT_HOST: Final[str] = "127.0.0.1"
DEFAULT_PORT: Final[int] = 8787
API_V1_PREFIX: Final[str] = "/api/v1"

# Tracking Defaults
DEFAULT_POLL_INTERVAL_SECONDS: Final[int] = 2
DEFAULT_IDLE_THRESHOLD_SECONDS: Final[int] = 300  # 5 minutes

# Database
DEFAULT_DB_FILENAME: Final[str] = "mindledger.db"

# Productivity Levels
PRODUCTIVITY_PRODUCTIVE: Final[str] = "productive"
PRODUCTIVITY_NEUTRAL: Final[str] = "neutral"
PRODUCTIVITY_UNPRODUCTIVE: Final[str] = "unproductive"

VALID_PRODUCTIVITY_LEVELS: Final[List[str]] = [
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_UNPRODUCTIVE,
]

# Core Categories
CATEGORY_CODING: Final[str] = "coding"
CATEGORY_LEARNING: Final[str] = "learning"
CATEGORY_BROWSING: Final[str] = "browsing"
CATEGORY_COMMUNICATION: Final[str] = "communication"
CATEGORY_ENTERTAINMENT: Final[str] = "entertainment"
CATEGORY_MUSIC: Final[str] = "music"
CATEGORY_SOCIAL_MEDIA: Final[str] = "social_media"
CATEGORY_YOUTUBE: Final[str] = "youtube"
CATEGORY_UNCATEGORIZED: Final[str] = "uncategorized"

VALID_CATEGORIES: Final[List[str]] = [
    CATEGORY_CODING,
    CATEGORY_LEARNING,
    CATEGORY_BROWSING,
    CATEGORY_COMMUNICATION,
    CATEGORY_ENTERTAINMENT,
    CATEGORY_MUSIC,
    CATEGORY_SOCIAL_MEDIA,
    CATEGORY_YOUTUBE,
    CATEGORY_UNCATEGORIZED,
]
