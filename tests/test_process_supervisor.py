"""
MindLedger - Process Supervisor Unit Tests
Test suite verifying hog score calculation, power impact classification, protected process checks, and supervisor scanning.

Author: MindLedger Team
Created: 2026-08-24
"""

import pytest
from unittest.mock import MagicMock, patch

from core.process_supervisor import (
    PROTECTED_PROCESSES,
    ProcessSupervisor,
    calculate_hog_score,
    calculate_power_impact,
)


def test_calculate_hog_score():
    """Verify hog score formula weights RAM, CPU, and idle minutes correctly."""
    # RAM=100MB (1.5), CPU=10% (30.0), Idle=10m (0.8) -> 1.5 + 30.0 + 0.8 = 32.3
    score = calculate_hog_score(memory_mb=100.0, cpu_percent=10.0, idle_minutes=10.0)
    assert score == 32.3

    # Zero load
    assert calculate_hog_score(0.0, 0.0, 0.0) == 0.0

    # Low load: 200MB, 1% CPU, 5 min idle -> 3.0 + 3.0 + 0.4 = 6.4
    assert calculate_hog_score(200.0, 1.0, 5.0) == 6.4


def test_calculate_power_impact():
    """Verify power impact tier assignments."""
    assert calculate_power_impact(cpu_percent=0.1, memory_mb=50.0) == "Minimal"
    assert calculate_power_impact(cpu_percent=1.2, memory_mb=300.0) == "Low"
    assert calculate_power_impact(cpu_percent=3.5, memory_mb=600.0) == "Moderate"
    assert calculate_power_impact(cpu_percent=6.0, memory_mb=200.0) == "High"
    assert calculate_power_impact(cpu_percent=0.5, memory_mb=1200.0) == "High"


def test_protected_processes_guardrail():
    """Verify that protected Windows binaries cannot be flagged as safe to terminate."""
    supervisor = ProcessSupervisor()

    assert supervisor.is_process_protected("explorer.exe") is True
    assert supervisor.is_process_protected("Explorer.EXE") is True
    assert supervisor.is_process_protected("csrss.exe") is True
    assert supervisor.is_process_protected("svchost.exe") is True
    assert supervisor.is_process_protected("dwm.exe") is True
    assert supervisor.is_process_protected("python.exe") is True
    assert supervisor.is_process_protected("mindledger.exe") is True
    assert supervisor.is_process_protected("unknown_app.exe", pid=4) is True

    # User app should NOT be protected
    assert supervisor.is_process_protected("discord.exe") is False
    assert supervisor.is_process_protected("spotify.exe") is False


def test_terminate_protected_process_raises_permission_error():
    """Verify that terminate_process strictly raises PermissionError on protected binaries."""
    supervisor = ProcessSupervisor()

    mock_proc = MagicMock()
    mock_proc.name.return_value = "explorer.exe"

    with patch("psutil.Process", return_value=mock_proc):
        with pytest.raises(PermissionError) as excinfo:
            supervisor.terminate_process(pid=999, process_name="explorer.exe")

        assert "Protected system process" in str(excinfo.value)
        mock_proc.terminate.assert_not_called()


def test_terminate_process_name_mismatch():
    """Verify that process name mismatch raises ValueError to avoid race conditions."""
    supervisor = ProcessSupervisor()

    mock_proc = MagicMock()
    mock_proc.name.return_value = "steam.exe"

    with patch("psutil.Process", return_value=mock_proc):
        with pytest.raises(ValueError) as excinfo:
            supervisor.terminate_process(pid=1234, process_name="discord.exe")

        assert "not expected 'discord.exe'" in str(excinfo.value)
        mock_proc.terminate.assert_not_called()


def test_terminate_safe_process_success():
    """Verify successful graceful termination of an unprotected user process."""
    supervisor = ProcessSupervisor()

    mock_proc = MagicMock()
    mock_proc.name.return_value = "discord.exe"
    mock_mem = MagicMock()
    mock_mem.rss = 524288000  # 500 MB
    mock_proc.memory_info.return_value = mock_mem

    with patch("psutil.Process", return_value=mock_proc):
        with patch("psutil.wait_procs", return_value=([mock_proc], [])):
            res = supervisor.terminate_process(pid=5555, process_name="discord.exe")

            assert res["pid"] == 5555
            assert res["process_name"] == "discord.exe"
            assert res["memory_freed_mb"] == 500.0
            assert res["status"] == "terminated"
            mock_proc.terminate.assert_called_once()
