"""
MindLedger - Email Sender
SMTP email delivery engine supporting TLS, Gmail App Passwords, and inline CID chart image attachments.

Author: MindLedger Team
Created: 2026-08-09
"""

import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional

from config.settings import Settings, settings
from utils.logger import get_logger

logger = get_logger(__name__)


class EmailSender:
    """SMTP manager for delivering HTML report emails with inline chart attachments."""

    def __init__(
        self,
        smtp_server: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None,
        sender_email: Optional[str] = None,
        use_tls: bool = True,
    ) -> None:
        """Initialize EmailSender with SMTP credentials.

        Args:
            smtp_server: Hostname of SMTP server (e.g. smtp.gmail.com).
            smtp_port: SMTP port (e.g. 587 or 465).
            smtp_username: Account username/email.
            smtp_password: Account app password.
            sender_email: Sender email address.
            use_tls: Whether to execute STARTTLS command.
        """
        app_settings = settings
        self.smtp_server = smtp_server or app_settings.smtp_server
        self.smtp_port = smtp_port or app_settings.smtp_port
        self.smtp_username = smtp_username or app_settings.smtp_username or ""
        self.smtp_password = smtp_password or app_settings.smtp_password or ""
        self.sender_email = sender_email or app_settings.smtp_username or ""
        self.use_tls = use_tls

    def build_mime_message(
        self,
        recipient: str,
        subject: str,
        html_content: str,
        chart_images: Optional[Dict[str, bytes]] = None,
    ) -> MIMEMultipart:
        """Build MIMEMultipart email message with HTML body and inline CID image attachments.

        Args:
            recipient: Target recipient email address.
            subject: Email subject header.
            html_content: Rendered HTML body content.
            chart_images: Dict mapping CID key (e.g. 'chart_productivity') to PNG bytes.

        Returns:
            Constructed MIMEMultipart message object.
        """
        msg = MIMEMultipart("related")
        msg["Subject"] = subject
        msg["From"] = self.sender_email or "mindledger@localhost"
        msg["To"] = recipient

        # HTML Body
        html_part = MIMEText(html_content, "html", "utf-8")
        msg.attach(html_part)

        # Inline CID Attachments
        if chart_images:
            for cid_key, image_bytes in chart_images.items():
                if not image_bytes:
                    continue
                img_part = MIMEImage(image_bytes, _subtype="png")
                # Format CID header e.g. <chart_productivity>
                img_part.add_header("Content-ID", f"<{cid_key}>")
                img_part.add_header(
                    "Content-Disposition", "inline", filename=f"{cid_key}.png"
                )
                msg.attach(img_part)

        return msg

    def send_report_email(
        self,
        recipient: str,
        subject: str,
        html_content: str,
        chart_images: Optional[Dict[str, bytes]] = None,
    ) -> bool:
        """Send HTML report email via SMTP server.

        Args:
            recipient: Target recipient email address.
            subject: Email subject.
            html_content: Rendered HTML body.
            chart_images: Optional dict of CID key to PNG bytes.

        Returns:
            True if email sent successfully, False if delivery failed.
        """
        if not recipient or not recipient.strip():
            logger.warning("Email delivery skipped: No recipient email provided.")
            return False

        if not self.smtp_username or not self.smtp_password:
            logger.warning(
                "Email delivery skipped: SMTP credentials not configured (set SMTP_USERNAME and SMTP_PASSWORD)."
            )
            return False

        try:
            msg = self.build_mime_message(
                recipient=recipient,
                subject=subject,
                html_content=html_content,
                chart_images=chart_images,
            )

            logger.info(f"Connecting to SMTP server {self.smtp_server}:{self.smtp_port}...")
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15) as server:
                server.ehlo()
                if self.use_tls:
                    server.starttls()
                    server.ehlo()

                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Report email successfully sent to {recipient} with subject '{subject}'")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {e}")
            return False
        except (smtplib.SMTPException, OSError, TimeoutError) as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email: {e}", exc_info=True)
            return False
