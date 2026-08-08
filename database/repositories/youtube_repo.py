"""
MindLedger - YouTube Activity Repository
Data access repository for youtube_activity SQLite table operations.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from typing import Any, Dict, List, Optional

from database.models import YouTubeActivity
from utils.logger import get_logger

logger = get_logger(__name__)


class YouTubeRepository:
    """Repository for managing youtube_activity table operations."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize the repository with an active database connection.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection

    def save(self, activity: YouTubeActivity) -> int:
        """Save a new YouTube activity session to the database.

        Args:
            activity: YouTubeActivity model instance.

        Returns:
            The inserted row ID.
        """
        cursor = self.conn.execute(
            """
            INSERT INTO youtube_activity (
                video_url, video_id, video_title, channel_name, channel_url,
                channel_id, started_at, ended_at, watch_duration_seconds,
                video_category, is_productive, date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                activity.video_url,
                activity.video_id,
                activity.video_title,
                activity.channel_name,
                activity.channel_url,
                activity.channel_id,
                activity.started_at.isoformat(),
                activity.ended_at.isoformat() if activity.ended_at else None,
                activity.watch_duration_seconds,
                activity.video_category,
                1 if activity.is_productive is True else (0 if activity.is_productive is False else None),
                activity.date,
            ),
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_by_id(self, activity_id: int) -> Optional[YouTubeActivity]:
        """Fetch a YouTube activity record by its ID.

        Args:
            activity_id: Primary key ID of the record.

        Returns:
            YouTubeActivity model or None if not found.
        """
        cursor = self.conn.execute(
            "SELECT * FROM youtube_activity WHERE id = ?",
            (activity_id,),
        )
        row = cursor.fetchone()
        return YouTubeActivity.from_row(row) if row else None

    def get_by_date(self, date_str: str) -> List[YouTubeActivity]:
        """Fetch all YouTube activities for a given date string (YYYY-MM-DD).

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            List of YouTubeActivity models.
        """
        cursor = self.conn.execute(
            "SELECT * FROM youtube_activity WHERE date = ? ORDER BY started_at ASC",
            (date_str,),
        )
        rows = cursor.fetchall()
        return [YouTubeActivity.from_row(row) for row in rows]

    def get_total_watch_time(self, date_str: str) -> int:
        """Calculate total YouTube watch time in seconds for a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            Total watch time in seconds.
        """
        cursor = self.conn.execute(
            "SELECT SUM(watch_duration_seconds) FROM youtube_activity WHERE date = ?",
            (date_str,),
        )
        result = cursor.fetchone()[0]
        return int(result) if result else 0

    def get_video_count(self, date_str: str) -> int:
        """Count total YouTube videos watched on a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            Number of recorded YouTube videos.
        """
        cursor = self.conn.execute(
            "SELECT COUNT(*) FROM youtube_activity WHERE date = ?",
            (date_str,),
        )
        result = cursor.fetchone()[0]
        return int(result) if result else 0

    def get_top_channels(self, date_str: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Calculate top channels watched on a given date by watch duration.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of channels to return.

        Returns:
            List of dicts containing channel_name, channel_url, total_videos, and total_seconds.
        """
        cursor = self.conn.execute(
            """
            SELECT channel_name, MAX(channel_url) as channel_url, COUNT(*) as total_videos, SUM(watch_duration_seconds) as total_seconds
            FROM youtube_activity
            WHERE date = ?
            GROUP BY channel_name
            ORDER BY total_seconds DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        return [
            {
                "channel_name": row["channel_name"],
                "channel_url": row["channel_url"],
                "total_videos": row["total_videos"],
                "total_seconds": row["total_seconds"],
            }
            for row in cursor.fetchall()
        ]

    def find_recent_by_video_id(self, video_id: str, date_str: str) -> Optional[YouTubeActivity]:
        """Find the most recent YouTube activity record for a specific video ID today.

        Args:
            video_id: YouTube video ID string.
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            YouTubeActivity model instance or None.
        """
        cursor = self.conn.execute(
            """
            SELECT * FROM youtube_activity
            WHERE video_id = ? AND date = ?
            ORDER BY id DESC LIMIT 1
            """,
            (video_id, date_str),
        )
        row = cursor.fetchone()
        return self._map_row_to_model(row) if row else None

    def update_watch_duration(self, activity_id: int, added_seconds: int, ended_at: datetime) -> bool:
        """Add watched seconds to an existing video record.

        Args:
            activity_id: Primary key of YouTube activity record.
            added_seconds: Additional seconds to accumulate.
            ended_at: Updated end timestamp.

        Returns:
            True if row updated, False otherwise.
        """
        cursor = self.conn.execute(
            """
            UPDATE youtube_activity
            SET watch_duration_seconds = watch_duration_seconds + ?, ended_at = ?
            WHERE id = ?
            """,
            (added_seconds, ended_at.isoformat(), activity_id),
        )
        self.conn.commit()
        return cursor.rowcount > 0
