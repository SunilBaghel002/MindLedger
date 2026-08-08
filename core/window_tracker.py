"""
MindLedger - Window Tracker
Polls the operating system for active window details and detects foreground application changes.

Author: MindLedger Team
Created: 2026-08-08
"""

from typing import Any, Dict, Optional

from config.settings import settings
from core.platform_utils import get_active_window_info
from utils.logger import get_logger

logger = get_logger(__name__)


class WindowTracker:
    """Polls operating system for foreground window changes.

    Attributes:
        poll_interval: Interval between window checks in seconds.
        is_tracking: State flag indicating if polling is active.
    """

    def __init__(self, poll_interval: Optional[int] = None) -> None:
        """Initialize WindowTracker.

        Args:
            poll_interval: Poll frequency in seconds. Defaults to settings.poll_interval_seconds.
        """
        self.poll_interval = (
            poll_interval
            if poll_interval is not None
            else settings.poll_interval_seconds
        )
        self.is_tracking: bool = False
        self._last_window_info: Optional[Dict[str, Any]] = None

    def start(self) -> None:
        """Start window tracking."""
        self.is_tracking = True
        logger.info(f"Window tracker started (poll interval: {self.poll_interval}s)")

    def stop(self) -> None:
        """Stop window tracking."""
        self.is_tracking = False
        logger.info("Window tracker stopped")

    def poll(self) -> Optional[Dict[str, Any]]:
        """Poll current foreground active window.

        Returns:
            Dictionary containing active window details, or None if not tracking or window info unavailable.
        """
        if not self.is_tracking:
            return None

        window_info = get_active_window_info()
        if window_info:
            self._last_window_info = window_info
        return window_info

    def get_last_window_info(self) -> Optional[Dict[str, Any]]:
        """Get the most recently polled window information.

        Returns:
            Last polled window info dict or None.
        """
        return self._last_window_info
