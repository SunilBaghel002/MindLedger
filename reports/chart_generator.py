"""
MindLedger - Chart Generator
Renders clean, high-resolution PNG chart images for email reports using Pillow (PIL).

Author: MindLedger Team
Created: 2026-08-09
"""

import io
import json
import math
import os
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont

from database.models import DailySummary
from utils.logger import get_logger

logger = get_logger(__name__)

# Design Tokens / Color Palette (White Theme)
COLOR_BACKGROUND = (255, 255, 255)
COLOR_CARD_BG = (248, 250, 252)
COLOR_TEXT_PRIMARY = (15, 23, 42)
COLOR_TEXT_MUTED = (100, 116, 139)
COLOR_GRID_LINE = (226, 232, 240)

# Activity & Productivity Colors
COLOR_PRODUCTIVE = (16, 185, 129)    # Emerald Green
COLOR_NEUTRAL = (100, 116, 139)      # Slate Gray
COLOR_UNPRODUCTIVE = (239, 68, 68)   # Coral Red
COLOR_LEARNING = (99, 102, 241)      # Indigo
COLOR_CODING = (59, 130, 246)        # Blue
COLOR_BROWSING = (14, 165, 233)      # Sky Blue
COLOR_COMMUNICATION = (139, 92, 246) # Purple
COLOR_YOUTUBE = (239, 68, 68)        # Red


def _get_font(size: int = 14) -> ImageFont.ImageFont:
    """Load default font or fallback font at specified size."""
    try:
        # Try system Arial / Segoe UI on Windows
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        try:
            return ImageFont.truetype("segoeui.ttf", size)
        except IOError:
            return ImageFont.load_default()


def _format_duration(seconds: int) -> str:
    """Format seconds into readable duration string e.g. 2h 15m or 45m."""
    if seconds <= 0:
        return "0m"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


class ChartGenerator:
    """Renders PNG charts for daily/weekly/monthly activity reports."""

    def __init__(self, width: int = 600, height: int = 350) -> None:
        """Initialize ChartGenerator with default dimensions.

        Args:
            width: Standard chart canvas width in pixels.
            height: Standard chart canvas height in pixels.
        """
        self.width = width
        self.height = height

    def _create_canvas(self, title: str) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
        """Create base image canvas with title header.

        Args:
            title: Chart section title.

        Returns:
            Tuple of (Image, ImageDraw).
        """
        img = Image.new("RGB", (self.width, self.height), COLOR_BACKGROUND)
        draw = ImageDraw.Draw(img)

        # Draw outer card border
        draw.rectangle(
            [(0, 0), (self.width - 1, self.height - 1)],
            outline=COLOR_GRID_LINE,
            width=1,
        )

        # Title
        font_title = _get_font(18)
        draw.text((20, 15), title, fill=COLOR_TEXT_PRIMARY, font=font_title)

        # Header divider line
        draw.line([(20, 45), (self.width - 20, 45)], fill=COLOR_GRID_LINE, width=1)

        return img, draw

    def _export_image(self, img: Image.Image, output_path: Optional[str] = None) -> bytes:
        """Save image to BytesIO buffer and optionally to file path.

        Args:
            img: PIL Image object.
            output_path: Optional file path to write image.

        Returns:
            PNG image bytes.
        """
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()

        if output_path:
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(png_bytes)
            logger.info(f"Chart image saved to {output_path}")

        return png_bytes

    def generate_screen_time_bar_chart(
        self, daily_summary: DailySummary, output_path: Optional[str] = None
    ) -> bytes:
        """Generate vertical bar chart showing category screen time breakdown.

        Args:
            daily_summary: DailySummary model with tracking metrics.
            output_path: Optional file path to save PNG.

        Returns:
            PNG image bytes.
        """
        img, draw = self._create_canvas("Screen Time Breakdown by Category")

        categories = [
            ("Coding", daily_summary.coding_seconds, COLOR_CODING),
            ("Learning", daily_summary.learning_seconds, COLOR_LEARNING),
            ("Browsing", daily_summary.browsing_seconds, COLOR_BROWSING),
            ("Comm", daily_summary.communication_seconds, COLOR_COMMUNICATION),
            ("YouTube", daily_summary.youtube_seconds, COLOR_YOUTUBE),
        ]

        max_val = max([c[1] for c in categories] + [3600])  # Minimum 1 hour scale
        chart_top = 70
        chart_bottom = self.height - 50
        chart_left = 60
        chart_right = self.width - 20
        chart_height = chart_bottom - chart_top
        chart_width = chart_right - chart_left

        # Draw grid lines
        font_axis = _get_font(11)
        font_label = _get_font(12)

        for i in range(4):
            val = max_val * (i / 3)
            y = chart_bottom - int((i / 3) * chart_height)
            draw.line([(chart_left, y), (chart_right, y)], fill=COLOR_GRID_LINE, width=1)
            draw.text((10, y - 6), _format_duration(int(val)), fill=COLOR_TEXT_MUTED, font=font_axis)

        # Draw bars
        bar_count = len(categories)
        gap = 25
        bar_w = (chart_width - (gap * (bar_count + 1))) // bar_count

        for idx, (label, duration, color) in enumerate(categories):
            x1 = chart_left + gap + idx * (bar_w + gap)
            x2 = x1 + bar_w
            bar_h = int((duration / max_val) * chart_height) if max_val > 0 else 0
            y1 = chart_bottom - bar_h
            y2 = chart_bottom

            if bar_h > 0:
                draw.rectangle([(x1, y1), (x2, y2)], fill=color)

            # Category x-axis label
            draw.text((x1 + (bar_w // 2) - 15, chart_bottom + 10), label, fill=COLOR_TEXT_PRIMARY, font=font_label)

            # Value label above bar
            if duration > 0:
                val_str = _format_duration(duration)
                draw.text((x1 + 2, max(chart_top, y1 - 18)), val_str, fill=COLOR_TEXT_MUTED, font=font_axis)

        return self._export_image(img, output_path)

    def generate_productivity_donut_chart(
        self, daily_summary: DailySummary, output_path: Optional[str] = None
    ) -> bytes:
        """Generate donut chart showing Productive vs Neutral vs Unproductive split.

        Args:
            daily_summary: DailySummary model with productivity metrics.
            output_path: Optional file path to save PNG.

        Returns:
            PNG image bytes.
        """
        img, draw = self._create_canvas("Productivity Score & Split")

        slices = [
            ("Productive", daily_summary.productive_seconds, COLOR_PRODUCTIVE),
            ("Learning", daily_summary.learning_seconds, COLOR_LEARNING),
            ("Neutral", daily_summary.neutral_seconds, COLOR_NEUTRAL),
            ("Unproductive", daily_summary.unproductive_seconds, COLOR_UNPRODUCTIVE),
        ]

        total_sec = sum(s[1] for s in slices)
        center_x, center_y = 160, 195
        outer_radius = 100
        inner_radius = 60

        font_label = _get_font(13)
        font_score = _get_font(24)
        font_sub = _get_font(11)

        # Draw donut slices
        if total_sec > 0:
            start_angle = -90.0
            bbox = [
                center_x - outer_radius,
                center_y - outer_radius,
                center_x + outer_radius,
                center_y + outer_radius,
            ]
            for label, duration, color in slices:
                if duration <= 0:
                    continue
                sweep = (duration / total_sec) * 360.0
                end_angle = start_angle + sweep
                draw.pieslice(bbox, start=start_angle, end=end_angle, fill=color)
                start_angle = end_angle

            # Draw inner hole
            inner_bbox = [
                center_x - inner_radius,
                center_y - inner_radius,
                center_x + inner_radius,
                center_y + inner_radius,
            ]
            draw.ellipse(inner_bbox, fill=COLOR_BACKGROUND)
        else:
            # Fallback circle if zero activity
            bbox = [
                center_x - outer_radius,
                center_y - outer_radius,
                center_x + outer_radius,
                center_y + outer_radius,
            ]
            draw.ellipse(bbox, fill=COLOR_CARD_BG, outline=COLOR_GRID_LINE)

        # Draw Score in Center
        score_str = f"{daily_summary.productivity_score:.1f}"
        draw.text((center_x - 22, center_y - 18), score_str, fill=COLOR_TEXT_PRIMARY, font=font_score)
        draw.text((center_x - 14, center_y + 12), "Score", fill=COLOR_TEXT_MUTED, font=font_sub)

        # Draw Legend on Right
        legend_x = 310
        legend_y = 80

        for label, duration, color in slices:
            pct = (duration / total_sec * 100) if total_sec > 0 else 0.0
            dur_str = _format_duration(duration)

            # Legend color box
            draw.rectangle([(legend_x, legend_y), (legend_x + 14, legend_y + 14)], fill=color)

            # Label text
            text_str = f"{label}: {dur_str} ({pct:.1f}%)"
            draw.text((legend_x + 24, legend_y), text_str, fill=COLOR_TEXT_PRIMARY, font=font_label)

            legend_y += 35

        return self._export_image(img, output_path)

    def generate_app_usage_bar_chart(
        self, top_apps: List[Dict[str, Any]], output_path: Optional[str] = None
    ) -> bytes:
        """Generate horizontal bar chart for top used applications.

        Args:
            top_apps: List of dicts with app_name, duration_seconds, percentage.
            output_path: Optional file path to save PNG.

        Returns:
            PNG image bytes.
        """
        img, draw = self._create_canvas("Top Applications Used")

        if not top_apps:
            font_msg = _get_font(14)
            draw.text((40, 160), "No application usage recorded for today.", fill=COLOR_TEXT_MUTED, font=font_msg)
            return self._export_image(img, output_path)

        max_duration = max(app["duration_seconds"] for app in top_apps) or 1
        start_y = 70
        row_height = 48
        bar_left = 180
        bar_max_width = self.width - bar_left - 100

        font_label = _get_font(13)
        font_val = _get_font(12)

        for idx, app in enumerate(top_apps[:5]):
            y = start_y + (idx * row_height)
            app_name = app["app_name"]
            if len(app_name) > 18:
                app_name = app_name[:15] + "..."

            # App name label
            draw.text((20, y + 6), app_name, fill=COLOR_TEXT_PRIMARY, font=font_label)

            # Horizontal bar
            duration = app["duration_seconds"]
            bar_w = int((duration / max_duration) * bar_max_width)
            draw.rectangle([(bar_left, y + 4), (bar_left + bar_w, y + 24)], fill=COLOR_CODING)

            # Value string
            pct = app.get("percentage", 0.0)
            val_str = f"{_format_duration(duration)} ({pct}%)"
            draw.text((bar_left + bar_w + 10, y + 6), val_str, fill=COLOR_TEXT_MUTED, font=font_val)

        return self._export_image(img, output_path)

    def generate_website_usage_bar_chart(
        self, top_domains: List[Dict[str, Any]], output_path: Optional[str] = None
    ) -> bytes:
        """Generate horizontal bar chart for top visited websites/domains.

        Args:
            top_domains: List of dicts with domain, duration_seconds, percentage.
            output_path: Optional file path to save PNG.

        Returns:
            PNG image bytes.
        """
        img, draw = self._create_canvas("Top Websites Visited")

        if not top_domains:
            font_msg = _get_font(14)
            draw.text((40, 160), "No browser domain activity recorded for today.", fill=COLOR_TEXT_MUTED, font=font_msg)
            return self._export_image(img, output_path)

        max_duration = max(d["duration_seconds"] for d in top_domains) or 1
        start_y = 70
        row_height = 48
        bar_left = 180
        bar_max_width = self.width - bar_left - 100

        font_label = _get_font(13)
        font_val = _get_font(12)

        for idx, domain_item in enumerate(top_domains[:5]):
            y = start_y + (idx * row_height)
            domain_name = domain_item["domain"]
            if len(domain_name) > 18:
                domain_name = domain_name[:15] + "..."

            draw.text((20, y + 6), domain_name, fill=COLOR_TEXT_PRIMARY, font=font_label)

            duration = domain_item["duration_seconds"]
            bar_w = int((duration / max_duration) * bar_max_width)
            draw.rectangle([(bar_left, y + 4), (bar_left + bar_w, y + 24)], fill=COLOR_BROWSING)

            pct = domain_item.get("percentage", 0.0)
            val_str = f"{_format_duration(duration)} ({pct}%)"
            draw.text((bar_left + bar_w + 10, y + 6), val_str, fill=COLOR_TEXT_MUTED, font=font_val)

        return self._export_image(img, output_path)

    def generate_youtube_breakdown_chart(
        self,
        top_channels: List[Dict[str, Any]],
        total_yt_seconds: int = 0,
        output_path: Optional[str] = None,
    ) -> bytes:
        """Generate breakdown chart for top watched YouTube channels.

        Args:
            top_channels: List of dicts with channel_name, watch_duration_seconds, percentage.
            total_yt_seconds: Total YouTube watch duration in seconds.
            output_path: Optional file path to save PNG.

        Returns:
            PNG image bytes.
        """
        img, draw = self._create_canvas("YouTube Channel Breakdown")

        font_label = _get_font(13)
        font_val = _get_font(12)

        if not top_channels:
            font_msg = _get_font(14)
            draw.text((40, 160), "No YouTube activity recorded for today.", fill=COLOR_TEXT_MUTED, font=font_msg)
            return self._export_image(img, output_path)

        max_duration = max(c["watch_duration_seconds"] for c in top_channels) or 1
        start_y = 70
        row_height = 48
        bar_left = 180
        bar_max_width = self.width - bar_left - 100

        for idx, channel in enumerate(top_channels[:5]):
            y = start_y + (idx * row_height)
            ch_name = channel["channel_name"]
            if len(ch_name) > 18:
                ch_name = ch_name[:15] + "..."

            draw.text((20, y + 6), ch_name, fill=COLOR_TEXT_PRIMARY, font=font_label)

            duration = channel["watch_duration_seconds"]
            bar_w = int((duration / max_duration) * bar_max_width)
            draw.rectangle([(bar_left, y + 4), (bar_left + bar_w, y + 24)], fill=COLOR_YOUTUBE)

            pct = channel.get("percentage", 0.0)
            val_str = f"{_format_duration(duration)} ({pct}%)"
            draw.text((bar_left + bar_w + 10, y + 6), val_str, fill=COLOR_TEXT_MUTED, font=font_val)

        return self._export_image(img, output_path)

    def generate_all_report_charts(
        self, daily_summary: DailySummary, output_dir: Optional[str] = None
    ) -> Dict[str, bytes]:
        """Generate all 5 standard charts for a daily summary report.

        Args:
            daily_summary: DailySummary object containing aggregated tracking data.
            output_dir: Optional directory path to save image files.

        Returns:
            Dict mapping chart key ('screen_time', 'productivity', 'apps', 'websites', 'youtube')
            to PNG image bytes.
        """
        top_apps = json.loads(daily_summary.top_apps_json) if daily_summary.top_apps_json else []
        top_domains = json.loads(daily_summary.top_domains_json) if daily_summary.top_domains_json else []
        top_channels = json.loads(daily_summary.top_channels_json) if daily_summary.top_channels_json else []

        fn = lambda name: os.path.join(output_dir, f"{daily_summary.date}_{name}.png") if output_dir else None

        charts = {
            "screen_time": self.generate_screen_time_bar_chart(daily_summary, fn("screen_time")),
            "productivity": self.generate_productivity_donut_chart(daily_summary, fn("productivity")),
            "apps": self.generate_app_usage_bar_chart(top_apps, fn("apps")),
            "websites": self.generate_website_usage_bar_chart(top_domains, fn("websites")),
            "youtube": self.generate_youtube_breakdown_chart(
                top_channels, daily_summary.youtube_seconds, fn("youtube")
            ),
        }
        return charts
