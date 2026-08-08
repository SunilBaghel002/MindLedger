"""
MindLedger - Session Manager
Manages active tracking session lifecycle, window transition calculation, duration tracking, and persistence.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from datetime import date, datetime
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
            except Exception as e:
                logger.error(f"Failed to persist initial app session: {e}")

        self.current_session = session
        logger.debug(f"Started session: app={app_name}, title='{window_title}'")
        return session

    def end_current_session(self) -> Optional[AppSession]:
        """End the currently active application session and save duration.

        Returns:
            The ended AppSession instance with updated duration and ended_at, or None if no session was active.
        """
        if not self.current_session:
            return None

        now = datetime.now()
        duration_seconds = int((now - self.current_session.started_at).total_seconds())

        self.current_session.ended_at = now
        self.current_session.duration_seconds = max(0, duration_seconds)

        # Persist ending timestamp and duration in DB repository
        if self.repo and self.current_session.id:
            try:
                self.repo.update_ended_at(
                    self.current_session.id,
                    now,
                    self.current_session.duration_seconds,
                )
            except Exception as e:
                logger.error(f"Failed to update ended app session id={self.current_session.id}: {e}")

        ended_session = self.current_session
        self.current_session = None
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
        # If no active session, start one immediately
        if not self.current_session:
            return self.start_session(app_name, app_path, window_title, category, productivity)

        # Check if foreground application or title changed
        same_app = self.current_session.app_name.lower() == app_name.lower()
        same_title = (self.current_session.window_title or "").strip() == (window_title or "").strip()

        if same_app and same_title:
            # Continue active session
            now = datetime.now()
            self.current_session.duration_seconds = max(
                0, int((now - self.current_session.started_at).total_seconds())
            )
            return self.current_session

        # App or window title changed -> end current session and start new one
        self.end_current_session()
        return self.start_session(app_name, app_path, window_title, category, productivity)
