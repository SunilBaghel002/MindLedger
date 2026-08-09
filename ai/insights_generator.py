"""
MindLedger - AI Insights Generator Engine
Generates meaningful, template-based daily and weekly AI insights with conditional triggers and pattern detection.

Author: MindLedger Team
Created: 2026-08-09
"""

import json
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


class InsightsGenerator:
    """Template and rule-based insight generation engine."""

    @staticmethod
    def _format_hours(seconds: int) -> str:
        """Format seconds into readable hours string (e.g. '3.5')."""
        return f"{round(seconds / 3600.0, 1)}"

    @staticmethod
    def _format_mins(seconds: int) -> str:
        """Format seconds into readable minutes integer string (e.g. '45')."""
        return f"{round(seconds / 60.0)}"

    @classmethod
    def generate_daily_insights(
        cls,
        today_summary: Dict[str, Any],
        historical_summaries: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """Generate a list of actionable insights for a daily summary.

        Args:
            today_summary: Dictionary containing today's summary metrics.
            historical_summaries: Optional list of past DailySummary dictionaries.

        Returns:
            List of insight strings.
        """
        insights: List[str] = []

        total_time = today_summary.get("total_screen_time_seconds") or today_summary.get("active_time_seconds") or 0
        score = float(today_summary.get("productivity_score") or 0.0)
        productive_sec = today_summary.get("productive_seconds") or 0
        learning_sec = today_summary.get("learning_seconds") or 0
        unproductive_sec = today_summary.get("unproductive_seconds") or 0
        coding_sec = today_summary.get("coding_seconds") or 0
        youtube_sec = today_summary.get("youtube_seconds") or 0
        communication_sec = today_summary.get("communication_seconds") or 0
        most_used_app = today_summary.get("most_used_app")
        most_used_app_sec = today_summary.get("most_used_app_seconds") or 0

        # Calculate percentage split
        productive_pct = round(((productive_sec + learning_sec) / total_time * 100.0), 1) if total_time > 0 else 0.0

        # 1. Overall Productivity Tier Insight
        if score >= 75.0:
            insights.append(
                f"🎉 Great day! You spent {productive_pct}% of your active screen time productively. Keep up the high focus!"
            )
        elif score >= 50.0:
            insights.append(
                f"👍 Decent day. You spent {productive_pct}% of your time productively. Room for improvement — try reducing distractors tomorrow."
            )
        elif total_time > 0:
            top_app_str = f" {most_used_app} consumed {cls._format_hours(most_used_app_sec)}h." if most_used_app else ""
            insights.append(
                f"⚠️ Heads up — only {productive_pct}% of your screen time was productive today.{top_app_str} Consider setting focus limits."
            )

        # 2. Deep Work / Coding Insight
        if coding_sec >= 14400:  # 4+ hours
            insights.append(
                f"💻 Coding beast! You logged {cls._format_hours(coding_sec)}h of deep coding work today. Solid progress!"
            )
        elif coding_sec >= 3600:  # 1-4 hours
            insights.append(f"💻 Good dev session! You spent {cls._format_hours(coding_sec)}h coding today.")

        # 3. YouTube Split Insight
        if youtube_sec >= 3600:  # 1+ hour YouTube
            # Parse top channels or estimates
            top_channels_raw = today_summary.get("top_channels_json")
            top_channels = []
            if isinstance(top_channels_raw, str):
                try:
                    top_channels = json.loads(top_channels_raw)
                except Exception:
                    top_channels = []
            elif isinstance(top_channels_raw, list):
                top_channels = top_channels_raw

            yt_productive_sec = 0
            yt_entertainment_sec = 0
            if top_channels:
                for ch in top_channels:
                    cat = ch.get("category", "")
                    if cat in ["learning", "coding"]:
                        yt_productive_sec += ch.get("duration_seconds", 0)
                    else:
                        yt_entertainment_sec += ch.get("duration_seconds", 0)

            if yt_productive_sec > 0 or yt_entertainment_sec > 0:
                yt_total = yt_productive_sec + yt_entertainment_sec
                yt_prod_pct = round((yt_productive_sec / yt_total) * 100.0) if yt_total > 0 else 0
                yt_ent_pct = 100 - yt_prod_pct
                insights.append(
                    f"📺 YouTube usage: {cls._format_hours(youtube_sec)}h total ({yt_prod_pct}% educational, {yt_ent_pct}% entertainment)."
                )
            else:
                insights.append(f"📺 YouTube usage logged: {cls._format_hours(youtube_sec)}h total today.")

        # 4. Job Search Insight
        job_search_sec = today_summary.get("job_search_seconds") or 0
        if job_search_sec >= 900:  # 15+ mins
            insights.append(f"💼 Job search focus: You spent {cls._format_mins(job_search_sec)}m on career portals today.")

        # 5. Top App Usage
        if most_used_app and most_used_app_sec >= 3600:
            insights.append(
                f"📱 Top application today: {most_used_app} with {cls._format_hours(most_used_app_sec)}h total usage."
            )

        # 6. Historical Comparisons vs 7-day average
        if historical_summaries:
            past_scores = [
                float(s.get("productivity_score") or 0.0)
                for s in historical_summaries
                if s.get("productivity_score") is not None
            ]
            if past_scores:
                avg_past_score = sum(past_scores) / len(past_scores)
                score_diff = round(score - avg_past_score, 1)
                if score_diff >= 3.0:
                    insights.append(
                        f"📈 Productivity score is up +{score_diff}% compared to your past 7-day average ({round(avg_past_score, 1)})!"
                    )
                elif score_diff <= -3.0:
                    insights.append(
                        f"📉 Productivity score dropped {abs(score_diff)}% vs your 7-day average ({round(avg_past_score, 1)}). Tomorrow is a fresh start!"
                    )

        # 7. Context Switching / Total Apps Used
        total_apps = today_summary.get("total_apps_used") or 0
        if total_apps >= 10:
            insights.append(
                f"🔄 You used {total_apps} different applications today. High app-switching can break focus — try batching tasks."
            )

        # Fallback if empty
        if not insights:
            insights.append("📊 Tracking data logged. Keep building your daily productivity habits!")

        return insights

    @classmethod
    def generate_weekly_insights(
        cls,
        weekly_summary: Dict[str, Any],
        past_weeks: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """Generate a list of actionable insights for a weekly summary.

        Args:
            weekly_summary: Dictionary containing weekly summary metrics.
            past_weeks: Optional list of past weekly summary dictionaries.

        Returns:
            List of weekly insight strings.
        """
        insights: List[str] = []

        total_hours = cls._format_hours(weekly_summary.get("total_screen_time_seconds") or 0)
        avg_score = round(float(weekly_summary.get("avg_productivity_score") or 0.0), 1)
        best_day = weekly_summary.get("best_day")

        insights.append(f"🗓️ Weekly Summary: {total_hours}h total screen time with an average productivity score of {avg_score}/100.")

        if best_day:
            insights.append(f"🌟 Peak performance day of the week: {best_day}.")

        if past_weeks:
            past_scores = [float(w.get("avg_productivity_score") or 0.0) for w in past_weeks if w.get("avg_productivity_score")]
            if past_scores:
                prev_avg = sum(past_scores) / len(past_scores)
                diff = round(avg_score - prev_avg, 1)
                if diff > 0:
                    insights.append(f"📈 Weekly average score improved by +{diff} points vs previous weeks!")
                elif diff < 0:
                    insights.append(f"📉 Weekly average score dipped by {abs(diff)} points vs previous weeks.")

        return insights
