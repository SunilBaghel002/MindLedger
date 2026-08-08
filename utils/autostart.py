"""
MindLedger - Autostart Manager
Manages Windows Registry run key for auto-starting MindLedger on system boot.

Author: MindLedger Team
Created: 2026-08-08
"""

import os
import sys
from typing import Optional

from utils.logger import get_logger

logger = get_logger(__name__)

IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    try:
        import winreg
    except ImportError:
        winreg = None

REG_KEY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"


class AutostartManager:
    """Manages Windows startup registry keys for auto-start on boot."""

    def __init__(self, app_name: str = "MindLedger") -> None:
        """Initialize AutostartManager.

        Args:
            app_name: Name of the application registry key.
        """
        self.app_name = app_name

    def is_enabled(self) -> bool:
        """Check if application is registered to start on boot.

        Returns:
            True if registry key exists, False otherwise.
        """
        if not IS_WINDOWS or winreg is None:
            return False

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, REG_KEY_PATH, 0, winreg.KEY_READ
            ) as key:
                winreg.QueryValueEx(key, self.app_name)
                return True
        except FileNotFoundError:
            return False
        except Exception as e:
            logger.warning(f"Error checking autostart registry status: {e}")
            return False

    def enable(self, exec_path: Optional[str] = None) -> bool:
        """Register application in Windows startup registry.

        Args:
            exec_path: Path to executable. Defaults to current Python script or sys.executable.

        Returns:
            True if key added successfully, False otherwise.
        """
        if not IS_WINDOWS or winreg is None:
            logger.warning("Autostart registry configuration only available on Windows.")
            return False

        target_path = exec_path or sys.executable
        if not exec_path and getattr(sys, "frozen", False):
            target_path = f'"{sys.executable}"'
        elif not exec_path:
            # Running as Python script
            target_path = f'"{sys.executable}" "{os.path.abspath(sys.argv[0])}"'

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, REG_KEY_PATH, 0, winreg.KEY_SET_VALUE
            ) as key:
                winreg.SetValueEx(
                    key, self.app_name, 0, winreg.REG_SZ, target_path
                )
            logger.info(f"Enabled autostart registry entry for {self.app_name} -> {target_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to enable autostart registry entry: {e}")
            return False

    def disable(self) -> bool:
        """Remove application from Windows startup registry.

        Returns:
            True if key removed successfully, False otherwise.
        """
        if not IS_WINDOWS or winreg is None:
            return False

        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, REG_KEY_PATH, 0, winreg.KEY_SET_VALUE
            ) as key:
                winreg.DeleteValue(key, self.app_name)
            logger.info(f"Disabled autostart registry entry for {self.app_name}")
            return True
        except FileNotFoundError:
            return True
        except Exception as e:
            logger.error(f"Failed to disable autostart registry entry: {e}")
            return False
