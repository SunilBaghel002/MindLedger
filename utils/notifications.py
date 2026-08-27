"""
MindLedger - Notification Dispatcher (Safe / No-Op)
All visual notifications are now handled by the in-app animated overlay in the React dashboard.
This module exists only for backward compatibility with callers that import send_windows_toast.

Author: MindLedger Team
Updated: 2026-08-27
"""

from utils.logger import get_logger

logger = get_logger(__name__)


def send_windows_toast(
    title: str = "",
    message: str = "",
    app_id: str = "MindLedger",
    image_path: str = "",
) -> bool:
    """No-op notification stub. Real notifications are rendered by the React dashboard overlay.

    This function intentionally does NOT call any Windows OS notification APIs
    (Shell_NotifyIcon, WinRT ToastNotification, etc.) because those APIs can
    trigger BSOD on systems with third-party notification hook drivers
    (e.g. Lenovo Vantage, NVIDIA GeForce Experience).

    Args:
        title: Notification header (logged only).
        message: Notification body (logged only).
        app_id: Unused, kept for API compatibility.
        image_path: Unused, kept for API compatibility.

    Returns:
        True always (notification is handled by the frontend overlay).
    """
    logger.debug("Hydration reminder event logged (visual notification handled by dashboard overlay).")
    return True
