"""
MindLedger - Idle Detector
Detects keyboard and mouse inactivity to pause application session tracking during idle periods.

Author: MindLedger Team
Created: 2026-08-08
"""

import sys
import time
from typing import Optional

from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)

IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    try:
        import win32api
    except ImportError:
        win32api = None


class IdleDetector:
    """Monitors system-wide user input idle time.

    Attributes:
        threshold_seconds: Seconds of inactivity before user is considered idle.
    """

    def __init__(self, threshold_seconds: Optional[int] = None) -> None:
        """Initialize IdleDetector.

        Args:
            threshold_seconds: Inactivity threshold in seconds. Defaults to settings.idle_threshold_seconds.
        """
        self.threshold_seconds = (
            threshold_seconds
            if threshold_seconds is not None
            else settings.idle_threshold_seconds
        )
        self._last_simulated_activity: float = time.time()

    def get_idle_time_seconds(self) -> float:
        """Calculate duration in seconds since last user keyboard or mouse input.

        Returns:
            Idle duration in seconds as float.
        """
        if IS_WINDOWS and win32api is not None:
            try:
                last_input_tick = win32api.GetLastInputInfo()
                current_tick = win32api.GetTickCount()
                # Tick count handles rollover (wraps every 49.7 days)
                idle_ticks = current_tick - last_input_tick
                if idle_ticks < 0:
                    idle_ticks += 2**32
                return idle_ticks / 1000.0
            except Exception as e:
                logger.warning(f"Failed to get Windows idle time: {e}")

        # Fallback for non-Windows or if API call fails
        return max(0.0, time.time() - self._last_simulated_activity)

    def is_idle(self) -> bool:
        """Check if user inactivity duration exceeds configured threshold.

        Returns:
            True if idle duration >= threshold_seconds, False otherwise.
        """
        idle_seconds = self.get_idle_time_seconds()
        return idle_seconds >= self.threshold_seconds

    def touch_activity(self) -> None:
        """Simulate user activity (useful for testing or manual reset)."""
        self._last_simulated_activity = time.time()

    def get_last_active_time(self) -> float:
        """Get epoch timestamp of the most recent user keyboard/mouse activity.

        Returns:
            Epoch timestamp as float.
        """
        idle_seconds = self.get_idle_time_seconds()
        return time.time() - idle_seconds

