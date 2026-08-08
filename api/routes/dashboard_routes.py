"""
MindLedger - Dashboard API Routes
FastAPI APIRouter endpoints serving health status, today's dashboard overview, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import date
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from api.schemas import (
    APIResponse,
    AppSessionDTO,
    AppsTodayData,
    AppUsageSummaryItem,
    DashboardTodayData,
    HealthData,
)
from config.constants import APP_NAME, APP_VERSION
from database.connection import db_manager
from database.repositories.app_session_repo import AppSessionRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/health", response_model=APIResponse[HealthData])
async def get_health_status() -> APIResponse[HealthData]:
    """Health check endpoint confirming API server operational status."""
    return APIResponse(
        success=True,
        data=HealthData(status="ok", app=APP_NAME, version=APP_VERSION),
        error=None,
    )


@router.get("/dashboard/today", response_model=APIResponse[DashboardTodayData])
async def get_today_dashboard() -> APIResponse[DashboardTodayData]:
    """Get today's dashboard overview data (total screen time, productivity, top apps)."""
    try:
        today_str = date.today().isoformat()

        with db_manager.connection() as conn:
            repo = AppSessionRepository(conn)
            sessions = repo.get_by_date(today_str)
            top_apps_raw = repo.get_top_apps(today_str, limit=5)

        total_seconds = sum(s.duration_seconds for s in sessions)
        productive_seconds = sum(
            s.duration_seconds for s in sessions if s.productivity == "productive"
        )
        unproductive_seconds = sum(
            s.duration_seconds for s in sessions if s.productivity == "unproductive"
        )
        neutral_seconds = sum(
            s.duration_seconds for s in sessions if s.productivity == "neutral"
        )

        score = (
            round((productive_seconds / total_seconds) * 100.0, 1)
            if total_seconds > 0
            else 0.0
        )

        top_apps = [
            AppUsageSummaryItem(
                app_name=item["app_name"],
                category=item["category"],
                productivity=item["productivity"],
                total_seconds=item["total_seconds"],
            )
            for item in top_apps_raw
        ]

        data = DashboardTodayData(
            date=today_str,
            total_screen_time_seconds=total_seconds,
            productive_time_seconds=productive_seconds,
            unproductive_time_seconds=unproductive_seconds,
            neutral_time_seconds=neutral_seconds,
            productivity_score=score,
            top_apps=top_apps,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch today's dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/apps/today", response_model=APIResponse[AppsTodayData])
async def get_today_apps() -> APIResponse[AppsTodayData]:
    """Get today's application tracking sessions and top applications summary."""
    try:
        today_str = date.today().isoformat()

        with db_manager.connection() as conn:
            repo = AppSessionRepository(conn)
            sessions = repo.get_by_date(today_str)
            top_apps_raw = repo.get_top_apps(today_str, limit=10)

        total_seconds = sum(s.duration_seconds for s in sessions)

        top_apps = [
            AppUsageSummaryItem(
                app_name=item["app_name"],
                category=item["category"],
                productivity=item["productivity"],
                total_seconds=item["total_seconds"],
            )
            for item in top_apps_raw
        ]

        recent_sessions = [
            AppSessionDTO(
                id=s.id,
                app_name=s.app_name,
                window_title=s.window_title,
                started_at=s.started_at.isoformat(),
                ended_at=s.ended_at.isoformat() if s.ended_at else None,
                duration_seconds=s.duration_seconds,
                category=s.category,
                productivity=s.productivity,
            )
            for s in reversed(sessions[:50])
        ]

        data = AppsTodayData(
            date=today_str,
            total_sessions_count=len(sessions),
            total_screen_time_seconds=total_seconds,
            top_apps=top_apps,
            recent_sessions=recent_sessions,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch today's app usage details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
