"""
MindLedger - Event Processor
Central event processor orchestrating active window tracking, idle state transitions, rules evaluation, and persistence.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import datetime
import sqlite3
import time
from typing import Optional

from ai.rules_engine import RulesEngine
from config.constants import CATEGORY_UNCATEGORIZED, PRODUCTIVITY_NEUTRAL
from core.idle_detector import IdleDetector
from core.platform_utils import is_screen_locked
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
        rules_engine: RulesEngine instance.
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
        self.rules_engine = RulesEngine(db_conn=db_conn)
        self.is_idle_state: bool = False
        self._last_tick_time: float = time.time()
        self._no_window_ticks: int = 0

    def start(self) -> None:
        """Start the tracking engine."""
        self._last_tick_time = time.time()
        self._no_window_ticks = 0
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
        now_ts = time.time()
        gap_seconds = now_ts - self._last_tick_time
        self._last_tick_time = now_ts

        # 1. System Sleep / Suspend / Time Gap Detection
        poll_int = self.window_tracker.poll_interval
        max_allowed_gap = max(60.0, poll_int * 10)
        if gap_seconds > max_allowed_gap:
            logger.warning(
                f"System sleep/gap detected ({gap_seconds:.1f}s between ticks). Finalizing active session at last active time."
            )
            self.session_manager.end_current_session(use_last_active=True)
            self.is_idle_state = True
            self._no_window_ticks = 0

        # 2. Check Workstation Screen Lock Status
        if is_screen_locked():
            if not self.is_idle_state:
                logger.info("Workstation screen is LOCKED. Pausing active tracking session.")
                self.is_idle_state = True
                self.session_manager.end_current_session(use_last_active=True)
            return {"status": "locked", "idle_seconds": self.idle_detector.get_idle_time_seconds()}

        # 3. Check User Input Idle Status
        user_is_idle = self.idle_detector.is_idle()
        if user_is_idle:
            idle_secs = self.idle_detector.get_idle_time_seconds()
            if not self.is_idle_state:
                logger.info(
                    f"User became IDLE ({idle_secs:.1f}s inactive). Pausing active tracking session."
                )
                self.is_idle_state = True
                self.session_manager.end_current_session(idle_seconds_to_deduct=idle_secs)
            return {"status": "idle", "idle_seconds": idle_secs}

        # User is active -> resume if previously idle
        if self.is_idle_state:
            logger.info("User returned from IDLE. Resuming tracking.")
            self.is_idle_state = False

        # 4. Poll Active Foreground Window
        window_info = self.window_tracker.poll()
        if not window_info:
            self._no_window_ticks += 1
            # If user is active, allow a brief grace period before tearing down session
            if self.session_manager.current_session and self._no_window_ticks < 4:
                curr = self.session_manager.current_session
                now_dt = datetime.now()
                curr.duration_seconds = max(0, int((now_dt - curr.started_at).total_seconds()))
                if self.session_manager.repo and curr.id:
                    self.session_manager.repo.update_duration(curr.id, curr.duration_seconds)
                    if self.session_manager.db_conn:
                        self.session_manager.db_conn.commit()
                return {
                    "status": "active",
                    "app_name": curr.app_name,
                    "window_title": curr.window_title,
                    "duration_seconds": curr.duration_seconds,
                }
            if self.session_manager.current_session:
                self.session_manager.end_current_session()
            return {"status": "no_window", "idle_seconds": 0}

        self._no_window_ticks = 0

        # 5. Classify with RulesEngine
        category, subcategory, productivity = self.rules_engine.classify_app(
            app_name=window_info["app_name"],
            window_title=window_info.get("window_title"),
        )

        # 6. Transition or Continue Session
        active_session = self.session_manager.handle_window_change(
            app_name=window_info["app_name"],
            app_path=window_info.get("app_path"),
            window_title=window_info.get("window_title"),
            category=category,
            productivity=productivity,
        )

        return {
            "status": "active",
            "app_name": active_session.app_name,
            "window_title": active_session.window_title,
            "duration_seconds": active_session.duration_seconds,
            "category": active_session.category,
            "productivity": active_session.productivity,
        }

