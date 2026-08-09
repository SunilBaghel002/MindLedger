"""
MindLedger - Dashboard API Routes
FastAPI APIRouter endpoints serving health status, today's dashboard overview, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from api.schemas import (
    APIResponse,
    AppAnalyticsData,
    AppSessionDTO,
    AppsTodayData,
    AppTrendItem,
    AppUsageSummaryItem,
    DashboardTodayData,
    DomainSummaryItem,
    HealthData,
    HourlyActivityTimelineDTO,
    LiveTrackingStatusData,
    QuickStatsDTO,
)
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from core.idle_detector import IdleDetector
from database.connection import db_manager
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["dashboard"])
page_router = APIRouter(tags=["dashboard_html"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "dashboard" / "templates"
DIST_DIR = Path(__file__).resolve().parent.parent.parent / "dashboard" / "dist"


@page_router.get("/dashboard", response_class=FileResponse, include_in_schema=False)
@page_router.get("/", response_class=FileResponse, include_in_schema=False)
async def get_dashboard_index_page():
    """Serve main React dashboard SPA index.html."""
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    index_path = TEMPLATES_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard index.html not found.")
    return FileResponse(index_path)


@page_router.get("/dashboard/{page_name}", response_class=FileResponse, include_in_schema=False)
async def get_dashboard_subpage(page_name: str):
    """Serve subpages or fallback to main SPA index.html."""
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return FileResponse(dist_index)
    clean_name = page_name.replace(".html", "")
    target_path = TEMPLATES_DIR / f"{clean_name}.html"
    if not target_path.exists():
        index_path = TEMPLATES_DIR / "index.html"
        return FileResponse(index_path)
    return FileResponse(target_path)


@router.get("/health", response_model=APIResponse[HealthData])
async def get_health_status() -> APIResponse[HealthData]:
    """Health check endpoint confirming API server operational status."""
    return APIResponse(
        success=True,
        data=HealthData(status="ok", app=APP_NAME, version=APP_VERSION),
        error=None,
    )


@router.get("/dashboard/live", response_model=APIResponse[LiveTrackingStatusData])
async def get_live_tracking_status() -> APIResponse[LiveTrackingStatusData]:
    """Get real-time tracking status of active foreground window."""
    try:
        is_user_idle = IdleDetector().is_idle()
        with db_manager.connection() as conn:
            repo = AppSessionRepository(conn)
            latest = repo.get_latest_active_session()

        if latest:
            data = LiveTrackingStatusData(
                is_tracking=not is_user_idle,
                current_app=latest.app_name,
                window_title=latest.window_title,
                started_at=latest.started_at.isoformat(),
                duration_seconds=latest.duration_seconds,
                is_idle=is_user_idle,
            )
        else:
            data = LiveTrackingStatusData(
                is_tracking=not is_user_idle,
                current_app="MindLedger Engine",
                window_title="Active Tracking",
                started_at=None,
                duration_seconds=0,
                is_idle=is_user_idle,
            )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch live tracking status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch live tracking status")


@router.get("/dashboard/today", response_model=APIResponse[DashboardTodayData])
async def get_today_dashboard() -> APIResponse[DashboardTodayData]:
    """Get today's dashboard overview data (total screen time, productivity, top apps, websites, timeline)."""
    try:
        today_str = date.today().isoformat()

        with db_manager.connection() as conn:
            app_repo = AppSessionRepository(conn)
            browser_repo = BrowserSessionRepository(conn)
            sessions = app_repo.get_by_date(today_str)
            top_apps_raw = app_repo.get_top_apps(today_str, limit=5)
            top_domains_raw = browser_repo.get_top_domains(today_str, limit=5)

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

        top_websites = [
            DomainSummaryItem(
                domain=item["domain"],
                category=item["category"],
                productivity=item["productivity"],
                total_seconds=item["total_seconds"],
            )
            for item in top_domains_raw
        ]

        # Build 12-hour activity timeline buckets (8 AM to 7 PM)
        labels = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM"]
        prod_mins = [0] * 12
        neut_mins = [0] * 12
        unprod_mins = [0] * 12

        for s in sessions:
            if s.started_at:
                hour = s.started_at.hour
                if 8 <= hour <= 19:
                    idx = hour - 8
                    mins = max(1, s.duration_seconds // 60)
                    if s.productivity == "productive":
                        prod_mins[idx] += mins
                    elif s.productivity == "unproductive":
                        unprod_mins[idx] += mins
                    else:
                        neut_mins[idx] += mins

        timeline = HourlyActivityTimelineDTO(
            labels=labels,
            productive=prod_mins,
            neutral=neut_mins,
            unproductive=unprod_mins,
        )

        # Compute quick stats insights
        hourly_totals = [p + n + u for p, n, u in zip(prod_mins, neut_mins, unprod_mins)]
        max_idx = hourly_totals.index(max(hourly_totals)) if any(hourly_totals) else 0
        peak_hour_str = labels[max_idx] if any(hourly_totals) else "N/A"
        top_cat = top_apps[0].category if top_apps else "Development"

        quick_stats = QuickStatsDTO(
            peak_hour=peak_hour_str,
            focus_ratio_pct=score,
            top_category=top_cat,
        )

        data = DashboardTodayData(
            date=today_str,
            total_screen_time_seconds=total_seconds,
            productive_time_seconds=productive_seconds,
            unproductive_time_seconds=unproductive_seconds,
            neutral_time_seconds=neutral_seconds,
            productivity_score=score,
            top_apps=top_apps,
            top_websites=top_websites,
            timeline=timeline,
            quick_stats=quick_stats,
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


@router.get("/apps/analytics", response_model=APIResponse[AppAnalyticsData])
async def get_apps_analytics(
    range_preset: str = "today",
    category: Optional[str] = None,
) -> APIResponse[AppAnalyticsData]:
    """Get application usage analytics over date range (today, yesterday, 7d, 30d) with optional category filtering."""
    try:
        today = date.today()
        if range_preset == "yesterday":
            start_d = today - timedelta(days=1)
            end_d = start_d
        elif range_preset == "7d":
            start_d = today - timedelta(days=6)
            end_d = today
        elif range_preset == "30d":
            start_d = today - timedelta(days=29)
            end_d = today
        else:
            start_d = today
            end_d = today

        start_str = start_d.isoformat()
        end_str = end_d.isoformat()

        with db_manager.connection() as conn:
            repo = AppSessionRepository(conn)
            top_apps_raw = repo.get_top_apps_range(start_str, end_str, category=category, limit=100)
            trend_raw = repo.get_daily_app_trend(start_str, end_str)
            all_sessions = repo.get_by_date_range(start_str, end_str)

        total_seconds = sum(item["total_seconds"] for item in top_apps_raw)

        # Compute category breakdown
        cat_breakdown: Dict[str, int] = {}
        for s in all_sessions:
            cat_key = s.productivity or s.category or "neutral"
            cat_breakdown[cat_key] = cat_breakdown.get(cat_key, 0) + s.duration_seconds

        top_apps = [
            AppUsageSummaryItem(
                app_name=item["app_name"],
                category=item["category"],
                productivity=item["productivity"],
                total_seconds=item["total_seconds"],
            )
            for item in top_apps_raw
        ]

        trend = [
            AppTrendItem(date=item["date"], total_seconds=item["total_seconds"])
            for item in trend_raw
        ]

        data = AppAnalyticsData(
            date_range=range_preset,
            total_screen_time_seconds=total_seconds,
            total_apps_count=len(top_apps),
            top_apps=top_apps,
            category_breakdown=cat_breakdown,
            trend=trend,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch app analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
