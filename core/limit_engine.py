"""
MindLedger - App & Domain Limit Enforcement Engine
Real-time evaluation of active screen time against configured daily limits, progressive warnings, and emergency snooze handling.

Author: MindLedger Team
Created: 2026-08-24
"""

from datetime import date
from typing import Any, Dict, List, Optional

from database.connection import db_manager
from database.repositories.limit_repo import LimitRepository
from utils.logger import get_logger

logger = get_logger(__name__)


def compute_limit_metrics(
    daily_limit_minutes: int,
    used_seconds: int,
    snoozes_used: int = 0,
    max_snoozes: int = 2,
) -> Dict[str, Any]:
    """Compute usage percentages, remaining time, and warning level.

    Args:
        daily_limit_minutes: Configured baseline daily quota in minutes.
        used_seconds: Cumulative active seconds today.
        snoozes_used: Number of +5m emergency extensions used today.
        max_snoozes: Maximum extensions allowed per day.

    Returns:
        Dict with status, percentage_used, used_minutes, remaining_minutes, and snoozes_remaining.
    """
    effective_limit_minutes = daily_limit_minutes + (snoozes_used * 5)
    effective_limit_seconds = effective_limit_minutes * 60

    percentage = round(min(100.0, (used_seconds / max(1, effective_limit_seconds)) * 100.0), 1)
    used_minutes = round(used_seconds / 60.0, 1)
    remaining_secs = max(0, effective_limit_seconds - used_seconds)
    remaining_mins = int(remaining_secs // 60)

    if percentage >= 100.0:
        status = "exceeded"
    elif percentage >= 95.0:
        status = "critical"
    elif percentage >= 80.0:
        status = "warning"
    else:
        status = "normal"

    snoozes_remaining = max(0, max_snoozes - snoozes_used)

    return {
        "effective_limit_minutes": effective_limit_minutes,
        "used_seconds": used_seconds,
        "used_minutes": used_minutes,
        "remaining_minutes": remaining_mins,
        "percentage_used": percentage,
        "status": status,
        "snoozes_used": snoozes_used,
        "snoozes_remaining": snoozes_remaining,
    }


class LimitEngine:
    """Evaluates and enforces active app and website screen time limits."""

    def get_all_limits_with_status(self, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch all configured limits paired with today's real-time usage metrics."""
        d_str = target_date or date.today().isoformat()
        results: List[Dict[str, Any]] = []

        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            limits = repo.get_all_limits()

            for lim in limits:
                log = repo.get_or_create_daily_log(lim["id"], d_str)
                metrics = compute_limit_metrics(
                    daily_limit_minutes=lim["daily_limit_minutes"],
                    used_seconds=log["used_seconds"],
                    snoozes_used=log["snoozes_used"],
                    max_snoozes=lim["max_snoozes_per_day"],
                )
                results.append({
                    "id": lim["id"],
                    "target_type": lim["target_type"],
                    "target_identifier": lim["target_identifier"],
                    "display_name": lim["display_name"],
                    "daily_limit_minutes": lim["daily_limit_minutes"],
                    "warning_threshold_minutes": lim["warning_threshold_minutes"],
                    "is_hard_block": bool(lim["is_hard_block"]),
                    "is_active": bool(lim["is_active"]),
                    "max_snoozes_per_day": lim["max_snoozes_per_day"],
                    **metrics,
                })

        return results

    def track_engagement(
        self,
        target_type: str,
        target_identifier: str,
        seconds: int = 2,
        target_date: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Log active screen time to matching limit rule if configured."""
        d_str = target_date or date.today().isoformat()

        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            rule = repo.get_limit_by_target(target_type, target_identifier)
            if not rule:
                return None

            log = repo.record_usage(rule["id"], seconds, d_str)
            metrics = compute_limit_metrics(
                daily_limit_minutes=rule["daily_limit_minutes"],
                used_seconds=log["used_seconds"],
                snoozes_used=log["snoozes_used"],
                max_snoozes=rule["max_snoozes_per_day"],
            )

            return {
                "limit_id": rule["id"],
                "display_name": rule["display_name"],
                "target_type": rule["target_type"],
                "is_hard_block": bool(rule["is_hard_block"]),
                **metrics,
            }

    def snooze(self, limit_id: int, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Grant a +5 minute emergency extension if within daily snooze allowance.

        Raises:
            ValueError: If limit does not exist or max snoozes reached.
        """
        d_str = target_date or date.today().isoformat()

        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            rule = repo.get_limit_by_id(limit_id)
            if not rule:
                raise ValueError(f"Limit rule ID {limit_id} not found.")

            log = repo.get_or_create_daily_log(limit_id, d_str)
            max_snoozes = rule["max_snoozes_per_day"]

            if log["snoozes_used"] >= max_snoozes:
                raise ValueError(
                    f"Daily snooze limit ({max_snoozes} extensions) reached for {rule['display_name']}."
                )

            updated_log = repo.use_snooze(limit_id, d_str)
            metrics = compute_limit_metrics(
                daily_limit_minutes=rule["daily_limit_minutes"],
                used_seconds=updated_log["used_seconds"],
                snoozes_used=updated_log["snoozes_used"],
                max_snoozes=max_snoozes,
            )

            logger.info(
                f"Snoozed {rule['display_name']} (+5m). Snoozes used: {metrics['snoozes_used']}/{max_snoozes}"
            )

            return {
                "limit_id": limit_id,
                "display_name": rule["display_name"],
                "added_minutes": 5,
                **metrics,
            }


# Singleton instance
limit_engine = LimitEngine()
