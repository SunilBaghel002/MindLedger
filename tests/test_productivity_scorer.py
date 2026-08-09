"""
MindLedger - Productivity Scorer Unit Tests
Test suite verifying weighted scoring formula, bonuses/penalties, clamping, grades, breakdown, and historical trend analysis.

Author: MindLedger Team
Created: 2026-08-09
"""

import pytest
from ai.productivity_scorer import ProductivityScorer, calculate_productivity_score


def test_calculate_score_empty_or_zero():
    """Test productivity score calculation when total seconds is zero."""
    assert calculate_productivity_score(0, 0, 0, 0) == 0.0
    assert ProductivityScorer.calculate(0, 0, 0, 0) == 0.0


def test_calculate_score_pure_categories():
    """Test productivity score calculation for 100% pure single categories."""
    # 4 hours productive
    assert calculate_productivity_score(14400, 0, 0, 0) == 100.0

    # 4 hours learning (0.85 weight * 100 = 85.0)
    assert calculate_productivity_score(0, 14400, 0, 0) == 85.0

    # 4 hours neutral (0.3 weight * 100 = 30.0)
    assert calculate_productivity_score(0, 0, 14400, 0) == 30.0

    # 4 hours unproductive (0.0 weight, with penalty for 3h+ = 0.0 clamped)
    assert calculate_productivity_score(0, 0, 0, 14400) == 0.0

    # 2 hours unproductive (< 3 hours, no penalty) -> 0.0
    assert calculate_productivity_score(0, 0, 0, 7200) == 0.0


def test_calculate_score_mixed_and_bonuses():
    """Test mixed activity durations, coding bonus (+5), YouTube bonus (+3), and unproductive penalty (-5)."""
    # Productive 4h (14400s), Neutral 2h (7200s), Unproductive 2h (7200s), total = 28800s
    # Raw = (14400*1 + 7200*0.3) / 28800 = (14400 + 2160) / 28800 = 16560 / 28800 = 0.575 -> 57.5
    # Coding seconds = 14400 (+5.0 bonus) -> 62.5
    score = calculate_productivity_score(
        productive_seconds=14400,
        learning_seconds=0,
        neutral_seconds=7200,
        unproductive_seconds=7200,
        coding_seconds=14400,
    )
    assert score == 62.5

    # YouTube bonus test: YT productive > YT entertainment (+3.0)
    score_yt = calculate_productivity_score(
        productive_seconds=14400,
        learning_seconds=0,
        neutral_seconds=7200,
        unproductive_seconds=7200,
        coding_seconds=0,
        youtube_productive_seconds=3600,
        youtube_entertainment_seconds=1800,
    )
    assert score_yt == 60.5  # 57.5 + 3.0

    # Unproductive penalty test: unproductive >= 10800 (-5.0)
    score_penalty = calculate_productivity_score(
        productive_seconds=14400,
        learning_seconds=0,
        neutral_seconds=7200,
        unproductive_seconds=14400,  # 4h unproductive -> penalty -5
        coding_seconds=0,
    )
    # total = 36000, raw = (14400*1 + 7200*0.3)/36000 = 16560 / 36000 = 0.46 -> 46.0 - 5.0 = 41.0
    assert score_penalty == 41.0


def test_score_clamping():
    """Test score clamping at min 0.0 and max 100.0."""
    # Pure productive + coding bonus -> 100 + 5 = 105 -> clamped to 100.0
    assert calculate_productivity_score(14400, 0, 0, 0, coding_seconds=14400) == 100.0

    # High unproductive penalty -> score < 0 -> clamped to 0.0
    assert calculate_productivity_score(0, 0, 0, 20000) == 0.0


def test_get_score_grade():
    """Test performance tier grading and icon output."""
    assert ProductivityScorer.get_score_grade(90.0) == ("Optimal", "⚡")
    assert ProductivityScorer.get_score_grade(75.0) == ("Productive", "🚀")
    assert ProductivityScorer.get_score_grade(60.0) == ("Moderate", "👍")
    assert ProductivityScorer.get_score_grade(40.0) == ("Needs Focus", "⚠️")
    assert ProductivityScorer.get_score_grade(20.0) == ("Low", "📉")


def test_compare_with_history():
    """Test historical trend comparison calculations."""
    # Empty history
    res_empty = ProductivityScorer.compare_with_history(75.0, [])
    assert res_empty["trend"] == "stable"
    assert res_empty["delta"] == 0.0

    # Improving trend (+10 vs avg 65)
    history = [60.0, 70.0, 65.0]  # avg = 65.0
    res_imp = ProductivityScorer.compare_with_history(75.0, history)
    assert res_imp["historical_avg"] == 65.0
    assert res_imp["delta"] == 10.0
    assert res_imp["percentage_change"] == 15.4
    assert res_imp["trend"] == "improving"

    # Declining trend (-15 vs avg 80)
    res_dec = ProductivityScorer.compare_with_history(65.0, [80.0, 80.0, 80.0])
    assert res_dec["delta"] == -15.0
    assert res_dec["trend"] == "declining"


def test_get_detailed_breakdown():
    """Test detailed breakdown output payload formatting."""
    breakdown = ProductivityScorer.get_detailed_breakdown(
        productive_seconds=14400,  # 4h
        learning_seconds=3600,     # 1h
        neutral_seconds=3600,      # 1h
        unproductive_seconds=3600, # 1h
        coding_seconds=14400,
        youtube_productive_seconds=3600,
        youtube_entertainment_seconds=1800,
    )

    assert breakdown["total_active_seconds"] == 25200
    assert "percentages" in breakdown
    assert breakdown["percentages"]["productive"] == 57.1
    assert len(breakdown["bonuses"]) == 2
    assert breakdown["grade"] == "Productive"
    assert breakdown["final_score"] > 0.0
