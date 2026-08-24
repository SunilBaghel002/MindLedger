"""
MindLedger - Hydration Scheduler Unit Tests
Test suite verifying adaptive hydration intervals, sleep recovery state machine, and snooze countdowns.

Author: MindLedger Team
Created: 2026-08-24
"""

import time
import pytest

from core.hydration_scheduler import HydrationScheduler


def test_effective_interval_calculation():
    """Verify smart adaptive intervals adjust based on deep work vs media."""
    scheduler = HydrationScheduler(mode="smart")

    # Base standard interval
    assert scheduler.calculate_effective_interval_minutes(is_deep_work=False, is_media=False) == 55

    # Deep coding session -> tightens to 45m
    assert scheduler.calculate_effective_interval_minutes(is_deep_work=True, is_media=False) == 45

    # Light media -> relaxes to 65m
    assert scheduler.calculate_effective_interval_minutes(is_deep_work=False, is_media=True) == 65

    # Custom mode
    custom_scheduler = HydrationScheduler(mode="custom", custom_interval_minutes=30)
    assert custom_scheduler.calculate_effective_interval_minutes() == 30


def test_sleep_detection_gentle_reset():
    """Verify long system sleep (>30m) triggers gentle welcome back reset rather than notification spam."""
    scheduler = HydrationScheduler()
    scheduler.active_work_seconds = 1800  # 30 mins active work

    # Computer wakes up after 2 hours (7200s gap)
    result = scheduler.tick(elapsed_wall_clock=7200, is_user_active=True)

    assert result is not None
    assert result["event"] == "welcome_back"
    assert scheduler.active_work_seconds == 0


def test_idle_pauses_countdown():
    """Verify when user is idle, active work seconds do not increment."""
    scheduler = HydrationScheduler()
    scheduler.active_work_seconds = 600

    # 100s pass but user is idle
    result = scheduler.tick(elapsed_wall_clock=100, is_user_active=False)

    assert result is None
    assert scheduler.active_work_seconds == 600


def test_drink_resets_active_timer():
    """Verify drink logs intake and resets active work seconds."""
    scheduler = HydrationScheduler(daily_goal_ml=2000)
    scheduler.active_work_seconds = 1500

    status = scheduler.drink(amount_ml=250, source="dashboard_widget")

    assert scheduler.active_work_seconds == 0
    assert status["today_intake_ml"] >= 250
    assert status["glasses_drank"] >= 1
