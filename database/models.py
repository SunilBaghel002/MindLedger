"""
MindLedger - Database Models
Pydantic v2 data models for application sessions, browser sessions, YouTube tracking, summaries, rules, and settings.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from config.constants import (
    CATEGORY_UNCATEGORIZED,
    PRODUCTIVITY_NEUTRAL,
)


class AppSession(BaseModel):
    """Pydantic model representing an application tracking session."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    app_name: str
    app_path: Optional[str] = None
    window_title: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    is_foreground: bool = True
    category: str = CATEGORY_UNCATEGORIZED
    subcategory: Optional[str] = None
    productivity: str = PRODUCTIVITY_NEUTRAL
    date: str
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "AppSession":
        """Instantiate AppSession model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("started_at"), str):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        if isinstance(data.get("ended_at"), str) and data["ended_at"]:
            data["ended_at"] = datetime.fromisoformat(data["ended_at"])
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["is_foreground"] = bool(data.get("is_foreground", True))
        return cls(**data)


class BrowserSession(BaseModel):
    """Pydantic model representing a browser tab tracking session."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    url: str
    domain: str
    page_title: Optional[str] = None
    tab_id: Optional[int] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    is_active: bool = True
    category: str = CATEGORY_UNCATEGORIZED
    subcategory: Optional[str] = None
    productivity: str = PRODUCTIVITY_NEUTRAL
    date: str
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "BrowserSession":
        """Instantiate BrowserSession model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("started_at"), str):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        if isinstance(data.get("ended_at"), str) and data["ended_at"]:
            data["ended_at"] = datetime.fromisoformat(data["ended_at"])
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["is_active"] = bool(data.get("is_active", True))
        return cls(**data)


class YouTubeActivity(BaseModel):
    """Pydantic model representing YouTube video watching activity."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    video_title: Optional[str] = None
    channel_name: Optional[str] = None
    channel_url: Optional[str] = None
    channel_id: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    watch_duration_seconds: int = 0
    video_category: str = CATEGORY_UNCATEGORIZED
    is_productive: Optional[bool] = None
    date: str
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "YouTubeActivity":
        """Instantiate YouTubeActivity model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("started_at"), str):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        if isinstance(data.get("ended_at"), str) and data["ended_at"]:
            data["ended_at"] = datetime.fromisoformat(data["ended_at"])
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if data.get("is_productive") is not None:
            data["is_productive"] = bool(data["is_productive"])
        return cls(**data)


class DailySummary(BaseModel):
    """Pydantic model representing a daily aggregated activity summary."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    date: str
    total_screen_time_seconds: int = 0
    active_time_seconds: int = 0
    idle_time_seconds: int = 0
    productive_seconds: int = 0
    neutral_seconds: int = 0
    unproductive_seconds: int = 0
    learning_seconds: int = 0
    coding_seconds: int = 0
    browsing_seconds: int = 0
    youtube_seconds: int = 0
    communication_seconds: int = 0
    most_used_app: Optional[str] = None
    most_used_app_seconds: int = 0
    most_visited_domain: Optional[str] = None
    most_visited_domain_seconds: int = 0
    most_watched_channel: Optional[str] = None
    most_watched_channel_seconds: int = 0
    total_apps_used: int = 0
    total_domains_visited: int = 0
    total_youtube_videos: int = 0
    productivity_score: float = 0.0
    top_apps_json: Optional[str] = None
    top_domains_json: Optional[str] = None
    top_channels_json: Optional[str] = None
    insights_json: Optional[str] = None
    email_sent: bool = False
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "DailySummary":
        """Instantiate DailySummary model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["email_sent"] = bool(data.get("email_sent", False))
        return cls(**data)


class PeriodicSummary(BaseModel):
    """Pydantic model representing a weekly or monthly aggregated activity summary."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    period_type: str  # 'weekly' or 'monthly'
    period_label: str
    period_start: str
    period_end: str
    total_screen_time_seconds: int = 0
    productive_seconds: int = 0
    unproductive_seconds: int = 0
    learning_seconds: int = 0
    avg_daily_seconds: int = 0
    avg_productivity_score: float = 0.0
    best_day: Optional[str] = None
    worst_day: Optional[str] = None
    top_apps_json: Optional[str] = None
    top_domains_json: Optional[str] = None
    top_channels_json: Optional[str] = None
    trends_json: Optional[str] = None
    comparison_json: Optional[str] = None
    email_sent: bool = False
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "PeriodicSummary":
        """Instantiate PeriodicSummary model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["email_sent"] = bool(data.get("email_sent", False))
        return cls(**data)


class CategoryRule(BaseModel):
    """Pydantic model representing a classification rule."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    rule_type: str  # 'app', 'domain', 'url_pattern', 'title_pattern'
    pattern: str
    category: str
    subcategory: Optional[str] = None
    productivity: str  # 'productive', 'neutral', 'unproductive'
    priority: int = 0
    is_active: bool = True
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "CategoryRule":
        """Instantiate CategoryRule model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["is_active"] = bool(data.get("is_active", True))
        return cls(**data)


class SettingItem(BaseModel):
    """Pydantic model representing a key-value user setting."""

    model_config = ConfigDict(from_attributes=True)

    key: str
    value: str
    data_type: str = "string"
    updated_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "SettingItem":
        """Instantiate SettingItem model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("updated_at"), str) and data["updated_at"]:
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        return cls(**data)


class TrackingState(BaseModel):
    """Pydantic model representing tracking state for recovery across restarts."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    last_app_name: Optional[str] = None
    last_window: Optional[str] = None
    last_timestamp: Optional[datetime] = None
    is_idle: bool = False
    created_at: Optional[datetime] = None

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "TrackingState":
        """Instantiate TrackingState model from sqlite3.Row."""
        data = dict(row)
        if isinstance(data.get("last_timestamp"), str) and data["last_timestamp"]:
            data["last_timestamp"] = datetime.fromisoformat(data["last_timestamp"])
        if isinstance(data.get("created_at"), str) and data["created_at"]:
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["is_idle"] = bool(data.get("is_idle", False))
        return cls(**data)
