"""
MindLedger - System Tray Manager
System tray application built with pystray and Pillow for silent background monitoring and status controls.

Author: MindLedger Team
Created: 2026-08-08
"""

import sys
import threading
import webbrowser
from typing import Callable, Optional

from PIL import Image, ImageDraw
import pystray

from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)

import os
import shutil
import subprocess
import time

_is_shutting_down: bool = False


def launch_app_window(url: str) -> bool:
    """Launch standalone native desktop application window.

    Uses Google Chrome or Microsoft Edge Application Mode (--app=URL)
    with an isolated profile directory to provide a clean, standalone desktop window
    without browser tabs, URL bar, or navigation controls, completely immune to
    locks on the user's personal browser profile.

    Args:
        url: Target local dashboard URL.

    Returns:
        True if window was launched, False if fell back to browser.
    """
    # 1. First check if a window is already open
    if _bring_window_to_front():
        return True

    # Dedicated isolated profile directory for MindLedger desktop window
    base_data_dir = os.path.join(
        os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
        "MindLedger",
        "app_browser_profile",
    )
    os.makedirs(base_data_dir, exist_ok=True)

    # Browser candidates in order of preference (Chrome first, then Edge, then 64/32-bit paths)
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        shutil.which("chrome"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        shutil.which("msedge"),
    ]

    for exe in candidates:
        if not exe or not os.path.exists(exe):
            continue

        flags = [
            f"--app={url}",
            f"--user-data-dir={base_data_dir}",
            "--window-size=1280,820",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-sync",
            "--disable-extensions",
            "--disable-default-apps",
            "--disable-component-update",
        ]

        try:
            proc = subprocess.Popen(
                [exe, *flags],
                creationflags=getattr(subprocess, "DETACHED_PROCESS", 0),
            )
            # Verify the process did not immediately crash or abort
            time.sleep(0.4)
            if proc.poll() is None or proc.returncode == 0:
                logger.info(f"Launched standalone desktop application window via {exe}")
                return True
            else:
                logger.warning(
                    f"Browser candidate {exe} exited immediately with code {proc.returncode}. Trying next candidate."
                )
                lockfile = os.path.join(base_data_dir, "lockfile")
                if os.path.exists(lockfile):
                    try:
                        os.remove(lockfile)
                    except OSError:
                        pass
        except Exception as e:
            logger.debug(f"Failed to launch app mode with {exe}: {e}")

    # Fallback to standard browser if app mode is not possible
    try:
        logger.info("Falling back to default system web browser.")
        webbrowser.open(url)
        return True
    except Exception as e:
        logger.error(f"Failed to open browser fallback: {e}")
        return False


def _bring_window_to_front() -> bool:
    """Find and focus existing MindLedger desktop window if already open on screen.

    Returns:
        True if an active MindLedger window was found and brought to front.
    """
    try:
        from core.platform_utils import ensure_desktop_access
        ensure_desktop_access()

        import win32gui
        import win32con
        import ctypes

        found_hwnd = []

        def enum_cb(hwnd, _):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                # Match MindLedger standalone dashboard window, exclude IDE and terminal
                if (
                    "MindLedger" in title
                    and "Visual Studio Code" not in title
                    and "Antigravity IDE" not in title
                    and "cmd" not in title.lower()
                    and "powershell" not in title.lower()
                ):
                    found_hwnd.append(hwnd)
            return True

        win32gui.EnumWindows(enum_cb, None)

        if found_hwnd:
            target = found_hwnd[0]
            if win32gui.IsIconic(target):
                win32gui.ShowWindow(target, win32con.SW_RESTORE)
            else:
                win32gui.ShowWindow(target, win32con.SW_SHOW)

            ctypes.windll.user32.SetForegroundWindow(target)
            ctypes.windll.user32.BringWindowToTop(target)
            logger.info(f"Brought existing MindLedger window (HWND {target}) to foreground.")
            return True
    except Exception as e:
        logger.debug(f"Win32 SetForegroundWindow skipped: {e}")
    return False


def show_native_desktop_window(url: Optional[str] = None) -> bool:
    """Bring existing MindLedger window to foreground, or launch standalone app window.

    Safe to call from any thread (main thread, tray thread, or background API thread).

    Args:
        url: Optional target dashboard URL.

    Returns:
        True if window was shown or opened successfully.
    """
    target_url = url or f"http://{settings.app_host}:{settings.app_port}/dashboard"

    # 1. If an application window is already open, bring it to front
    if _bring_window_to_front():
        return True

    # 2. Otherwise launch a standalone application window
    logger.info("Opening standalone application window for MindLedger.")
    return launch_app_window(target_url)


def close_native_desktop_window() -> None:
    """Signal shutdown of desktop window handlers."""
    global _is_shutting_down
    _is_shutting_down = True


def open_native_desktop_window(url: Optional[str] = None) -> None:
    """Launch native standalone desktop GUI window for MindLedger."""
    target_url = url or f"http://{settings.app_host}:{settings.app_port}/dashboard"
    show_native_desktop_window(target_url)



def create_default_tray_image(width: int = 64, height: int = 64) -> Image.Image:
    """Load or generate the clean RGBA icon image for system tray.

    Args:
        width: Icon pixel width.
        height: Icon pixel height.

    Returns:
        PIL Image object.
    """
    from pathlib import Path

    icon_paths = [
        Path(__file__).resolve().parent / "assets" / "icon_64x64.png",
        Path(__file__).resolve().parent / "assets" / "logo.png",
        Path(__file__).resolve().parent / "app.ico",
    ]

    for p in icon_paths:
        if p.exists():
            try:
                img = Image.open(p).convert("RGBA")
                return img.resize((width, height), Image.Resampling.LANCZOS)
            except Exception as e:
                logger.debug(f"Could not load tray icon from {p}: {e}")

    # Fallback if image asset is not found
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)

    # Draw rounded dark blue circle background
    margin = 4
    dc.ellipse(
        [margin, margin, width - margin, height - margin],
        fill=(43, 108, 176, 255),
        outline=(74, 144, 217, 255),
        width=2,
    )

    # Draw white inner 'M' letter symbol
    dc.polygon(
        [
            (18, 44),
            (18, 20),
            (32, 34),
            (46, 20),
            (46, 44),
            (40, 44),
            (40, 28),
            (32, 38),
            (24, 28),
            (24, 44),
        ],
        fill=(255, 255, 255, 255),
    )

    return image



class SystemTrayApp:
    """Manages the pystray system tray icon and context menu.

    Attributes:
        on_quit_callback: Function triggered when user selects Quit.
        on_toggle_pause_callback: Function triggered to pause/resume tracking.
        is_paused: Boolean state flag.
    """

    def __init__(
        self,
        on_quit_callback: Optional[Callable[[], None]] = None,
        on_toggle_pause_callback: Optional[Callable[[bool], None]] = None,
    ) -> None:
        """Initialize SystemTrayApp.

        Args:
            on_quit_callback: Callback when Quit menu item is clicked.
            on_toggle_pause_callback: Callback when Pause/Resume is toggled.
        """
        self.on_quit_callback = on_quit_callback
        self.on_toggle_pause_callback = on_toggle_pause_callback
        self.is_paused: bool = False
        self.icon: Optional[pystray.Icon] = None
        self._current_status: str = "Tracking Active"
        self._is_ready: bool = False
        self._stop_requested: bool = False

    def update_status_text(self, status: str) -> None:
        """Update the status text shown in the tray tooltip and menu.

        Args:
            status: Short status text string.
        """
        self._current_status = status
        if self.icon:
            self.icon.title = f"{APP_NAME} - {self._current_status}"

    def _get_status_menu_title(self, item) -> str:
        """Dynamic title for status menu item."""
        return f"Status: {self._current_status}"

    def _get_pause_menu_title(self, item) -> str:
        """Dynamic title for pause/resume menu item."""
        return "Resume Tracking" if self.is_paused else "Pause Tracking"

    def _on_toggle_pause(self, icon: pystray.Icon, item) -> None:
        """Handle Pause/Resume menu toggle click."""
        self.is_paused = not self.is_paused
        status_msg = "Paused" if self.is_paused else "Tracking Active"
        self.update_status_text(status_msg)

        if self.on_toggle_pause_callback:
            self.on_toggle_pause_callback(self.is_paused)

        logger.info(f"System tray tracking toggled: paused={self.is_paused}")

    def _on_open_dashboard(self, icon: Optional[pystray.Icon] = None, item=None) -> None:
        """Open native desktop application GUI window."""
        dashboard_url = f"http://{settings.app_host}:{settings.app_port}/dashboard"
        logger.info(f"Opening native desktop GUI application window at: {dashboard_url}")
        open_native_desktop_window(dashboard_url)


    def _on_quit(self, icon: pystray.Icon, item) -> None:
        """Handle Quit menu item click."""
        logger.info("Quit requested via system tray menu.")
        close_native_desktop_window()
        self.stop()
        if self.on_quit_callback:
            self.on_quit_callback()

    def _on_ready(self, icon: pystray.Icon) -> None:
        """Callback invoked when pystray icon setup completes."""
        self._is_ready = True
        if self._stop_requested:
            logger.info("Stop was requested before tray startup completed. Stopping now.")
            icon.stop()
            return

        icon.visible = True

    def run(self) -> None:
        """Create and run the system tray icon loop."""
        self._init_icon()
        logger.info("Starting SystemTrayApp icon loop...")
        self.icon.run(setup=self._on_ready)

    def run_detached(self) -> None:
        """Create and run the system tray icon detached in background."""
        self._init_icon()
        logger.info("Starting SystemTrayApp icon (detached)...")
        if sys.platform == "darwin":
            self.icon.run_detached(setup=self._on_ready)
        else:
            self.icon.run_detached(setup=self._on_ready)

    def _init_icon(self) -> None:
        """Initialize pystray Icon instance with menu and image."""
        image = create_default_tray_image()

        menu = pystray.Menu(
            pystray.MenuItem(self._get_status_menu_title, None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(self._get_pause_menu_title, self._on_toggle_pause),
            pystray.MenuItem("Open Dashboard", self._on_open_dashboard),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit MindLedger", self._on_quit),
        )

        self.icon = pystray.Icon(
            name=APP_NAME.lower(),
            icon=image,
            title=f"{APP_NAME} v{APP_VERSION} - {self._current_status}",
            menu=menu,
        )

    def stop(self) -> None:
        """Detach and stop the system tray icon."""
        self._stop_requested = True
        close_native_desktop_window()
        if self.icon:
            try:
                self.icon.stop()
            except Exception as e:
                logger.warning(f"Error stopping system tray icon: {e}")
            logger.info("SystemTrayApp stopped.")

