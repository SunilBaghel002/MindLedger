"""
MindLedger - Platform Utilities
OS detection and Windows active foreground window details extraction (app name, window title, process path).

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import sys
from typing import Any, Dict, Optional

from utils.logger import get_logger

logger = get_logger(__name__)

# Try importing pywin32 modules on Windows
IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    try:
        import psutil
        import win32gui
        import win32process
    except ImportError as e:
        logger.warning(f"Windows API libraries missing or limited: {e}")


def is_windows() -> bool:
    """Check if operating system is Windows."""
    return IS_WINDOWS


def is_mac() -> bool:
    """Check if operating system is macOS."""
    return sys.platform == "darwin"


def is_linux() -> bool:
    """Check if operating system is Linux."""
    return sys.platform.startswith("linux")


def get_active_window_info() -> Optional[Dict[str, Any]]:
    """Get active foreground window details (app name, process path, title, pid).

    Returns:
        Dictionary containing app_name, app_path, window_title, and pid,
        or None if active window cannot be determined.
    """
    if not IS_WINDOWS:
        logger.debug("Active window detection currently implemented for Windows.")
        return None

    try:
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            logger.debug("No active foreground window handle found.")
            return None

        # Get Window Title
        window_title = win32gui.GetWindowText(hwnd) or "Unknown Window"

        # Get Process ID
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        if not pid or pid == 0:
            return None

        # Get Process Name and Executable Path via psutil
        try:
            process = psutil.Process(pid)
            app_name = process.name()
            app_path = process.exe()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
            logger.debug(f"Could not inspect process pid={pid}: {e}")
            app_name = "System"
            app_path = None

        return {
            "app_name": app_name,
            "app_path": app_path,
            "window_title": window_title,
            "pid": pid,
        }

    except Exception as e:
        logger.warning(f"Error querying active window info: {e}")
        return None
