"""
MindLedger - Desktop Push Notification Dispatcher
Delivers rich Windows Toast notifications with embedded brand logo and dynamic personalized messaging via PowerShell WinRT APIs.

Author: MindLedger Team
Created: 2026-08-26
"""

import base64
import os
import random
import subprocess
import sys
from typing import Optional
from utils.logger import get_logger

logger = get_logger(__name__)

# Dynamic motivational message pools for rich notifications
MOTIVATIONAL_HYDRATION_MESSAGES = [
    {
        "title": "💧 Hey Sunil, Time for a Water Break!",
        "message": "You've been in deep focus! Grab a fresh 250ml glass of water to keep your cognitive power and energy peak. ⚡",
    },
    {
        "title": "🌊 Sunil, Hydration Power-Up!",
        "message": "Coding burns brain glucose and water! Drink a glass now to maintain sharp focus and avoid fatigue. 🧠✨",
    },
    {
        "title": "🥛 Water Checkpoint, Sunil!",
        "message": "Great work on your session! Stretch your back, take a sip of cool water, and conquer your next task. 🚀",
    },
    {
        "title": "💧 Refresh & Refocus, Sunil!",
        "message": "A hydrated brain solves bugs 30% faster! Grab your water glass and keep your momentum going. 💻⚡",
    },
]


def send_windows_toast(
    title: Optional[str] = None,
    message: Optional[str] = None,
    app_id: str = "MindLedger",
    image_path: Optional[str] = None,
) -> bool:
    """Send a native Windows Toast Notification with brand logo and rich formatting.

    Args:
        title: Notification header string (optional, defaults to personalized message).
        message: Notification body content (optional, defaults to randomized motivational message).
        app_id: App ID identifier in Windows Action Center.
        image_path: Absolute path to custom logo/image asset.

    Returns:
        True if successfully sent, False otherwise.
    """
    if sys.platform != "win32":
        logger.debug("Desktop toast notifications only supported on Windows.")
        return False

    # Choose dynamic motivational message if not explicitly provided
    if not title or not message:
        picked = random.choice(MOTIVATIONAL_HYDRATION_MESSAGES)
        title = title or picked["title"]
        message = message or picked["message"]

    # Resolve logo image path
    if not image_path:
        default_logo = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png"))
        if os.path.exists(default_logo):
            image_path = default_logo.replace("\\", "/")

    # Escape XML entities
    clean_title = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    clean_msg = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

    image_xml = ""
    if image_path:
        image_xml = f'<image placement="appLogoOverride" hint-crop="circle" src="file:///{image_path}"/>'

    xml_content = f'<toast duration="short"><visual><binding template="ToastGeneric"><text>{clean_title}</text><text>{clean_msg}</text>{image_xml}</binding></visual><audio src="ms-winsoundevent:Notification.Default"/></toast>'
    xml_b64 = base64.b64encode(xml_content.encode("utf-8")).decode("ascii")

    ps_code = f"""
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlCommands, ContentType = WindowsRuntime] > $null

$xmlBytes = [System.Convert]::FromBase64String('{xml_b64}')
$xmlString = [System.Text.Encoding]::UTF8.GetString($xmlBytes)

$xmlDoc = New-Object Windows.Data.Xml.Dom.XmlDocument
$xmlDoc.LoadXml($xmlString)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xmlDoc)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{app_id}')
$notifier.Show($toast)
"""

    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_code],
            capture_output=True,
            timeout=5,
        )
        if res.returncode == 0:
            logger.info("Dispatched branded Windows toast notification successfully.")
            return True
        else:
            logger.warning(f"PowerShell toast notification returned non-zero code: {res.stderr.decode('utf-8', errors='ignore')}")
            return False
    except Exception as e:
        logger.warning(f"Failed to dispatch desktop toast notification: {e}")
        return False
