"""
MindLedger - AI Productivity Scorer Engine
Weighted algorithmic productivity scoring engine, historical trend analysis, and score grading.

Author: MindLedger Team
Created: 2026-08-09
"""

from typing import Any, Dict, List, Optional, Tuple

from utils.logger import get_logger

logger = get_logger(__name__)


def calculate_productivity_score(
    productive_seconds: int,
    learning_seconds: int,
    neutral_seconds: int,
    unproductive_seconds: int,
    coding_seconds: int = 0,
    youtube_productive_seconds: int = 0,
    youtube_entertainment_seconds: int = 0,
) -> float:
    """Calculate daily productivity score (0.0 to 100.0) based on weighted durations.

    Formula:
        raw_score = (productive * 1.0 + learning * 0.85 + neutral * 0.3 + unproductive * 0.0) / total
        score = raw_score * 100.0
        Bonus: +5.0 if coding >= 4 hours (14400s)
        Bonus: +3.0 if YouTube productive > YouTube entertainment
        Penalty: -5.0 if unproductive >= 3 hours (10800s)
        Cap: 0.0 <= score <= 100.0

    Args:
        productive_seconds: Total productive duration in seconds.
        learning_seconds: Total learning duration in seconds.
        neutral_seconds: Total neutral duration in seconds.
        unproductive_seconds: Total unproductive duration in seconds.
        coding_seconds: Total coding duration in seconds (for bonus).
        youtube_productive_seconds: Educational YouTube watch time.
        youtube_entertainment_seconds: Entertainment YouTube watch time.

    Returns:
        Productivity score between 0.0 and 100.0, rounded to 1 decimal place.
    """
    total = productive_seconds + learning_seconds + neutral_seconds + unproductive_seconds
    if total == 0:
        return 0.0

    raw_ratio = (
        (productive_seconds * 1.0)
        + (learning_seconds * 0.85)
        + (neutral_seconds * 0.3)
        + (unproductive_seconds * 0.0)
    ) / total

    score = raw_ratio * 100.0

    # Apply Bonuses
    if coding_seconds >= 14400:  # 4+ hours coding
        score += 5.0
    if youtube_productive_seconds > youtube_entertainment_seconds and youtube_productive_seconds > 0:
        score += 3.0

    # Apply Penalties
    if unproductive_seconds >= 10800:  # 3+ hours unproductive
        score -= 5.0

    return max(0.0, min(100.0, round(score, 1)))


class ProductivityScorer:
    """Productivity Scorer Engine for score calculation, grading, breakdown, and historical analysis."""

    @staticmethod
    def calculate(
        productive_seconds: int,
        learning_seconds: int,
        neutral_seconds: int,
        unproductive_seconds: int,
        coding_seconds: int = 0,
        youtube_productive_seconds: int = 0,
        youtube_entertainment_seconds: int = 0,
    ) -> float:
        """Delegate calculation to standard formula function."""
        return calculate_productivity_score(
            productive_seconds=productive_seconds,
            learning_seconds=learning_seconds,
            neutral_seconds=neutral_seconds,
            unproductive_seconds=unproductive_seconds,
            coding_seconds=coding_seconds,
            youtube_productive_seconds=youtube_productive_seconds,
            youtube_entertainment_seconds=youtube_entertainment_seconds,
        )

    @staticmethod
    def get_score_grade(score: float) -> Tuple[str, str]:
        """Get descriptive performance grade and icon for a score.

        Args:
            score: Productivity score (0-100).

        Returns:
            Tuple of (Grade Name, Emoji Icon).
        """
        if score >= 85.0:
            return "Optimal", "⚡"
        if score >= 70.0:
            return "Productive", "🚀"
        if score >= 50.0:
            return "Moderate", "👍"
        if score >= 35.0:
            return "Needs Focus", "⚠️"
        return "Low", "📉"

    @staticmethod
    def compare_with_history(current_score: float, historical_scores: List[float]) -> Dict[str, Any]:
        """Compare a current productivity score against a list of historical daily scores.

        Args:
            current_score: Today's productivity score.
            historical_scores: List of past daily scores (e.g. last 7 or 30 days).

        Returns:
            Dictionary with average_score, delta, percentage_change, and trend status.
        """
        if not historical_scores:
            return {
                "historical_avg": current_score,
                "delta": 0.0,
                "percentage_change": 0.0,
                "trend": "stable",
            }

        valid_scores = [s for s in historical_scores if s is not None]
        if not valid_scores:
            return {
                "historical_avg": current_score,
                "delta": 0.0,
                "percentage_change": 0.0,
                "trend": "stable",
            }

        avg_score = round(sum(valid_scores) / len(valid_scores), 1)
        delta = round(current_score - avg_score, 1)

        pct_change = 0.0
        if avg_score > 0:
            pct_change = round(((current_score - avg_score) / avg_score) * 100.0, 1)

        if delta >= 1.0:
            trend = "improving"
        elif delta <= -1.0:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "historical_avg": avg_score,
            "delta": delta,
            "percentage_change": pct_change,
            "trend": trend,
        }

    @staticmethod
    def get_detailed_breakdown(
        productive_seconds: int,
        learning_seconds: int,
        neutral_seconds: int,
        unproductive_seconds: int,
        coding_seconds: int = 0,
        youtube_productive_seconds: int = 0,
        youtube_entertainment_seconds: int = 0,
    ) -> Dict[str, Any]:
        """Generate a complete diagnostic breakdown of the productivity score calculation.

        Returns:
            Dictionary payload with raw scores, percentage splits, applied bonuses/penalties,
            final score, and grade tier.
        """
        total = productive_seconds + learning_seconds + neutral_seconds + unproductive_seconds

        if total > 0:
            raw_ratio = (
                (productive_seconds * 1.0)
                + (learning_seconds * 0.85)
                + (neutral_seconds * 0.3)
            ) / total
            raw_score = round(raw_ratio * 100.0, 1)
            pct_productive = round((productive_seconds / total) * 100.0, 1)
            pct_learning = round((learning_seconds / total) * 100.0, 1)
            pct_neutral = round((neutral_seconds / total) * 100.0, 1)
            pct_unproductive = round((unproductive_seconds / total) * 100.0, 1)
        else:
            raw_score = 0.0
            pct_productive = 0.0
            pct_learning = 0.0
            pct_neutral = 0.0
            pct_unproductive = 0.0

        bonuses = []
        if coding_seconds >= 14400:
            bonuses.append({"name": "Coding Beast (4h+ coding)", "points": 5.0})
        if youtube_productive_seconds > youtube_entertainment_seconds and youtube_productive_seconds > 0:
            bonuses.append({"name": "Educational YouTube Focus", "points": 3.0})

        penalties = []
        if unproductive_seconds >= 10800:
            penalties.append({"name": "Heavy Unproductive Time (3h+)", "points": -5.0})

        final_score = calculate_productivity_score(
            productive_seconds=productive_seconds,
            learning_seconds=learning_seconds,
            neutral_seconds=neutral_seconds,
            unproductive_seconds=unproductive_seconds,
            coding_seconds=coding_seconds,
            youtube_productive_seconds=youtube_productive_seconds,
            youtube_entertainment_seconds=youtube_entertainment_seconds,
        )

        grade_name, icon = ProductivityScorer.get_score_grade(final_score)

        return {
            "total_active_seconds": total,
            "raw_score": raw_score,
            "final_score": final_score,
            "grade": grade_name,
            "icon": icon,
            "percentages": {
                "productive": pct_productive,
                "learning": pct_learning,
                "neutral": pct_neutral,
                "unproductive": pct_unproductive,
            },
            "bonuses": bonuses,
            "penalties": penalties,
        }
