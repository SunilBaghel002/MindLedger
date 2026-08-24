"""
MindLedger - Power Monitor Unit Tests
Test suite verifying energy scoring, impact tier categorization, discharge rate calculation, and health metrics.

Author: MindLedger Team
Created: 2026-08-24
"""

import time
from unittest.mock import MagicMock, patch
import pytest

from core.power_monitor import (
    PowerMonitor,
    calculate_energy_score,
    get_energy_impact_band,
)


def test_calculate_energy_score():
    """Verify energy score formula properly weights CPU, RAM, and media flags."""
    # CPU=10% (20.0), RAM=500MB (0.5), Media=True (4.0), Lock=True (3.0) -> 20.0 + 0.5 + 4.0 + 3.0 = 27.5
    score = calculate_energy_score(
        cpu_percent=10.0,
        memory_mb=500.0,
        is_media_active=True,
        is_wake_lock=True,
    )
    assert score == 27.5

    # Zero score
    assert calculate_energy_score(0.0, 0.0, False, False) == 0.0


def test_get_energy_impact_band():
    """Verify energy score mapping to impact bands."""
    assert get_energy_impact_band(1.5) == "Minimal"
    assert get_energy_impact_band(6.0) == "Moderate"
    assert get_energy_impact_band(15.0) == "High"
    assert get_energy_impact_band(30.0) == "Very High"


def test_compute_discharge_rate():
    """Verify sliding window discharge rate calculation."""
    monitor = PowerMonitor()

    # Plugged in should return None
    assert monitor.compute_discharge_rate(current_percent=80, is_plugged=True) is None

    # First sample when unplugged
    old_time = time.time() - 300  # 5 minutes ago
    monitor._history_snapshots = [(old_time, 90)]

    # Now at 85% after 300s (5m drop of 5% -> 60%/hr)
    rate = monitor.compute_discharge_rate(current_percent=85, is_plugged=False)
    assert rate is not None
    assert rate == 60.0


def test_get_status_desktop_fallback():
    """Verify desktop system without battery returns AC status gracefully."""
    monitor = PowerMonitor()

    with patch("psutil.sensors_battery", return_value=None):
        status = monitor.get_status()
        assert status["is_battery_present"] is False
        assert status["percent"] == 100
        assert status["is_plugged"] is True
        assert status["charging_status"] == "AC Power"


def test_get_status_battery_present():
    """Verify laptop battery status extraction."""
    monitor = PowerMonitor()

    mock_battery = MagicMock()
    mock_battery.percent = 78.0
    mock_battery.power_plugged = False
    mock_battery.secsleft = 7200  # 2 hours

    with patch("psutil.sensors_battery", return_value=mock_battery):
        status = monitor.get_status()
        assert status["is_battery_present"] is True
        assert status["percent"] == 78
        assert status["is_plugged"] is False
        assert status["charging_status"] == "Discharging"
        assert status["time_remaining_formatted"] == "2h 0m"
