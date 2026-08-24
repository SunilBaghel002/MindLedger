"""
MindLedger - Smart Hydration & Water Reminder Scheduler
Active-time tracking, adaptive work-intensity intervals, sleep/shutdown state resilience, and daily intake goals.

Author: MindLedger Team
Created: 2026-08-24
"""

import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from database.connection import db_manager
from database.repositories.water_repo import WaterRepository
from utils.logger import get_logger

logger = get_logger(__name__)


class HydrationScheduler:
    """Manages hydration countdowns, adaptive intervals, and active screen time tracking."""

    def __init__(
        self,
        enabled: bool = True,
        mode: str = "smart",
        custom_interval_minutes: int = 45,
        daily_goal_ml: int = 2000,
    ) -> None:
        """Initialize HydrationScheduler with state machine."""
        self.enabled = enabled
        self.mode = mode  # "smart" or "custom"
        self.custom_interval_minutes = custom_interval_minutes
        self.daily_goal_ml = daily_goal_ml

        self.active_work_seconds = 0
        self.snooze_seconds_remaining = 0
        self.last_check_timestamp = time.time()
        self.last_drank_at: Optional[str] = None

    def calculate_effective_interval_minutes(self, is_deep_work: bool = False, is_media: bool = False) -> int:
        """Calculate target interval based on operational mode and workload intensity."""
        if self.mode == "custom":
            return max(15, min(180, self.custom_interval_minutes))

        # Smart Adaptive Interval
        if is_deep_work:
            return 45  # Deep coding / uninterrupted desk session -> earlier reminder
        if is_media:
            return 65  # Relaxed media / browsing
        return 55     # Base standard adaptive interval

    def tick(
        self,
        elapsed_wall_clock: float,
        is_user_active: bool = True,
        is_deep_work: bool = False,
        is_media: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Advance the hydration timer tick with sleep state resilience.

        Args:
            elapsed_wall_clock: Elapsed seconds since previous tick.
            is_user_active: Whether keyboard/mouse are actively in use (not idle).
            is_deep_work: Whether user is in uninterrupted productive coding.
            is_media: Whether user is watching videos/light media.

        Returns:
            Reminder trigger payload dict if a water alert is due, None otherwise.
        """
        now = time.time()

        # Sleep / Shutdown Detection: Wall clock gap > 30 minutes (1800s)
        if elapsed_wall_clock > 1800:
            logger.info(f"Detected system wake-up after {int(elapsed_wall_clock / 60)}m. Gentle reset.")
            self.active_work_seconds = 0
            self.snooze_seconds_remaining = 0
            self.last_check_timestamp = now
            return {
                "event": "welcome_back",
                "message": "Welcome back! Grab a fresh glass of water to kickstart your session.",
            }

        self.last_check_timestamp = now

        if not self.enabled or not is_user_active:
            return None

        # Handle active snooze countdown
        if self.snooze_seconds_remaining > 0:
            self.snooze_seconds_remaining = max(0, self.snooze_seconds_remaining - int(elapsed_wall_clock))
            if self.snooze_seconds_remaining == 0:
                return {
                    "event": "hydration_reminder",
                    "message": "Snooze finished! Time for a refreshing glass of water.",
                    "amount_ml": 250,
                }
            return None

        # Accumulate active work seconds
        self.active_work_seconds += int(elapsed_wall_clock)
        target_interval_secs = self.calculate_effective_interval_minutes(is_deep_work, is_media) * 60

        if self.active_work_seconds >= target_interval_secs:
            self.active_work_seconds = 0
            return {
                "event": "hydration_reminder",
                "message": "You've been focused for a while. Hydrate to maintain peak brain performance!",
                "amount_ml": 250,
            }

        return None

    def drink(
        self,
        amount_ml: int = 250,
        source: str = "dashboard_widget",
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record water intake and reset countdown timer."""
        ts = datetime.now().isoformat()
        self.last_drank_at = ts
        self.active_work_seconds = 0
        self.snooze_seconds_remaining = 0

        with db_manager.connection() as conn:
            repo = WaterRepository(conn)
            repo.log_drink(
                amount_ml=amount_ml,
                source=source,
                daily_goal_ml=self.daily_goal_ml,
                timestamp=ts,
            )

        logger.info(f"Logged hydration drink: {amount_ml}ml via {source}")
        return self.get_status(target_date)

    def snooze(self, minutes: int = 10) -> Dict[str, Any]:
        """Snooze upcoming reminder by specified minutes."""
        self.snooze_seconds_remaining = max(60, minutes * 60)
        logger.info(f"Snoozed hydration reminder for {minutes}m")
        return self.get_status()

    def get_status(self, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Retrieve real-time hydration state, intake progress, and next reminder countdown."""
        d_str = target_date or date.today().isoformat()

        with db_manager.connection() as conn:
            repo = WaterRepository(conn)
            today_intake_ml = repo.get_today_intake(d_str)

        target_interval_secs = self.calculate_effective_interval_minutes() * 60
        if self.snooze_seconds_remaining > 0:
            remaining_secs = self.snooze_seconds_remaining
        else:
            remaining_secs = max(0, target_interval_secs - self.active_work_seconds)

        mins_left = remaining_secs // 60
        if mins_left > 0:
            formatted_time = f"{mins_left}m"
        else:
            formatted_time = f"{remaining_secs}s"

        glasses_drank = today_intake_ml // 250
        target_glasses = max(1, self.daily_goal_ml // 250)
        pct_completed = round(min(100.0, (today_intake_ml / max(1, self.daily_goal_ml)) * 100.0), 1)

        return {
            "enabled": self.enabled,
            "mode": self.mode,
            "next_reminder_seconds": remaining_secs,
            "next_reminder_formatted": formatted_time,
            "today_intake_ml": today_intake_ml,
            "daily_goal_ml": self.daily_goal_ml,
            "glasses_drank": glasses_drank,
            "target_glasses": target_glasses,
            "percentage_completed": pct_completed,
            "last_drank_at": self.last_drank_at,
        }


# Singleton instance
hydration_scheduler = HydrationScheduler()
