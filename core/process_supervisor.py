"""
MindLedger - Process Supervisor & Resource Optimizer
Continuous background process profiling, resource hog detection, protected system binary guards, and safe process termination.

Author: MindLedger Team
Created: 2026-08-24
"""

import sys
import time
from typing import Any, Dict, List, Optional, Set

import psutil

from utils.logger import get_logger

logger = get_logger(__name__)

# Strict protected processes blacklist (Hard Guardrail to prevent system crashes/BSOD)
PROTECTED_PROCESSES: Set[str] = {
    "system",
    "registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "winlogon.exe",
    "svchost.exe",
    "fontdrvhost.exe",
    "dwm.exe",
    "explorer.exe",
    "sihost.exe",
    "taskhostw.exe",
    "ctfmon.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
    "searchhost.exe",
    "lockapp.exe",
    "runtimebroker.exe",
    "python.exe",
    "pythonw.exe",
    "mindledger.exe",
}

SYSTEM_USERNAMES: Set[str] = {
    "nt authority\\system",
    "nt authority\\local service",
    "nt authority\\network service",
    "system",
    "local service",
    "network service",
}


def calculate_hog_score(
    memory_mb: float,
    cpu_percent: float,
    idle_minutes: float = 0.0,
) -> float:
    """Calculate resource hog impact score based on RAM, CPU, and inactive duration.

    Formula:
        Hog Score = (RAM_MB / 100) * 1.5 + (CPU% * 3.0) + (IdleMinutes / 10) * 0.8

    Args:
        memory_mb: Process physical RAM usage in Megabytes.
        cpu_percent: Process CPU utilization percentage (0-100).
        idle_minutes: Minutes process has run in background without user focus.

    Returns:
        Hog score float rounded to 1 decimal place.
    """
    ram_factor = (max(0.0, memory_mb) / 100.0) * 1.5
    cpu_factor = max(0.0, cpu_percent) * 3.0
    idle_factor = (max(0.0, idle_minutes) / 10.0) * 0.8
    score = ram_factor + cpu_factor + idle_factor
    return round(score, 1)


def calculate_power_impact(cpu_percent: float, memory_mb: float) -> str:
    """Calculate power drain category based on CPU and memory load."""
    if cpu_percent >= 5.0 or memory_mb >= 1000.0:
        return "High"
    if cpu_percent >= 2.0 or memory_mb >= 500.0:
        return "Moderate"
    if cpu_percent >= 0.5 or memory_mb >= 200.0:
        return "Low"
    return "Minimal"


class ProcessSupervisor:
    """Monitors running OS processes, detects resource hogs, and provides safe termination."""

    def __init__(self, protected_processes: Optional[Set[str]] = None) -> None:
        """Initialize ProcessSupervisor with protected binaries set."""
        self.protected_processes = (
            set(p.lower() for p in protected_processes)
            if protected_processes is not None
            else PROTECTED_PROCESSES
        )

    def is_process_protected(self, process_name: str, pid: Optional[int] = None) -> bool:
        """Check if a process is protected and forbidden from termination."""
        if pid is not None and pid in (0, 4):  # System Idle Process and System PID
            return True
        clean_name = process_name.strip().lower()
        return clean_name in self.protected_processes

    def scan_processes(
        self,
        filter_type: str = "user",
        sort_by: str = "memory",
        foreground_pid: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Scan running processes and return aggregated telemetry.

        Args:
            filter_type: 'user', 'all', 'hogs', or 'system'.
            sort_by: 'memory', 'cpu', 'hog_score', or 'name'.
            foreground_pid: PID of currently active foreground window app.

        Returns:
            Dictionary containing total counts, RAM usage, and list of process dicts.
        """
        processes: List[Dict[str, Any]] = []
        total_ram_bytes = 0
        hog_count = 0
        user_count = 0

        # Iterate over all active OS processes
        for proc in psutil.process_iter(
            ["pid", "name", "cpu_percent", "memory_info", "create_time", "username", "status"]
        ):
            try:
                info = proc.info
                pid = info["pid"]
                if pid == 0:  # Skip System Idle Process
                    continue

                name = info["name"] or f"Process_{pid}"
                clean_name_lower = name.lower()
                mem_info = info["memory_info"]
                rss_bytes = mem_info.rss if mem_info else 0
                memory_mb = round(rss_bytes / (1024 * 1024), 1)
                total_ram_bytes += rss_bytes

                cpu_pct = round(info["cpu_percent"] or 0.0, 1)
                username = (info["username"] or "").lower()
                is_system_user = username in SYSTEM_USERNAMES or clean_name_lower in self.protected_processes
                is_protected = self.is_process_protected(clean_name_lower, pid)
                is_foreground = (foreground_pid is not None and pid == foreground_pid)

                # Estimate background duration from create time if not in foreground
                create_time = info["create_time"] or time.time()
                elapsed_secs = max(0, int(time.time() - create_time))
                idle_minutes = (elapsed_secs / 60.0) if not is_foreground else 0.0

                hog_score = calculate_hog_score(memory_mb, cpu_pct, idle_minutes)
                is_hog = hog_score >= 15.0 and not is_foreground and not is_protected
                if is_hog:
                    hog_count += 1

                proc_type = "system" if is_system_user else "user"
                if proc_type == "user":
                    user_count += 1

                # Apply filter
                if filter_type == "user" and proc_type != "user":
                    continue
                if filter_type == "system" and proc_type != "system":
                    continue
                if filter_type == "hogs" and not is_hog:
                    continue

                power_impact = calculate_power_impact(cpu_pct, memory_mb)

                processes.append({
                    "pid": pid,
                    "name": name,
                    "title": name,
                    "type": proc_type,
                    "cpu_percent": cpu_pct,
                    "memory_mb": memory_mb,
                    "is_background": not is_foreground,
                    "background_duration_seconds": elapsed_secs if not is_foreground else 0,
                    "is_protected": is_protected,
                    "hog_score": hog_score,
                    "is_hog": is_hog,
                    "power_impact": power_impact,
                })

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
            except Exception as e:
                logger.debug(f"Error inspecting process {proc}: {e}")
                continue

        # Sort results
        if sort_by == "cpu":
            processes.sort(key=lambda p: p["cpu_percent"], reverse=True)
        elif sort_by == "hog_score":
            processes.sort(key=lambda p: p["hog_score"], reverse=True)
        elif sort_by == "name":
            processes.sort(key=lambda p: p["name"].lower())
        else:  # default 'memory'
            processes.sort(key=lambda p: p["memory_mb"], reverse=True)

        return {
            "total_processes": len(processes),
            "user_processes_count": user_count,
            "hog_count": hog_count,
            "total_ram_used_mb": round(total_ram_bytes / (1024 * 1024), 1),
            "processes": processes,
        }

    def terminate_process(
        self,
        pid: int,
        process_name: Optional[str] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """Safely terminate an active OS process with safety guardrails.

        Args:
            pid: Target OS Process ID.
            process_name: Optional expected process name for verification.
            force: Whether to forcefully kill if graceful termination fails.

        Returns:
            Dict containing freed memory and termination confirmation.

        Raises:
            PermissionError: If process is protected.
            ValueError: If process name does not match PID.
            psutil.NoSuchProcess: If PID does not exist.
        """
        try:
            proc = psutil.Process(pid)
        except psutil.NoSuchProcess as e:
            logger.warning(f"Cannot terminate non-existent PID {pid}")
            raise e

        actual_name = proc.name()

        # Hard guardrail check
        if self.is_process_protected(actual_name, pid):
            logger.warning(f"Denied termination attempt on protected process: {actual_name} (PID: {pid})")
            raise PermissionError(f"Protected system process '{actual_name}' cannot be terminated.")

        # Process name mismatch verification (prevents PID race conditions)
        if process_name and process_name.strip().lower() != actual_name.lower():
            raise ValueError(
                f"PID {pid} corresponds to '{actual_name}', not expected '{process_name}'"
            )

        try:
            mem_info = proc.memory_info()
            memory_freed_mb = round(mem_info.rss / (1024 * 1024), 1)
        except Exception:
            memory_freed_mb = 0.0

        try:
            proc.terminate()
            gone, alive = psutil.wait_procs([proc], timeout=2)
            if alive and force:
                for p in alive:
                    p.kill()
                gone, alive = psutil.wait_procs(alive, timeout=1)

            status = "terminated" if not alive else "killing"
            logger.info(f"Terminated process {actual_name} (PID: {pid}), freed ~{memory_freed_mb} MB RAM")

            return {
                "pid": pid,
                "process_name": actual_name,
                "memory_freed_mb": memory_freed_mb,
                "status": status,
            }
        except psutil.NoSuchProcess:
            return {
                "pid": pid,
                "process_name": actual_name,
                "memory_freed_mb": memory_freed_mb,
                "status": "terminated",
            }
        except Exception as e:
            logger.error(f"Failed to terminate process {actual_name} (PID {pid}): {e}")
            raise e

    def optimize_idle_processes(self, min_hog_score: float = 15.0) -> Dict[str, Any]:
        """Automatically optimize high-scoring background hogs.

        Args:
            min_hog_score: Minimum hog score threshold for optimization.

        Returns:
            Dict containing count of optimized processes and total freed RAM.
        """
        scan_result = self.scan_processes(filter_type="hogs", sort_by="hog_score")
        candidates = [
            p for p in scan_result["processes"]
            if p["hog_score"] >= min_hog_score and not p["is_protected"]
        ]

        terminated_list: List[Dict[str, Any]] = []
        total_freed_mb = 0.0

        for cand in candidates:
            try:
                res = self.terminate_process(cand["pid"], cand["name"], force=False)
                terminated_list.append(res)
                total_freed_mb += res["memory_freed_mb"]
            except Exception as e:
                logger.warning(f"Could not auto-terminate {cand['name']} (PID {cand['pid']}): {e}")

        return {
            "optimized_count": len(terminated_list),
            "total_memory_freed_mb": round(total_freed_mb, 1),
            "terminated_processes": terminated_list,
        }


# Singleton instance
process_supervisor = ProcessSupervisor()
