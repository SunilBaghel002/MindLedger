"""
MindLedger - Desktop Push Notification Dispatcher
Delivers native Windows Toast notifications with zero external dependencies via PowerShell WinRT APIs.

Author: MindLedger Team
Created: 2026-08-26
"""

import subprocess
import sys
from utils.logger import get_logger

logger = get_logger(__name__)


def send_windows_toast(title: str, message: str, app_id: str = "MindLedger.Wellness") -> bool:
    """Send a native Windows Toast Notification using PowerShell WinRT.

    Args:
        title: Notification header string.
        message: Notification body content.
        app_id: App ID identifier in Windows Action Center.

    Returns:
        True if successfully sent, False otherwise.
    """
    if sys.platform != "win32":
        logger.debug("Desktop toast notifications only supported on Windows.")
        return False

    # Escape single quotes
    clean_title = title.replace("'", "''").replace("\n", " ")
    clean_msg = message.replace("'", "''").replace("\n", " ")

    ps_script = f"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($template.CreateTextNode('{clean_title}')) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode('{clean_msg}')) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{app_id}')
$notifier.Show($toast)
"""

    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script],
            capture_output=True,
            timeout=5,
        )
        if res.returncode == 0:
            logger.info(f"Dispatched Windows toast notification: {title}")
            return True
        else:
            logger.warning(f"PowerShell toast notification returned non-zero code: {res.stderr.decode('utf-8', errors='ignore')}")
            return False
    except Exception as e:
        logger.warning(f"Failed to dispatch desktop toast notification: {e}")
        return False
