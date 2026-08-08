"""
MindLedger - Core Package
Core tracking engine components: window tracking, platform utilities, idle detection, session manager, and event processor.
"""

from core.event_processor import EventProcessor
from core.idle_detector import IdleDetector
from core.platform_utils import get_active_window_info, is_linux, is_mac, is_windows
from core.session_manager import SessionManager
from core.window_tracker import WindowTracker

__all__ = [
    "EventProcessor",
    "IdleDetector",
    "SessionManager",
    "WindowTracker",
    "get_active_window_info",
    "is_windows",
    "is_mac",
    "is_linux",
]
