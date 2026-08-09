"""
MindLedger - Summary Repository
Data access layer for daily and periodic activity summaries (aggregation & queries).

Author: MindLedger Team
Created: 2026-08-09
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from database.models import DailySummary, PeriodicSummary
from utils.logger import get_logger

logger = get_logger(__name__)


from ai.productivity_scorer import calculate_productivity_score, ProductivityScorer


class SummaryRepository:
    """Repository for managing daily_summaries and periodic_summaries tables."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize SummaryRepository with SQLite connection.

        Args:
            connection: Active sqlite3.Connection instance.
        """
        self.conn = connection
        self.conn.row_factory = sqlite3.Row

    def get_daily_summary(self, date_str: str) -> Optional[DailySummary]:
        """Fetch daily summary for a specific date (YYYY-MM-DD).

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            DailySummary model if found, None otherwise.
        """
        cursor = self.conn.execute(
            "SELECT * FROM daily_summaries WHERE date = ?", (date_str,)
        )
        row = cursor.fetchone()
        if row:
            return DailySummary.from_row(row)
        return None

    def save_daily_summary(self, summary: DailySummary) -> DailySummary:
        """Insert or update a DailySummary record in daily_summaries table.

        Args:
            summary: DailySummary model instance.

        Returns:
            Updated DailySummary instance.
        """
        self.conn.execute(
            """
            INSERT INTO daily_summaries (
                date, total_screen_time_seconds, active_time_seconds, idle_time_seconds,
                productive_seconds, neutral_seconds, unproductive_seconds,
                learning_seconds, coding_seconds, browsing_seconds, youtube_seconds,
                communication_seconds, most_used_app, most_used_app_seconds,
                most_visited_domain, most_visited_domain_seconds,
                most_watched_channel, most_watched_channel_seconds,
                total_apps_used, total_domains_visited, total_youtube_videos,
                productivity_score, top_apps_json, top_domains_json,
                top_channels_json, insights_json, email_sent
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON CONFLICT(date) DO UPDATE SET
                total_screen_time_seconds=excluded.total_screen_time_seconds,
                active_time_seconds=excluded.active_time_seconds,
                idle_time_seconds=excluded.idle_time_seconds,
                productive_seconds=excluded.productive_seconds,
                neutral_seconds=excluded.neutral_seconds,
                unproductive_seconds=excluded.unproductive_seconds,
                learning_seconds=excluded.learning_seconds,
                coding_seconds=excluded.coding_seconds,
                browsing_seconds=excluded.browsing_seconds,
                youtube_seconds=excluded.youtube_seconds,
                communication_seconds=excluded.communication_seconds,
                most_used_app=excluded.most_used_app,
                most_used_app_seconds=excluded.most_used_app_seconds,
                most_visited_domain=excluded.most_visited_domain,
                most_visited_domain_seconds=excluded.most_visited_domain_seconds,
                most_watched_channel=excluded.most_watched_channel,
                most_watched_channel_seconds=excluded.most_watched_channel_seconds,
                total_apps_used=excluded.total_apps_used,
                total_domains_visited=excluded.total_domains_visited,
                total_youtube_videos=excluded.total_youtube_videos,
                productivity_score=excluded.productivity_score,
                top_apps_json=excluded.top_apps_json,
                top_domains_json=excluded.top_domains_json,
                top_channels_json=excluded.top_channels_json,
                insights_json=excluded.insights_json,
                email_sent=excluded.email_sent
            """,
            (
                summary.date,
                summary.total_screen_time_seconds,
                summary.active_time_seconds,
                summary.idle_time_seconds,
                summary.productive_seconds,
                summary.neutral_seconds,
                summary.unproductive_seconds,
                summary.learning_seconds,
                summary.coding_seconds,
                summary.browsing_seconds,
                summary.youtube_seconds,
                summary.communication_seconds,
                summary.most_used_app,
                summary.most_used_app_seconds,
                summary.most_visited_domain,
                summary.most_visited_domain_seconds,
                summary.most_watched_channel,
                summary.most_watched_channel_seconds,
                summary.total_apps_used,
                summary.total_domains_visited,
                summary.total_youtube_videos,
                summary.productivity_score,
                summary.top_apps_json,
                summary.top_domains_json,
                summary.top_channels_json,
                summary.insights_json,
                summary.email_sent,
            ),
        )
        self.conn.commit()
        updated = self.get_daily_summary(summary.date)
        return updated if updated else summary

    def calculate_top_apps(
        self, date_str: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Calculate top used applications for a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of apps to return.

        Returns:
            List of dicts containing app_name, duration_seconds, and percentage.
        """
        cursor = self.conn.execute(
            """
            SELECT app_name, SUM(duration_seconds) as total_duration
            FROM app_sessions
            WHERE date = ? AND is_foreground = 1
            GROUP BY app_name
            ORDER BY total_duration DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        rows = cursor.fetchall()
        if not rows:
            return []

        total_app_time = sum(row["total_duration"] for row in rows) or 1
        results = []
        for row in rows:
            duration = row["total_duration"]
            pct = round((duration / total_app_time) * 100, 1)
            results.append(
                {
                    "app_name": row["app_name"],
                    "duration_seconds": duration,
                    "percentage": pct,
                }
            )
        return results

    def calculate_top_domains(
        self, date_str: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Calculate top visited browser domains for a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of domains to return.

        Returns:
            List of dicts containing domain, duration_seconds, and percentage.
        """
        cursor = self.conn.execute(
            """
            SELECT domain, SUM(duration_seconds) as total_duration
            FROM browser_sessions
            WHERE date = ?
            GROUP BY domain
            ORDER BY total_duration DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        rows = cursor.fetchall()
        if not rows:
            return []

        total_domain_time = sum(row["total_duration"] for row in rows) or 1
        results = []
        for row in rows:
            duration = row["total_duration"]
            pct = round((duration / total_domain_time) * 100, 1)
            results.append(
                {
                    "domain": row["domain"],
                    "duration_seconds": duration,
                    "percentage": pct,
                }
            )
        return results

    def calculate_top_channels(
        self, date_str: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Calculate top watched YouTube channels for a given date.

        Args:
            date_str: Date string in YYYY-MM-DD format.
            limit: Maximum number of channels to return.

        Returns:
            List of dicts containing channel_name, watch_duration_seconds, and percentage.
        """
        cursor = self.conn.execute(
            """
            SELECT channel_name, SUM(watch_duration_seconds) as total_duration
            FROM youtube_activity
            WHERE date = ? AND channel_name IS NOT NULL AND channel_name != ''
            GROUP BY channel_name
            ORDER BY total_duration DESC
            LIMIT ?
            """,
            (date_str, limit),
        )
        rows = cursor.fetchall()
        if not rows:
            return []

        total_yt_time = sum(row["total_duration"] for row in rows) or 1
        results = []
        for row in rows:
            duration = row["total_duration"]
            pct = round((duration / total_yt_time) * 100, 1)
            results.append(
                {
                    "channel_name": row["channel_name"],
                    "watch_duration_seconds": duration,
                    "percentage": pct,
                }
            )
        return results

    def aggregate_daily_summary(self, date_str: str) -> DailySummary:
        """Aggregate daily tracking activity and store summary in database.

        Args:
            date_str: Target date string in YYYY-MM-DD format.

        Returns:
            Aggregated and persisted DailySummary object.
        """
        # 1. Aggregate app_sessions
        cursor = self.conn.execute(
            """
            SELECT
                COALESCE(SUM(duration_seconds), 0) as total_screen_time,
                COALESCE(SUM(CASE WHEN is_foreground = 1 THEN duration_seconds ELSE 0 END), 0) as active_time,
                COALESCE(SUM(CASE WHEN category = 'coding' THEN duration_seconds ELSE 0 END), 0) as coding_time,
                COALESCE(SUM(CASE WHEN category = 'learning' THEN duration_seconds ELSE 0 END), 0) as learning_time,
                COALESCE(SUM(CASE WHEN category = 'browsing' THEN duration_seconds ELSE 0 END), 0) as browsing_time,
                COALESCE(SUM(CASE WHEN category = 'communication' THEN duration_seconds ELSE 0 END), 0) as comm_time,
                COALESCE(SUM(CASE WHEN productivity = 'productive' THEN duration_seconds ELSE 0 END), 0) as prod_time,
                COALESCE(SUM(CASE WHEN productivity = 'neutral' THEN duration_seconds ELSE 0 END), 0) as neutral_time,
                COALESCE(SUM(CASE WHEN productivity = 'unproductive' THEN duration_seconds ELSE 0 END), 0) as unprod_time,
                COUNT(DISTINCT app_name) as total_apps
            FROM app_sessions
            WHERE date = ?
            """,
            (date_str,),
        )
        app_data = cursor.fetchone()

        total_screen_time = app_data["total_screen_time"]
        active_time = app_data["active_time"]
        coding_seconds = app_data["coding_time"]
        learning_seconds = app_data["learning_time"]
        browsing_seconds = app_data["browsing_time"]
        comm_seconds = app_data["comm_time"]
        prod_seconds = app_data["prod_time"]
        neutral_seconds = app_data["neutral_time"]
        unprod_seconds = app_data["unprod_time"]
        total_apps = app_data["total_apps"]

        # 2. Aggregate browser_sessions
        cursor = self.conn.execute(
            """
            SELECT COUNT(DISTINCT domain) as total_domains
            FROM browser_sessions
            WHERE date = ?
            """,
            (date_str,),
        )
        browser_data = cursor.fetchone()
        total_domains = browser_data["total_domains"] if browser_data else 0

        # 3. Aggregate youtube_activity
        cursor = self.conn.execute(
            """
            SELECT
                COALESCE(SUM(watch_duration_seconds), 0) as youtube_time,
                COUNT(id) as total_videos,
                COALESCE(SUM(CASE WHEN is_productive = 1 THEN watch_duration_seconds ELSE 0 END), 0) as yt_prod_time,
                COALESCE(SUM(CASE WHEN is_productive = 0 THEN watch_duration_seconds ELSE 0 END), 0) as yt_ent_time
            FROM youtube_activity
            WHERE date = ?
            """,
            (date_str,),
        )
        yt_data = cursor.fetchone()
        yt_seconds = yt_data["youtube_time"]
        yt_videos = yt_data["total_videos"]
        yt_prod_seconds = yt_data["yt_prod_time"]
        yt_ent_seconds = yt_data["yt_ent_time"]

        # Top lists
        top_apps = self.calculate_top_apps(date_str)
        top_domains = self.calculate_top_domains(date_str)
        top_channels = self.calculate_top_channels(date_str)

        most_used_app = top_apps[0]["app_name"] if top_apps else None
        most_used_app_sec = top_apps[0]["duration_seconds"] if top_apps else 0

        most_visited_dom = top_domains[0]["domain"] if top_domains else None
        most_visited_dom_sec = top_domains[0]["duration_seconds"] if top_domains else 0

        most_watched_chan = top_channels[0]["channel_name"] if top_channels else None
        most_watched_chan_sec = top_channels[0]["watch_duration_seconds"] if top_channels else 0

        # Productivity Score
        score = calculate_productivity_score(
            productive_seconds=prod_seconds,
            learning_seconds=learning_seconds,
            neutral_seconds=neutral_seconds,
            unproductive_seconds=unprod_seconds,
            coding_seconds=coding_seconds,
            youtube_productive_seconds=yt_prod_seconds,
            youtube_entertainment_seconds=yt_ent_seconds,
        )

        summary_dict = {
            "date": date_str,
            "total_screen_time_seconds": total_screen_time,
            "active_time_seconds": active_time,
            "productive_seconds": prod_seconds,
            "neutral_seconds": neutral_seconds,
            "unproductive_seconds": unprod_seconds,
            "learning_seconds": learning_seconds,
            "coding_seconds": coding_seconds,
            "youtube_seconds": yt_seconds,
            "communication_seconds": comm_seconds,
            "most_used_app": most_used_app,
            "most_used_app_seconds": most_used_app_sec,
            "total_apps_used": total_apps,
            "total_domains_visited": total_domains,
            "total_youtube_videos": yt_videos,
            "productivity_score": score,
            "top_apps_json": json.dumps(top_apps),
            "top_domains_json": json.dumps(top_domains),
            "top_channels_json": json.dumps(top_channels),
        }

        from ai.insights_generator import InsightsGenerator
        insights_list = InsightsGenerator.generate_daily_insights(summary_dict)

        daily_summary = DailySummary(
            date=date_str,
            total_screen_time_seconds=total_screen_time,
            active_time_seconds=active_time,
            idle_time_seconds=max(0, total_screen_time - active_time),
            productive_seconds=prod_seconds,
            neutral_seconds=neutral_seconds,
            unproductive_seconds=unprod_seconds,
            learning_seconds=learning_seconds,
            coding_seconds=coding_seconds,
            browsing_seconds=browsing_seconds,
            youtube_seconds=yt_seconds,
            communication_seconds=comm_seconds,
            most_used_app=most_used_app,
            most_used_app_seconds=most_used_app_sec,
            most_visited_domain=most_visited_dom,
            most_visited_domain_seconds=most_visited_dom_sec,
            most_watched_channel=most_watched_chan,
            most_watched_channel_seconds=most_watched_chan_sec,
            total_apps_used=total_apps,
            total_domains_visited=total_domains,
            total_youtube_videos=yt_videos,
            productivity_score=score,
            top_apps_json=json.dumps(top_apps),
            top_domains_json=json.dumps(top_domains),
            top_channels_json=json.dumps(top_channels),
            insights_json=json.dumps(insights_list),
            email_sent=False,
        )

        return self.save_daily_summary(daily_summary)

    def get_periodic_summary(
        self, period_type: str, period_label: str
    ) -> Optional[PeriodicSummary]:
        """Fetch periodic summary by type ('weekly'|'monthly') and label.

        Args:
            period_type: Period type ('weekly' or 'monthly').
            period_label: Period label string.

        Returns:
            PeriodicSummary model if found, None otherwise.
        """
        cursor = self.conn.execute(
            """
            SELECT * FROM periodic_summaries
            WHERE period_type = ? AND period_label = ?
            """,
            (period_type, period_label),
        )
        row = cursor.fetchone()
        if row:
            return PeriodicSummary.from_row(row)
        return None

    def save_periodic_summary(self, summary: PeriodicSummary) -> PeriodicSummary:
        """Insert or update a PeriodicSummary record.

        Args:
            summary: PeriodicSummary model instance.

        Returns:
            Persisted PeriodicSummary instance.
        """
        existing = self.get_periodic_summary(summary.period_type, summary.period_label)
        if existing and existing.id:
            self.conn.execute(
                """
                UPDATE periodic_summaries SET
                    period_start=?, period_end=?,
                    total_screen_time_seconds=?, productive_seconds=?, unproductive_seconds=?,
                    learning_seconds=?, avg_daily_seconds=?, avg_productivity_score=?,
                    best_day=?, worst_day=?, top_apps_json=?, top_domains_json=?,
                    top_channels_json=?, trends_json=?, comparison_json=?, email_sent=?
                WHERE id=?
                """,
                (
                    summary.period_start,
                    summary.period_end,
                    summary.total_screen_time_seconds,
                    summary.productive_seconds,
                    summary.unproductive_seconds,
                    summary.learning_seconds,
                    summary.avg_daily_seconds,
                    summary.avg_productivity_score,
                    summary.best_day,
                    summary.worst_day,
                    summary.top_apps_json,
                    summary.top_domains_json,
                    summary.top_channels_json,
                    summary.trends_json,
                    summary.comparison_json,
                    summary.email_sent,
                    existing.id,
                ),
            )
        else:
            self.conn.execute(
                """
                INSERT INTO periodic_summaries (
                    period_type, period_label, period_start, period_end,
                    total_screen_time_seconds, productive_seconds, unproductive_seconds,
                    learning_seconds, avg_daily_seconds, avg_productivity_score,
                    best_day, worst_day, top_apps_json, top_domains_json,
                    top_channels_json, trends_json, comparison_json, email_sent
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                """,
                (
                    summary.period_type,
                    summary.period_label,
                    summary.period_start,
                    summary.period_end,
                    summary.total_screen_time_seconds,
                    summary.productive_seconds,
                    summary.unproductive_seconds,
                    summary.learning_seconds,
                    summary.avg_daily_seconds,
                    summary.avg_productivity_score,
                    summary.best_day,
                    summary.worst_day,
                    summary.top_apps_json,
                    summary.top_domains_json,
                    summary.top_channels_json,
                    summary.trends_json,
                    summary.comparison_json,
                    summary.email_sent,
                ),
            )
        self.conn.commit()
        updated = self.get_periodic_summary(summary.period_type, summary.period_label)
        return updated if updated else summary


    def aggregate_weekly_summary(
        self, period_start: str, period_end: str, period_label: str
    ) -> PeriodicSummary:
        """Aggregate daily summaries over a 7-day range into a weekly PeriodicSummary.

        Args:
            period_start: Start date string (YYYY-MM-DD).
            period_end: End date string (YYYY-MM-DD).
            period_label: Label string e.g. "Week 3, Aug 2026".

        Returns:
            Aggregated PeriodicSummary.
        """
        return self._aggregate_periodic_summary(
            period_type="weekly",
            period_start=period_start,
            period_end=period_end,
            period_label=period_label,
        )

    def aggregate_monthly_summary(
        self, period_start: str, period_end: str, period_label: str
    ) -> PeriodicSummary:
        """Aggregate daily summaries over a calendar month range into a monthly PeriodicSummary.

        Args:
            period_start: Start date string (YYYY-MM-DD).
            period_end: End date string (YYYY-MM-DD).
            period_label: Label string e.g. "August 2026".

        Returns:
            Aggregated PeriodicSummary.
        """
        return self._aggregate_periodic_summary(
            period_type="monthly",
            period_start=period_start,
            period_end=period_end,
            period_label=period_label,
        )

    def _aggregate_periodic_summary(
        self,
        period_type: str,
        period_start: str,
        period_end: str,
        period_label: str,
    ) -> PeriodicSummary:
        """Internal helper for aggregating daily summaries for a period range."""
        cursor = self.conn.execute(
            """
            SELECT * FROM daily_summaries
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC
            """,
            (period_start, period_end),
        )
        rows = cursor.fetchall()
        summaries = [DailySummary.from_row(row) for row in rows]

        days_count = len(summaries) or 1
        total_screen_time = sum(s.total_screen_time_seconds for s in summaries)
        prod_time = sum(s.productive_seconds for s in summaries)
        unprod_time = sum(s.unproductive_seconds for s in summaries)
        learning_time = sum(s.learning_seconds for s in summaries)

        avg_daily = total_screen_time // days_count if days_count > 0 else 0
        avg_score = (
            round(sum(s.productivity_score for s in summaries) / days_count, 1)
            if days_count > 0
            else 0.0
        )

        best_day = max(summaries, key=lambda s: s.productivity_score).date if summaries else None
        worst_day = min(summaries, key=lambda s: s.productivity_score).date if summaries else None

        # Aggregate top apps
        app_map: Dict[str, int] = {}
        domain_map: Dict[str, int] = {}
        channel_map: Dict[str, int] = {}

        trends = []
        for s in summaries:
            trends.append(
                {
                    "date": s.date,
                    "productivity_score": s.productivity_score,
                    "screen_time_seconds": s.total_screen_time_seconds,
                }
            )
            if s.top_apps_json:
                for app in json.loads(s.top_apps_json):
                    name = app["app_name"]
                    app_map[name] = app_map.get(name, 0) + app["duration_seconds"]

            if s.top_domains_json:
                for dom in json.loads(s.top_domains_json):
                    dname = dom["domain"]
                    domain_map[dname] = domain_map.get(dname, 0) + dom["duration_seconds"]

            if s.top_channels_json:
                for ch in json.loads(s.top_channels_json):
                    cname = ch["channel_name"]
                    channel_map[cname] = (
                        channel_map.get(cname, 0) + ch["watch_duration_seconds"]
                    )

        top_apps = sorted(
            [{"app_name": k, "duration_seconds": v} for k, v in app_map.items()],
            key=lambda x: x["duration_seconds"],
            reverse=True,
        )[:5]

        top_domains = sorted(
            [{"domain": k, "duration_seconds": v} for k, v in domain_map.items()],
            key=lambda x: x["duration_seconds"],
            reverse=True,
        )[:5]

        top_channels = sorted(
            [
                {"channel_name": k, "watch_duration_seconds": v}
                for k, v in channel_map.items()
            ],
            key=lambda x: x["watch_duration_seconds"],
            reverse=True,
        )[:5]

        periodic_summary = PeriodicSummary(
            period_type=period_type,
            period_label=period_label,
            period_start=period_start,
            period_end=period_end,
            total_screen_time_seconds=total_screen_time,
            productive_seconds=prod_time,
            unproductive_seconds=unprod_time,
            learning_seconds=learning_time,
            avg_daily_seconds=avg_daily,
            avg_productivity_score=avg_score,
            best_day=best_day,
            worst_day=worst_day,
            top_apps_json=json.dumps(top_apps),
            top_domains_json=json.dumps(top_domains),
            top_channels_json=json.dumps(top_channels),
            trends_json=json.dumps(trends),
            comparison_json=json.dumps({}),
            email_sent=False,
        )

        return self.save_periodic_summary(periodic_summary)
