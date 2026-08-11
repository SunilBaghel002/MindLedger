"""
MindLedger - System Performance & Memory Profiler
Utility functions and system metrics collector for CPU utilization, RAM RSS/VMS, and thread monitoring.

Author: MindLedger Team
Created: 2026-08-11
"""

import gc
import os
import threading
from dataclasses import asdict, dataclass
from typing import Any, Dict

import psutil

from database.connection import db_manager
from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SystemPerformanceMetrics:
    """Dataclass holding real-time application resource utilization metrics.

    Attributes:
        cpu_percent: Current process CPU usage percentage.
        memory_rss_mb: Resident Set Size memory in Megabytes.
        memory_vms_mb: Virtual Memory Size in Megabytes.
        active_threads_count: Number of active Python threads.
        gc_collections: Total garbage collections by generation.
        db_pool_stats: SQLite connection pool statistics.
    """

    cpu_percent: float
    memory_rss_mb: float
    memory_vms_mb: float
    active_threads_count: int
    gc_collections: Dict[str, int]
    db_pool_stats: Dict[str, Any]


class SystemProfiler:
    """Collects real-time diagnostic performance metrics for MindLedger process."""

    def __init__(self) -> None:
        """Initialize SystemProfiler with current process handle."""
        self._process = psutil.Process(os.getpid())

    def get_metrics(self) -> SystemPerformanceMetrics:
        """Collect current CPU, RAM, Thread, and Database Pool statistics.

        Returns:
            SystemPerformanceMetrics dataclass instance.
        """
        mem_info = self._process.memory_info()
        cpu_pct = round(self._process.cpu_percent(interval=0.1), 2)
        rss_mb = round(mem_info.rss / (1024 * 1024), 2)
        vms_mb = round(mem_info.vms / (1024 * 1024), 2)
        active_threads = threading.active_count()

        gc_stats = {
            f"gen_{i}": count
            for i, count in enumerate(gc.get_count())
        }

        pool_stats = db_manager.pool_stats()

        return SystemPerformanceMetrics(
            cpu_percent=cpu_pct,
            memory_rss_mb=rss_mb,
            memory_vms_mb=vms_mb,
            active_threads_count=active_threads,
            gc_collections=gc_stats,
            db_pool_stats=pool_stats,
        )

    def trigger_garbage_collection(self) -> int:
        """Manually trigger Python garbage collection for memory leak mitigation.

        Returns:
            Number of unreachable objects collected.
        """
        collected = gc.collect()
        logger.info(f"Manual garbage collection completed: {collected} objects freed.")
        return collected


# Singleton SystemProfiler instance
system_profiler = SystemProfiler()
