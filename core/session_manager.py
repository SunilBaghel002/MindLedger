"""
MindLedger - Session Manager
Manages active tracking session lifecycle, window transition calculation, duration tracking, and persistence.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from datetime import date, datetime, timedelta
from typing import Optional

from config.constants import CATEGORY_UNCATEGORIZED, PRODUCTIVITY_NEUTRAL
from database.models import AppSession
from database.repositories.app_session_repo import AppSessionRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class SessionManager:
    """Manages active application session lifecycle and persistence.

    Attributes:
        db_conn: Active sqlite3 database connection for saving sessions.
        current_session: Currently active AppSession model.
    """

    def __init__(self, db_conn: Optional[sqlite3.Connection] = None) -> None:
        """Initialize SessionManager.

        Args:
            db_conn: Optional database connection for persistence.
        """
        self.db_conn = db_conn
        self.repo: Optional[AppSessionRepository] = (
            AppSessionRepository(db_conn) if db_conn else None
        )
        self.current_session: Optional[AppSession] = None
        self._last_active_at: Optional[datetime] = None

    def start_session(
        self,
        app_name: str,
        app_path: Optional[str] = None,
        window_title: Optional[str] = None,
        category: str = CATEGORY_UNCATEGORIZED,
        productivity: str = PRODUCTIVITY_NEUTRAL,
    ) -> AppSession:
        """Start a new application tracking session.

        Args:
            app_name: Process executable name (e.g. Code.exe).
            app_path: Full file path to executable.
            window_title: Active window title string.
            category: Classification category.
            productivity: Productivity rating string.

        Returns:
            The newly created active AppSession instance.
        """
        now = datetime.now()
        today_str = date.today().isoformat()

        session = AppSession(
            app_name=app_name,
            app_path=app_path,
            window_title=window_title,
            started_at=now,
            ended_at=None,
            duration_seconds=0,
            is_foreground=True,
            category=category,
            productivity=productivity,
            date=today_str,
        )

        # Save initial session row to DB if repository is available
        if self.repo:
            try:
                session_id = self.repo.save(session)
                session.id = session_id
                if self.db_conn:
                    self.db_conn.commit()
            except Exception as e:
                logger.error(f"Failed to persist initial app session: {e}")

        self.current_session = session
        self._last_active_at = now
        logger.debug(f"Started session: app={app_name}, title='{window_title}'")
        return session

    def end_current_session(
        self,
        ended_at: Optional[datetime] = None,
        idle_seconds_to_deduct: float = 0.0,
        use_last_active: bool = False,
    ) -> Optional[AppSession]:
        """End the currently active application session and save duration.

        Args:
            ended_at: Optional explicit datetime when session ended.
            idle_seconds_to_deduct: Inactivity duration in seconds to deduct on idle transition.
            use_last_active: If True, end timestamp is set to last known active tick time.

        Returns:
            The ended AppSession instance with updated duration and ended_at, or None if no session was active.
        """
        if not self.current_session:
            return None

        now = datetime.now()

        if use_last_active and self._last_active_at:
            end_time = self._last_active_at
        elif idle_seconds_to_deduct > 0.0:
            end_time = now - timedelta(seconds=idle_seconds_to_deduct)
            if end_time < self.current_session.started_at:
                end_time = self.current_session.started_at
        elif ended_at is not None:
            end_time = ended_at
        else:
            end_time = now

        duration_seconds = max(0, int((end_time - self.current_session.started_at).total_seconds()))

        self.current_session.ended_at = end_time
        self.current_session.duration_seconds = duration_seconds

        # Persist ending timestamp and duration in DB repository
        if self.repo and self.current_session.id:
            try:
                self.repo.update_ended_at(
                    self.current_session.id,
                    end_time,
                    self.current_session.duration_seconds,
                )
                if self.db_conn:
                    self.db_conn.commit()
            except Exception as e:
                logger.error(f"Failed to update ended app session id={self.current_session.id}: {e}")

        ended_session = self.current_session
        self.current_session = None
        self._last_active_at = None
        logger.debug(
            f"Ended session: app={ended_session.app_name}, duration={ended_session.duration_seconds}s"
        )
        return ended_session

    def handle_window_change(
        self,
        app_name: str,
        app_path: Optional[str] = None,
        window_title: Optional[str] = None,
        category: str = CATEGORY_UNCATEGORIZED,
        productivity: str = PRODUCTIVITY_NEUTRAL,
    ) -> AppSession:
        """Process active window details and transition sessions if foreground app or title changed.

        Args:
            app_name: Process executable name.
            app_path: Full executable path.
            window_title: Window title string.
            category: Classification category.
            productivity: Productivity level.

        Returns:
            The active AppSession (either continued or newly started).
        """
        now = datetime.now()

        # If no active session, start one immediately
        if not self.current_session:
            return self.start_session(app_name, app_path, window_title, category, productivity)

        # Check if foreground application or title changed
        same_app = self.current_session.app_name.lower() == app_name.lower()
        same_title = (self.current_session.window_title or "").strip() == (window_title or "").strip()

        if same_app and same_title:
            # Check for sleep or suspend gap while in the same window
            if self._last_active_at:
                gap_seconds = (now - self._last_active_at).total_seconds()
                if gap_seconds > 10.0:
                    logger.warning(
                        f"Detected time gap ({gap_seconds:.1f}s) in same window '{app_name}'. Finalizing previous session."
                    )
                    self.end_current_session(use_last_active=True)
                    return self.start_session(app_name, app_path, window_title, category, productivity)

            # Continue active session and update DB duration in real-time
            self._last_active_at = now
            self.current_session.duration_seconds = max(
                0, int((now - self.current_session.started_at).total_seconds())
            )
            if self.repo and self.current_session.id:
                try:
                    updated = self.repo.update_duration(
                        self.current_session.id, self.current_session.duration_seconds
                    )
                    if not updated:
                        logger.warning(
                            f"Session duration update returned False for session_id={self.current_session.id}"
                        )
                except sqlite3.Error as e:
                    logger.error(f"Failed to update active app session duration in DB: {e}")
            return self.current_session

        # App or window title changed -> end current session and start new one
        self.end_current_session()
        return self.start_session(app_name, app_path, window_title, category, productivity)

