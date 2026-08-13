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

_active_webview_window = None


def open_native_desktop_window(url: Optional[str] = None) -> None:
    """Launch native standalone desktop GUI window for MindLedger."""
    target_url = url or f"http://{settings.app_host}:{settings.app_port}/dashboard"

    try:
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
            webview.start()

        if threading.current_thread() is threading.main_thread():
            _launch()
        else:
            # Fallback to browser open when invoked from secondary worker threads
            webbrowser.open(target_url)
        logger.info(f"Native desktop window opened pointing to: {target_url}")
    except Exception as e:
        logger.warning(f"Could not open pywebview native window ({e}), falling back to browser.")
        webbrowser.open(target_url)



def create_default_tray_image(width: int = 64, height: int = 64) -> Image.Image:

    """Generate a clean 64x64 RGBA icon image for system tray.

    Args:
        width: Icon pixel width.
        height: Icon pixel height.

    Returns:
        PIL Image object.
    """
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
        if self.icon:
            try:
                self.icon.stop()
            except Exception as e:
                logger.warning(f"Error stopping system tray icon: {e}")
            logger.info("SystemTrayApp stopped.")
