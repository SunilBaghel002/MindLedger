"""
MindLedger - Event Processor
Central event processor orchestrating active window tracking, idle state transitions, rules evaluation, and persistence.

Author: MindLedger Team
Created: 2026-08-08
"""

import sqlite3
from typing import Optional

from config.constants import CATEGORY_UNCATEGORIZED, PRODUCTIVITY_NEUTRAL
from core.idle_detector import IdleDetector
from core.session_manager import SessionManager
from core.window_tracker import WindowTracker
from utils.logger import get_logger

logger = get_logger(__name__)


class EventProcessor:
    """Orchestrates window polling, idle state handling, and tracking session lifecycle.

    Attributes:
        window_tracker: WindowTracker instance.
        idle_detector: IdleDetector instance.
        session_manager: SessionManager instance.
        is_idle_state: Current boolean idle state.
    """

    def __init__(
        self,
        db_conn: Optional[sqlite3.Connection] = None,
        poll_interval: Optional[int] = None,
        idle_threshold: Optional[int] = None,
    ) -> None:
        """Initialize EventProcessor.

        Args:
            db_conn: Active database connection for session persistence.
            poll_interval: Window polling frequency in seconds.
            idle_threshold: Inactivity threshold in seconds.
        """
        self.window_tracker = WindowTracker(poll_interval=poll_interval)
        self.idle_detector = IdleDetector(threshold_seconds=idle_threshold)
        self.session_manager = SessionManager(db_conn=db_conn)
        self.is_idle_state: bool = False

    def start(self) -> None:
        """Start the tracking engine."""
        self.window_tracker.start()
        logger.info("EventProcessor tracking engine started.")

    def stop(self) -> None:
        """Stop the tracking engine and save any active session."""
        self.window_tracker.stop()
        self.session_manager.end_current_session()
        logger.info("EventProcessor tracking engine stopped cleanly.")

    def tick(self) -> Optional[dict]:
        """Execute one iteration cycle of the tracking loop.

        Returns:
            Dictionary payload representing current cycle state or None.
        """
        # 1. Check Idle Status
        user_is_idle = self.idle_detector.is_idle()

        if user_is_idle:
            if not self.is_idle_state:
                logger.info("User became IDLE. Pausing active tracking session.")
                self.is_idle_state = True
                self.session_manager.end_current_session()
            return {"status": "idle", "idle_seconds": self.idle_detector.get_idle_time_seconds()}

        # User is active
        if self.is_idle_state:
            logger.info("User returned from IDLE. Resuming tracking.")
            self.is_idle_state = False

        # 2. Poll Active Window
        window_info = self.window_tracker.poll()
        if not window_info:
            return {"status": "no_window", "idle_seconds": 0}

        # 3. Transition or Continue Session
        active_session = self.session_manager.handle_window_change(
            app_name=window_info["app_name"],
            app_path=window_info.get("app_path"),
            window_title=window_info.get("window_title"),
            category=CATEGORY_UNCATEGORIZED,
            productivity=PRODUCTIVITY_NEUTRAL,
        )

        return {
            "status": "active",
            "app_name": active_session.app_name,
            "window_title": active_session.window_title,
            "duration_seconds": active_session.duration_seconds,
        }
