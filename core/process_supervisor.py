"""
MindLedger - Process Supervisor & Resource Optimizer
Continuous background process profiling, resource hog detection, protected system binary guards,
application grouping, and safe process termination.

Author: MindLedger Team
Created: 2026-08-24
"""

import json
import os
import sys
import time
from typing import Any, Dict, List, Optional, Set, Tuple

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
    "msmpeng.exe",
    "memcompression",
    "securityhealthservice.exe",
    "spoolsv.exe",
}

# Process metadata dictionary mapping binary names to friendly names, categories, descriptions, and protection status
KNOWN_PROCESS_INFO: Dict[str, Dict[str, Any]] = {
    "msmpeng.exe": {
        "name": "Windows Defender Antivirus",
        "category": "System Security",
        "description": "Microsoft Defender real-time antivirus protection and malware background engine.",
        "is_protected": True,
    },
    "memcompression": {
        "name": "Windows Memory Compression",
        "category": "OS Kernel",
        "description": "Windows memory manager compressing inactive RAM pages to avoid slow disk swap thrashing.",
        "is_protected": True,
    },
    "chrome.exe": {
        "name": "Google Chrome",
        "category": "Web Browser",
        "description": "Google Chrome web browser tabs, web renderers, extensions, and GPU accelerator.",
        "is_protected": False,
    },
    "antigravity ide.exe": {
        "name": "Antigravity IDE",
        "category": "Development IDE",
        "description": "AI-powered coding workspace, active editor panels, and extension host workers.",
        "is_protected": False,
    },
    "antigravity.exe": {
        "name": "Antigravity IDE",
        "category": "Development IDE",
        "description": "AI-powered coding workspace, active editor panels, and extension host workers.",
        "is_protected": False,
    },
    "language_server_windows_x64.exe": {
        "name": "IDE Language Server",
        "category": "Development Tool",
        "description": "Code intelligence, autocompletion, syntax checking, and type validation engine.",
        "is_protected": False,
    },
    "powershell.exe": {
        "name": "Windows PowerShell",
        "category": "Terminal / Shell",
        "description": "PowerShell command line terminal session and background task execution.",
        "is_protected": False,
    },
    "cmd.exe": {
        "name": "Command Prompt",
        "category": "Terminal / Shell",
        "description": "Windows command line terminal environment.",
        "is_protected": False,
    },
    "claude.exe": {
        "name": "Claude Desktop",
        "category": "Productivity AI",
        "description": "Claude desktop assistant window and background workers.",
        "is_protected": False,
    },
    "node.exe": {
        "name": "Node.js JavaScript Runtime",
        "category": "Development Tool",
        "description": "JavaScript/TypeScript build tools, Vite dev servers, and backend services.",
        "is_protected": False,
    },
    "msedgewebview2.exe": {
        "name": "Microsoft Edge WebView2",
        "category": "Application Runtime",
        "description": "Embedded modern web engine used by desktop apps to display web UI components.",
        "is_protected": False,
    },
    "svchost.exe": {
        "name": "Windows Service Host",
        "category": "Windows Core Service",
        "description": "Shared Windows host process for essential background OS services and networking.",
        "is_protected": True,
    },
    "explorer.exe": {
        "name": "Windows File Explorer & Shell",
        "category": "Windows Shell",
        "description": "Taskbar, Start Menu, Desktop, and File Explorer window manager.",
        "is_protected": True,
    },
    "dwm.exe": {
        "name": "Desktop Window Manager",
        "category": "Graphics & UI",
        "description": "Hardware-accelerated window compositor and screen graphics renderer.",
        "is_protected": True,
    },
    "python.exe": {
        "name": "Python Runtime (MindLedger)",
        "category": "Background Service",
        "description": "MindLedger background tracking engine and local FastAPI analytics server.",
        "is_protected": True,
    },
    "pythonw.exe": {
        "name": "Python Runtime",
        "category": "Background Service",
        "description": "Python windowless background process runner.",
        "is_protected": True,
    },
    "mindledger.exe": {
        "name": "MindLedger Desktop App",
        "category": "Productivity Tool",
        "description": "MindLedger digital wellbeing tracking and analytics application.",
        "is_protected": True,
    },
}


def calculate_hog_score(
    memory_mb: float,
    cpu_percent: float,
    idle_minutes: float = 0.0,
) -> float:
    """Calculate resource hog impact score based on RAM, CPU, and inactive duration."""
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


def get_chrome_profiles() -> List[str]:
    """Extract registered Chrome user profiles, filtered to active primary profiles."""
    local_state_path = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Local State")
    active_keywords = [
        "sunilbaghel93100",
        "officialsunil93100",
        "paydesk",
        "forgeweb",
        "sunilnp@acem.edu.in",
        "sunilnp",
    ]
    matched_profiles = []
    if os.path.exists(local_state_path):
        try:
            with open(local_state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                info_cache = data.get("profile", {}).get("info_cache", {})
                for dir_name, pinfo in info_cache.items():
                    name = pinfo.get("name") or ""
                    email = pinfo.get("user_name") or ""
                    combined = f"{name} {email} {dir_name}".lower()
                    if any(kw in combined for kw in active_keywords):
                        label = f"{name} ({email})" if email and name != email else (name or email)
                        matched_profiles.append(label)
        except Exception:
            pass
    # Deduplicate while preserving order
    seen = set()
    result = []
    for p in matched_profiles:
        if p not in seen:
            seen.add(p)
            result.append(p)
    return result


class ProcessSupervisor:
    """Monitors running OS processes, aggregates application trees, and detects resource hogs."""

    def __init__(self, protected_processes: Optional[Set[str]] = None) -> None:
        """Initialize ProcessSupervisor with protected binaries set and scan cache."""
        self.protected_processes = (
            set(p.lower() for p in protected_processes)
            if protected_processes is not None
            else PROTECTED_PROCESSES
        )
        self._cached_result: Optional[Dict[str, Any]] = None
        self._cache_timestamp: float = 0.0
        self._cache_ttl_seconds: float = 6.0
        self._chrome_profiles_cache: List[str] = []
        self._chrome_profiles_last_read: float = 0.0

    def is_process_protected(self, process_name: str, pid: Optional[int] = None) -> bool:
        """Check if a process is protected and forbidden from termination."""
        if pid is not None and pid in (0, 4):  # System Idle Process and System PID
            return True
        clean_name = process_name.strip().lower()
        return clean_name in self.protected_processes

    def _get_profiles(self) -> List[str]:
        """Get cached Chrome profiles."""
        now = time.time()
        if not self._chrome_profiles_cache or (now - self._chrome_profiles_last_read) > 60.0:
            self._chrome_profiles_cache = get_chrome_profiles()
            self._chrome_profiles_last_read = now
        return self._chrome_profiles_cache

    def scan_processes(
        self,
        filter_type: str = "user",
        sort_by: str = "memory",
        foreground_pid: Optional[int] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Scan running processes with in-memory caching and grouped application trees.

        Args:
            filter_type: 'user', 'all', 'hogs', or 'system'.
            sort_by: 'memory', 'cpu', 'hog_score', or 'name'.
            foreground_pid: PID of currently active foreground window app.
            force_refresh: Whether to bypass the 2.5-second in-memory cache.

        Returns:
            Dictionary containing total counts, RAM usage, grouped_apps, and flat processes list.
        """
        now = time.time()
        if (
            not force_refresh
            and self._cached_result is not None
            and (now - self._cache_timestamp) < self._cache_ttl_seconds
        ):
            return self._filter_and_sort(self._cached_result, filter_type, sort_by)

        raw_processes: List[Dict[str, Any]] = []
        grouped_dict: Dict[str, Dict[str, Any]] = {}
        total_ram_bytes = 0
        hog_count = 0
        user_count = 0

        # Fast process iteration without slow security SID lookups
        for proc in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                info = proc.info
                pid = info["pid"]
                if pid in (0, 4):  # Skip system idle and kernel root
                    continue

                name = info["name"] or f"Process_{pid}"
                clean_name_lower = name.lower()

                mem_info = info.get("memory_info")
                rss_bytes = mem_info.rss if mem_info else 0
                memory_mb = round(rss_bytes / (1024 * 1024), 1)
                total_ram_bytes += rss_bytes

                # Non-blocking instantaneous CPU usage
                try:
                    cpu_pct = round(proc.cpu_percent(interval=None), 1)
                except Exception:
                    cpu_pct = 0.0

                is_protected = self.is_process_protected(clean_name_lower, pid)
                is_foreground = foreground_pid is not None and pid == foreground_pid

                # Lookup metadata from known catalog
                meta = KNOWN_PROCESS_INFO.get(clean_name_lower, {})
                display_name = meta.get("name", name)
                category = meta.get("category", "Application")
                description = meta.get("description", "")
                if meta.get("is_protected"):
                    is_protected = True

                # Determine system process type
                is_system = is_protected or clean_name_lower in self.protected_processes
                proc_type = "system" if is_system else "user"
                if proc_type == "user":
                    user_count += 1

                hog_score = calculate_hog_score(memory_mb, cpu_pct, idle_minutes=0.0)
                is_hog = hog_score >= 15.0 and not is_foreground and not is_protected
                if is_hog:
                    hog_count += 1

                power_impact = calculate_power_impact(cpu_pct, memory_mb)

                proc_item = {
                    "pid": pid,
                    "name": name,
                    "title": display_name,
                    "type": proc_type,
                    "cpu_percent": cpu_pct,
                    "memory_mb": memory_mb,
                    "is_background": not is_foreground,
                    "background_duration_seconds": 0,
                    "is_protected": is_protected,
                    "hog_score": hog_score,
                    "is_hog": is_hog,
                    "power_impact": power_impact,
                    "category": category,
                    "description": description,
                }
                raw_processes.append(proc_item)

                # Group processes by application key
                group_key = clean_name_lower
                if group_key not in grouped_dict:
                    profile_info = self._get_profiles() if "chrome" in group_key else []
                    grouped_dict[group_key] = {
                        "app_name": display_name,
                        "binary_name": name,
                        "category": category,
                        "description": description,
                        "total_memory_mb": 0.0,
                        "total_cpu_percent": 0.0,
                        "process_count": 0,
                        "power_impact": "Low",
                        "hog_score": 0.0,
                        "is_hog": False,
                        "is_protected": is_protected,
                        "type": proc_type,
                        "profile_info": profile_info,
                        "pids": [],
                        "children": [],
                    }

                group = grouped_dict[group_key]
                group["total_memory_mb"] = round(group["total_memory_mb"] + memory_mb, 1)
                group["total_cpu_percent"] = round(group["total_cpu_percent"] + cpu_pct, 1)
                group["process_count"] += 1
                group["pids"].append(pid)

                # Determine worker role
                role = "Worker Process"
                if group["process_count"] == 1:
                    role = "Main Process / Window"
                elif "gpu" in clean_name_lower:
                    role = "GPU Accelerator"
                elif "language_server" in clean_name_lower:
                    role = "Language Intelligence Engine"

                group["children"].append({
                    "pid": pid,
                    "name": name,
                    "role": role,
                    "memory_mb": memory_mb,
                    "cpu_percent": cpu_pct,
                    "power_impact": power_impact,
                    "is_protected": is_protected,
                    "hog_score": hog_score,
                })

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
            except Exception as e:
                logger.debug(f"Error inspecting process: {e}")
                continue

        # Finalize grouped app power impact and hog status
        grouped_apps = list(grouped_dict.values())
        for g in grouped_apps:
            g["power_impact"] = calculate_power_impact(g["total_cpu_percent"], g["total_memory_mb"])
            g["hog_score"] = calculate_hog_score(g["total_memory_mb"], g["total_cpu_percent"])
            g["is_hog"] = g["hog_score"] >= 20.0 and not g["is_protected"]
            # Sort children by memory descending
            g["children"].sort(key=lambda c: c["memory_mb"], reverse=True)

        full_result = {
            "total_processes": len(raw_processes),
            "user_processes_count": user_count,
            "hog_count": hog_count,
            "total_ram_used_mb": round(total_ram_bytes / (1024 * 1024), 1),
            "grouped_apps": grouped_apps,
            "processes": raw_processes,
        }

        self._cached_result = full_result
        self._cache_timestamp = now

        return self._filter_and_sort(full_result, filter_type, sort_by)

    def _filter_and_sort(
        self, data: Dict[str, Any], filter_type: str, sort_by: str
    ) -> Dict[str, Any]:
        """Apply filters and sorting to cached process and grouped app data."""
        grouped = list(data["grouped_apps"])
        flat = list(data["processes"])

        # Filter grouped apps
        if filter_type == "user":
            grouped = [g for g in grouped if g["type"] == "user"]
            flat = [p for p in flat if p["type"] == "user"]
        elif filter_type == "system":
            grouped = [g for g in grouped if g["type"] == "system"]
            flat = [p for p in flat if p["type"] == "system"]
        elif filter_type == "hogs":
            grouped = [g for g in grouped if g["is_hog"]]
            flat = [p for p in flat if p["is_hog"]]

        # Sort grouped apps
        if sort_by == "cpu":
            grouped.sort(key=lambda g: g["total_cpu_percent"], reverse=True)
            flat.sort(key=lambda p: p["cpu_percent"], reverse=True)
        elif sort_by == "hog_score":
            grouped.sort(key=lambda g: g["hog_score"], reverse=True)
            flat.sort(key=lambda p: p["hog_score"], reverse=True)
        elif sort_by == "name":
            grouped.sort(key=lambda g: g["app_name"].lower())
            flat.sort(key=lambda p: p["name"].lower())
        else:  # default 'memory'
            grouped.sort(key=lambda g: g["total_memory_mb"], reverse=True)
            flat.sort(key=lambda p: p["memory_mb"], reverse=True)

        return {
            "total_processes": data["total_processes"],
            "user_processes_count": data["user_processes_count"],
            "hog_count": data["hog_count"],
            "total_ram_used_mb": data["total_ram_used_mb"],
            "grouped_apps": grouped,
            "processes": flat,
        }

    def terminate_process(
        self,
        pid: int,
        process_name: Optional[str] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """Safely terminate an active OS process with safety guardrails."""
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
            gone, alive = psutil.wait_procs([proc], timeout=1.5)
            if alive and force:
                for p in alive:
                    p.kill()
                gone, alive = psutil.wait_procs(alive, timeout=1.0)

            status = "terminated" if not alive else "killing"
            self._cached_result = None  # Invalidate cache

            logger.info(f"Terminated process {actual_name} (PID: {pid}), freed ~{memory_freed_mb} MB RAM")
            return {
                "pid": pid,
                "process_name": actual_name,
                "memory_freed_mb": memory_freed_mb,
                "status": status,
            }
        except psutil.NoSuchProcess:
            self._cached_result = None
            return {
                "pid": pid,
                "process_name": actual_name,
                "memory_freed_mb": memory_freed_mb,
                "status": "terminated",
            }
        except Exception as e:
            logger.error(f"Failed to terminate process {actual_name} (PID {pid}): {e}")
            raise e

    def terminate_app(self, binary_name: str, force: bool = False) -> Dict[str, Any]:
        """Safely terminate all running worker processes of an application."""
        clean_name = binary_name.strip().lower()

        if self.is_process_protected(clean_name):
            logger.warning(f"Denied termination attempt on protected app: {binary_name}")
            raise PermissionError(f"Protected system software '{binary_name}' cannot be terminated.")

        target_procs: List[psutil.Process] = []
        for p in psutil.process_iter(["pid", "name"]):
            try:
                if p.info["name"] and p.info["name"].lower() == clean_name:
                    target_procs.append(p)
            except Exception:
                continue

        if not target_procs:
            return {
                "app_name": binary_name,
                "binary_name": binary_name,
                "terminated_pids_count": 0,
                "memory_freed_mb": 0.0,
                "status": "terminated",
            }

        total_freed_mb = 0.0
        terminated_count = 0

        for proc in target_procs:
            try:
                rss = proc.memory_info().rss
                total_freed_mb += round(rss / (1024 * 1024), 1)
                proc.terminate()
                terminated_count += 1
            except Exception:
                pass

        if target_procs:
            gone, alive = psutil.wait_procs(target_procs, timeout=1.5)
            if alive and force:
                for p in alive:
                    try:
                        p.kill()
                    except Exception:
                        pass

        self._cached_result = None  # Invalidate scan cache
        meta = KNOWN_PROCESS_INFO.get(clean_name, {})
        display_name = meta.get("name", binary_name)

        return {
            "app_name": display_name,
            "binary_name": binary_name,
            "terminated_pids_count": terminated_count,
            "memory_freed_mb": round(total_freed_mb, 1),
            "status": "terminated",
        }

    def optimize_idle_processes(self, min_hog_score: float = 15.0) -> Dict[str, Any]:
        """Automatically optimize high-scoring background hogs."""
        scan_result = self.scan_processes(filter_type="hogs", sort_by="hog_score", force_refresh=True)
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
