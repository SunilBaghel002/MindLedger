"""
MindLedger - Limit Engine Unit Tests
Test suite verifying limit threshold math, progressive warnings, and emergency snooze calculations.

Author: MindLedger Team
Created: 2026-08-24
"""

import pytest

from core.limit_engine import compute_limit_metrics


def test_compute_limit_metrics_normal():
    """Verify metrics calculation when well below warning thresholds."""
    # 60m limit, 15m used (900s) -> 25% used, normal status
    metrics = compute_limit_metrics(daily_limit_minutes=60, used_seconds=900)
    assert metrics["percentage_used"] == 25.0
    assert metrics["status"] == "normal"
    assert metrics["used_minutes"] == 15.0
    assert metrics["remaining_minutes"] == 45
    assert metrics["snoozes_remaining"] == 2


def test_compute_limit_metrics_warning():
    """Verify warning status trigger at 80% quota."""
    # 60m limit, 48m used (2880s) -> 80% used
    metrics = compute_limit_metrics(daily_limit_minutes=60, used_seconds=2880)
    assert metrics["percentage_used"] == 80.0
    assert metrics["status"] == "warning"
    assert metrics["remaining_minutes"] == 12


def test_compute_limit_metrics_critical():
    """Verify critical status trigger at 95% quota."""
    # 60m limit, 58m used (3480s) -> ~96.7% used
    metrics = compute_limit_metrics(daily_limit_minutes=60, used_seconds=3480)
    assert metrics["percentage_used"] == 96.7
    assert metrics["status"] == "critical"
    assert metrics["remaining_minutes"] == 2


def test_compute_limit_metrics_exceeded():
    """Verify exceeded status trigger at 100% quota."""
    # 60m limit, 65m used (3900s) -> capped at 100%
    metrics = compute_limit_metrics(daily_limit_minutes=60, used_seconds=3900)
    assert metrics["percentage_used"] == 100.0
    assert metrics["status"] == "exceeded"
    assert metrics["remaining_minutes"] == 0


def test_compute_limit_metrics_with_snooze():
    """Verify snooze adds +5 minutes to effective limit."""
    # 60m limit + 1 snooze (5m) = 65m limit. 60m used (3600s) -> 3600 / 3900 = 92.3% (warning)
    metrics = compute_limit_metrics(
        daily_limit_minutes=60,
        used_seconds=3600,
        snoozes_used=1,
        max_snoozes=2,
    )
    assert metrics["effective_limit_minutes"] == 65
    assert metrics["percentage_used"] == 92.3
    assert metrics["status"] == "warning"
    assert metrics["remaining_minutes"] == 5
    assert metrics["snoozes_remaining"] == 1
