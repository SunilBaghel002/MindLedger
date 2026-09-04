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
import webview

from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)

import os
import shutil
import subprocess

_active_webview_window = None
_is_shutting_down: bool = False


def launch_app_window_fallback(url: str) -> bool:
    """Launch standalone application window using Edge or Chrome App Mode.

    This provides a standalone desktop window without browser tabs, URL bar,
    or navigation controls when pywebview is unavailable.

    Args:
        url: Target local dashboard URL.

    Returns:
        True if an app window was launched, False if fell back to browser.
    """
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        shutil.which("msedge"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        shutil.which("chrome"),
    ]

    for exe in candidates:
        if exe and os.path.exists(exe):
            try:
                subprocess.Popen(
                    [
                        exe,
                        f"--app={url}",
                        "--window-size=1280,820",
                        "--disable-extensions",
                        "--disable-default-apps",
                    ],
                    creationflags=getattr(subprocess, "DETACHED_PROCESS", 0),
                )
                logger.info(f"Launched standalone app mode window via {exe}")
                return True
            except Exception as e:
                logger.debug(f"Failed to launch app mode with {exe}: {e}")

    # Final fallback to standard browser if app mode is impossible
    try:
        webbrowser.open(url)
        return True
    except Exception as e:
        logger.error(f"Failed to open browser fallback: {e}")
        return False


def _bring_window_to_front() -> None:
    """Ensure the native MindLedger window is brought to top of Z-order and focused."""
    try:
        import win32gui
        import win32con

        def enum_cb(hwnd, _):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                if APP_NAME in title:
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                    win32gui.SetForegroundWindow(hwnd)
            return True

        win32gui.EnumWindows(enum_cb, None)
    except Exception as e:
        logger.debug(f"Win32 SetForegroundWindow skipped: {e}")


def show_native_desktop_window(url: Optional[str] = None) -> bool:
    """Bring the native desktop window to foreground, or launch app window fallback.

    Safe to call from any thread (main thread, tray thread, or background API thread).

    Args:
        url: Optional target dashboard URL.

    Returns:
        True if window was shown or opened successfully.
    """
    global _active_webview_window
    target_url = url or f"http://{settings.app_host}:{settings.app_port}/dashboard"

    if _active_webview_window is not None:
        try:
            _active_webview_window.show()
            _active_webview_window.restore()
            _bring_window_to_front()
            logger.info("Restored existing native desktop window to foreground.")
            return True
        except Exception as e:
            logger.warning(f"Failed to restore active webview window: {e}")

    # If called from main thread before GUI loop has started
    if threading.current_thread() is threading.main_thread() and _active_webview_window is None:
        open_native_desktop_window(target_url)
        return True

    # Fallback to standalone app window without browser tabs
    logger.info("Launching standalone application mode window fallback.")
    return launch_app_window_fallback(target_url)


def close_native_desktop_window() -> None:
    """Signal shutdown and cleanly destroy the native desktop window."""
    global _is_shutting_down, _active_webview_window
    _is_shutting_down = True
    if _active_webview_window is not None:
        try:
            _active_webview_window.destroy()
            logger.info("Native desktop webview window destroyed cleanly.")
        except Exception as e:
            logger.debug(f"Error destroying webview window during shutdown: {e}")
        _active_webview_window = None


def open_native_desktop_window(url: Optional[str] = None) -> None:
    """Launch native standalone desktop GUI window for MindLedger with close-to-tray persistence."""
    global _active_webview_window, _is_shutting_down
    target_url = url or f"http://{settings.app_host}:{settings.app_port}/dashboard"

    try:
        def _on_window_closing() -> bool:
            """Intercept window closing: hide to system tray instead of exiting."""
            global _is_shutting_down
            if not _is_shutting_down:
                try:
                    if _active_webview_window is not None:
                        _active_webview_window.hide()
                        logger.info("MindLedger window hidden to system tray.")
                except Exception as ex:
                    logger.debug(f"Error hiding window on close: {ex}")
                return False  # False cancels window destruction in pywebview
            return True

        def _launch():
            global _active_webview_window
            _active_webview_window = webview.create_window(
                title=f"{APP_NAME} - Personal Wellbeing Analytics",
                url=target_url,
                width=1280,
                height=820,
                min_size=(900, 600),
                resizable=True,
            )
            _active_webview_window.events.closing += _on_window_closing
            webview.start()

        if threading.current_thread() is threading.main_thread():
            _launch()
        else:
            show_native_desktop_window(target_url)
        logger.info(f"Native desktop window initialized pointing to: {target_url}")
    except Exception as e:
        logger.warning(f"Could not open pywebview native window ({e}), falling back to app mode.")
        launch_app_window_fallback(target_url)



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
        show_native_desktop_window(dashboard_url)


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

