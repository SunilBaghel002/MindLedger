"""
MindLedger - Dashboard API Routes
FastAPI APIRouter endpoints serving health status, today's dashboard overview, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
import psutil
from fastapi.responses import FileResponse, HTMLResponse

from api.schemas import (
    APIResponse,
    AppAnalyticsData,
    AppSessionDTO,
    AppsTodayData,
    AppTrendItem,
    AppUsageSummaryItem,
    BatteryVitalsDTO,
    BrowserAnalyticsData,
    BrowserDomainSummaryItem,
    CategoryRuleCreateRequest,
    CategoryRuleItem,
    DashboardTodayData,
    DashboardVitalsData,
    DomainSummaryItem,
    HealthData,
    HourlyActivityTimelineDTO,
    HydrationVitalsDTO,
    LimitWarningDTO,
    LiveTrackingStatusData,
    MemoryVitalsDTO,
    QuickStatsDTO,
    ReportGenerateRequest,
    ReportHistoryData,
    ReportSummaryItem,
    SettingsData,
    SettingsUpdateRequest,
    URLDetailItem,
    YouTubeAnalyticsData,
    YouTubeChannelSummaryItem,
    YouTubeVideoHistoryItem,
)
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from core.idle_detector import IdleDetector
from database.connection import db_manager
from database.models import CategoryRule
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.category_rule_repo import CategoryRuleRepository
from database.repositories.settings_repo import SettingsRepository
from database.repositories.summary_repo import SummaryRepository
from database.repositories.youtube_repo import YouTubeRepository
from reports.email_sender import EmailSender
from reports.report_generator import ReportGenerator
from reports.template_renderer import TemplateRenderer
from utils.logger import get_logger
from utils.profiler import system_profiler

logger = get_logger(__name__)


router = APIRouter(prefix="/api/v1", tags=["dashboard"])
page_router = APIRouter(tags=["dashboard_html"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "dashboard" / "templates"
DIST_DIR = Path(__file__).resolve().parent.parent.parent / "dashboard" / "dist"

RangePreset = Literal["today", "yesterday", "7d", "30d"]


def _resolve_range(range_preset: RangePreset) -> tuple[str, str]:
    """Resolve preset string into start and end ISO date strings."""
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
    return start_d.isoformat(), end_d.isoformat()


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


@page_router.get("/logo.png", response_class=FileResponse, include_in_schema=False)
@page_router.get("/dashboard/logo.png", response_class=FileResponse, include_in_schema=False)
async def get_dashboard_logo():
    """Serve brand logo image."""
    logo_path = DIST_DIR / "logo.png"
    if not logo_path.exists():
        logo_path = Path(__file__).resolve().parent.parent.parent / "assets" / "logo.png"
    return FileResponse(logo_path)


@page_router.get("/favicon.ico", response_class=FileResponse, include_in_schema=False)
@page_router.get("/dashboard/favicon.ico", response_class=FileResponse, include_in_schema=False)
async def get_dashboard_favicon():
    """Serve brand favicon."""
    fav_path = DIST_DIR / "favicon.ico"
    if not fav_path.exists():
        fav_path = Path(__file__).resolve().parent.parent.parent / "app.ico"
    return FileResponse(fav_path)


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


@router.get("/system/perf", response_model=APIResponse[Dict[str, Any]])
async def get_system_performance() -> APIResponse[Dict[str, Any]]:
    """System performance diagnostics endpoint returning CPU, RAM, Thread count, and DB pool stats."""
    try:
        metrics = system_profiler.get_metrics()
        return APIResponse(
            success=True,
            data={
                "cpu_percent": metrics.cpu_percent,
                "memory_rss_mb": metrics.memory_rss_mb,
                "memory_vms_mb": metrics.memory_vms_mb,
                "active_threads_count": metrics.active_threads_count,
                "gc_collections": metrics.gc_collections,
                "db_pool_stats": metrics.db_pool_stats,
            },
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to fetch system performance metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch performance metrics") from e



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
        raise HTTPException(status_code=500, detail="Failed to fetch live tracking status") from e


@router.get("/dashboard/vitals", response_model=APIResponse[DashboardVitalsData])
@router.get("/vitals", response_model=APIResponse[DashboardVitalsData])
async def get_dashboard_vitals() -> APIResponse[DashboardVitalsData]:
    """Get real-time telemetry vitals (battery, memory, active app, hydration, limits) for TopBar."""
    try:
        # 1. Idle and Live App Session
        is_user_idle = IdleDetector().is_idle()
        current_app = None
        active_session_seconds = 0

        with db_manager.connection() as conn:
            app_repo = AppSessionRepository(conn)
            latest = app_repo.get_latest_active_session()
            if latest:
                current_app = latest.app_name
                active_session_seconds = latest.duration_seconds

            summary_repo = SummaryRepository(conn)
            today_str = date.today().isoformat()
            today_summary = summary_repo.get_daily_summary(today_str)
            if today_summary:
                screen_time_today = today_summary.total_screen_time_seconds
                productivity_score = today_summary.productivity_score
            else:
                screen_time_today = 0
                productivity_score = 0.0

        # 2. System Memory (RAM)
        try:
            mem = psutil.virtual_memory()
            used_gb = round((mem.total - mem.available) / (1024 ** 3), 1)
            total_gb = round(mem.total / (1024 ** 3), 1)
            mem_vitals = MemoryVitalsDTO(
                used_gb=used_gb,
                total_gb=total_gb,
                percent=mem.percent,
            )
        except Exception as mem_err:
            logger.warning(f"Failed to read memory metrics: {mem_err}")
            mem_vitals = MemoryVitalsDTO(used_gb=0.0, total_gb=0.0, percent=0.0)

        # 3. Hardware Battery Status
        try:
            battery_sensors = psutil.sensors_battery()
            if battery_sensors is not None:
                percent = int(battery_sensors.percent)
                power_plugged = bool(battery_sensors.power_plugged)
                status_text = "Plugged In" if power_plugged else f"{percent}% Battery"
                secsleft = battery_sensors.secsleft
                discharge_rate = None
                if not power_plugged and secsleft > 0 and secsleft != getattr(psutil, "POWER_TIME_UNLIMITED", -2):
                    hours_left = secsleft / 3600.0
                    if hours_left > 0:
                        discharge_rate = round(percent / hours_left, 1)
                        status_text = f"Discharging ({discharge_rate}%/h)"
                elif power_plugged:
                    status_text = "Plugged In" if percent >= 99 else "Charging"

                battery_vitals = BatteryVitalsDTO(
                    percent=percent,
                    is_charging=power_plugged and percent < 99,
                    power_plugged=power_plugged,
                    discharge_rate_hr=discharge_rate,
                    status_text=status_text,
                )
            else:
                battery_vitals = BatteryVitalsDTO(
                    percent=100,
                    is_charging=False,
                    power_plugged=True,
                    discharge_rate_hr=None,
                    status_text="AC Power",
                )
        except Exception as bat_err:
            logger.warning(f"Failed to read battery sensors: {bat_err}")
            battery_vitals = BatteryVitalsDTO(
                percent=100,
                is_charging=False,
                power_plugged=True,
                discharge_rate_hr=None,
                status_text="AC Power",
            )

        # 4. Hydration status
        hydration_vitals = HydrationVitalsDTO(
            count=0,
            goal=8,
            volume_ml=0,
            next_reminder_minutes=30,
        )

        # 5. Limits Warning
        limits_warning: List[LimitWarningDTO] = []

        data = DashboardVitalsData(
            is_tracking=not is_user_idle,
            current_app=current_app or "MindLedger Active",
            active_session_seconds=active_session_seconds,
            screen_time_today_seconds=screen_time_today,
            productivity_score=productivity_score,
            battery=battery_vitals,
            memory=mem_vitals,
            hydration=hydration_vitals,
            limits_warning=limits_warning,
        )
        return APIResponse(success=True, data=data, error=None)
    except Exception as e:
        logger.error(f"Failed to fetch dashboard vitals: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard vitals: {e}") from e


@router.get("/dashboard/today", response_model=APIResponse[DashboardTodayData])
async def get_today_dashboard(target_date: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format")) -> APIResponse[DashboardTodayData]:
    """Get dashboard overview data for target date (defaults to today)."""
    try:
        today_str = target_date or date.today().isoformat()

        with db_manager.connection() as conn:
            app_repo = AppSessionRepository(conn)
            browser_repo = BrowserSessionRepository(conn)
            sessions = app_repo.get_by_date(today_str)
            browser_sessions = browser_repo.get_by_date(today_str)
            top_apps_raw = app_repo.get_top_apps(today_str, limit=5)
            top_domains_raw = browser_repo.get_top_domains(today_str, limit=5)

        total_app_sec = sum(s.duration_seconds for s in sessions)
        total_browser_sec = sum(b.duration_seconds for b in browser_sessions)

        total_seconds = max(total_app_sec, total_browser_sec)
        productive_seconds = sum(s.duration_seconds for s in sessions if s.productivity == "productive")
        learning_seconds = sum(s.duration_seconds for s in sessions if s.category == "learning")
        unproductive_seconds = sum(s.duration_seconds for s in sessions if s.productivity == "unproductive")
        neutral_seconds = sum(s.duration_seconds for s in sessions if s.productivity == "neutral")

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

        # Build full 24-hour activity timeline buckets (00:00 to 23:00)
        labels = [
            "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM",
            "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
            "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
            "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
        ]
        prod_mins = [0] * 24
        neut_mins = [0] * 24
        unprod_mins = [0] * 24

        for s in sessions:
            if s.started_at:
                idx = s.started_at.hour
                if 0 <= idx < 24:
                    mins = max(1, s.duration_seconds // 60) if s.duration_seconds >= 30 else 0
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

        valid_cats = [a.category for a in top_apps if a.category and a.category.lower() != "uncategorized"]
        top_cat = valid_cats[0].title() if valid_cats else ("Coding" if productive_seconds >= neutral_seconds else "Browsing")

        quick_stats = QuickStatsDTO(
            peak_hour=peak_hour_str,
            focus_ratio_pct=score,
            top_category=top_cat,
        )

        data = DashboardTodayData(
            date=today_str,
            total_screen_time_seconds=total_seconds,
            productive_time_seconds=productive_seconds,
            learning_time_seconds=learning_seconds,
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
        raise HTTPException(status_code=500, detail="Failed to fetch today's dashboard overview") from e


@router.get("/apps/today", response_model=APIResponse[AppsTodayData])
async def get_today_apps(target_date: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format")) -> APIResponse[AppsTodayData]:
    """Get target date's application tracking sessions and top applications summary."""
    try:
        today_str = target_date or date.today().isoformat()

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
        raise HTTPException(status_code=500, detail="Failed to fetch today's app usage details") from e


@router.get("/apps/analytics", response_model=APIResponse[AppAnalyticsData])
async def get_apps_analytics(
    range_preset: RangePreset = "today",
    category: Optional[str] = None,
) -> APIResponse[AppAnalyticsData]:
    """Get application usage analytics over date range (today, yesterday, 7d, 30d) with optional category filtering."""
    try:
        start_str, end_str = _resolve_range(range_preset)

        with db_manager.connection() as conn:
            repo = AppSessionRepository(conn)
            top_apps_raw = repo.get_top_apps_range(start_str, end_str, category=category, limit=100)
            trend_raw = repo.get_daily_app_trend(start_str, end_str)
            total_apps_cnt = repo.get_distinct_app_count_range(start_str, end_str, category=category)
            all_sessions = repo.get_by_date_range(start_str, end_str)

        total_seconds = sum(item["total_seconds"] for item in top_apps_raw)

        # Compute category breakdown for sessions matching category filter
        cat_breakdown: Dict[str, int] = {}
        for s in all_sessions:
            if not s.is_foreground:
                continue
            cat_key = (s.productivity or s.category or "neutral").lower()
            if category and category.lower() != "all" and cat_key != category.lower() and s.category.lower() != category.lower():
                continue
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
            total_apps_count=total_apps_cnt,
            top_apps=top_apps,
            category_breakdown=cat_breakdown,
            trend=trend,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch app analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch app analytics") from e


@router.get("/browser/analytics", response_model=APIResponse[BrowserAnalyticsData])
async def get_browser_analytics(
    range_preset: RangePreset = "today",
    category: Optional[str] = None,
) -> APIResponse[BrowserAnalyticsData]:
    """Get browser usage analytics over date range (today, yesterday, 7d, 30d) with optional category filtering."""
    try:
        start_str, end_str = _resolve_range(range_preset)

        with db_manager.connection() as conn:
            repo = BrowserSessionRepository(conn)
            top_domains_raw = repo.get_top_domains_range(start_str, end_str, category=category, limit=100)
            unique_cnt = repo.get_distinct_domain_count_range(start_str, end_str, category=category)
            all_sessions = repo.get_by_date_range(start_str, end_str)

        total_seconds = sum(item["total_seconds"] for item in top_domains_raw)

        # Compute category breakdown for domain sessions matching category filter
        cat_breakdown: Dict[str, int] = {}
        for s in all_sessions:
            cat_key = (s.productivity or s.category or "neutral").lower()
            if category and category.lower() != "all" and cat_key != category.lower() and s.category.lower() != category.lower():
                continue
            cat_breakdown[cat_key] = cat_breakdown.get(cat_key, 0) + s.duration_seconds

        top_domains = [
            BrowserDomainSummaryItem(
                domain=item["domain"],
                category=item["category"],
                productivity=item["productivity"],
                total_seconds=item["total_seconds"],
                visit_count=item.get("visit_count", 1),
            )
            for item in top_domains_raw
        ]

        data = BrowserAnalyticsData(
            date_range=range_preset,
            total_browsing_seconds=total_seconds,
            unique_domains_count=unique_cnt,
            top_domains=top_domains,
            category_breakdown=cat_breakdown,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch browser analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch browser analytics") from e


@router.get("/browser/domain-details", response_model=APIResponse[List[URLDetailItem]])
async def get_domain_url_details(
    domain: str,
    range_preset: RangePreset = "today",
) -> APIResponse[List[URLDetailItem]]:
    """Get detailed URL breakdown for a specific domain within a date range."""
    try:
        start_str, end_str = _resolve_range(range_preset)

        with db_manager.connection() as conn:
            repo = BrowserSessionRepository(conn)
            urls_raw = repo.get_urls_for_domain(domain, start_str, end_str, limit=50)

        url_items = [
            URLDetailItem(
                url=item["url"],
                page_title=item["page_title"],
                total_seconds=item["total_seconds"],
                visit_count=item["visit_count"],
            )
            for item in urls_raw
        ]

        return APIResponse(success=True, data=url_items, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch domain URL details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch domain URL details") from e


@router.get("/youtube/analytics", response_model=APIResponse[YouTubeAnalyticsData])
async def get_youtube_analytics(
    range_preset: RangePreset = "today",
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> APIResponse[YouTubeAnalyticsData]:
    """Get YouTube watch analytics over date range with category and title search filters."""
    try:
        start_str, end_str = _resolve_range(range_preset)

        with db_manager.connection() as conn:
            repo = YouTubeRepository(conn)
            top_channels_raw = repo.get_top_channels_range(start_str, end_str, category=category, limit=100)
            history_models = repo.get_video_history_range(start_str, end_str, category=category, search=search, limit=100)
            all_sessions = repo.get_by_date_range(start_str, end_str)

        total_seconds = sum(s.watch_duration_seconds for s in all_sessions)
        prod_seconds = sum(s.watch_duration_seconds for s in all_sessions if s.is_productive is True)
        ent_seconds = sum(s.watch_duration_seconds for s in all_sessions if s.is_productive is False)

        # Calculate Shorts vs Longform watch time
        shorts_seconds = sum(
            s.watch_duration_seconds for s in all_sessions
            if (s.video_url and "/shorts/" in s.video_url) or (s.video_category and s.video_category.lower() == "shorts")
        )
        longform_seconds = max(0, total_seconds - shorts_seconds)
        shorts_pct = round((shorts_seconds / total_seconds) * 100.0, 1) if total_seconds > 0 else 0.0

        # Compute category breakdown
        cat_breakdown: Dict[str, int] = {}
        for s in all_sessions:
            c_name = (s.video_category or "uncategorized").lower()
            if category and category.lower() != "all" and c_name != category.lower():
                continue
            cat_breakdown[c_name] = cat_breakdown.get(c_name, 0) + s.watch_duration_seconds

        top_channels = [
            YouTubeChannelSummaryItem(
                channel_name=item["channel_name"],
                channel_url=item["channel_url"],
                video_category=item.get("video_category", "uncategorized"),
                total_videos=item["total_videos"],
                total_seconds=item["total_seconds"],
            )
            for item in top_channels_raw
        ]

        history_items = [
            YouTubeVideoHistoryItem(
                id=h.id or 0,
                video_id=h.video_id,
                video_url=h.video_url,
                video_title=h.video_title,
                channel_name=h.channel_name,
                watch_duration_seconds=h.watch_duration_seconds,
                video_category=h.video_category,
                is_productive=h.is_productive,
                is_short=bool((h.video_url and "/shorts/" in h.video_url) or (h.video_category and h.video_category.lower() == "shorts")),
                date=h.date,
                started_at=h.started_at.isoformat(),
            )
            for h in history_models
        ]

        data = YouTubeAnalyticsData(
            date_range=range_preset,
            total_watch_seconds=total_seconds,
            productive_watch_seconds=prod_seconds,
            entertainment_watch_seconds=ent_seconds,
            shorts_watch_seconds=shorts_seconds,
            longform_watch_seconds=longform_seconds,
            shorts_ratio_pct=shorts_pct,
            channels_count=len(top_channels),
            top_channels=top_channels,
            category_breakdown=cat_breakdown,
            history=history_items,
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch YouTube analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch YouTube analytics") from e


@router.get("/reports/history", response_model=APIResponse[ReportHistoryData])
async def get_reports_history() -> APIResponse[ReportHistoryData]:
    """Get list of all generated daily and periodic report summaries."""
    try:
        reports: List[ReportSummaryItem] = []
        with db_manager.connection() as conn:
            summary_repo = SummaryRepository(conn)

            # Fetch daily summaries
            today_str = date.today().isoformat()
            cursor1 = conn.execute(
                "SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 50"
            )
            for row in cursor1.fetchall():
                is_today = (row["date"] == today_str)
                if is_today:
                    live_sum = summary_repo.aggregate_daily_summary(today_str)
                    screen_secs = live_sum.total_screen_time_seconds
                    score_val = float(live_sum.productivity_score)
                    top_app_val = live_sum.most_used_app
                else:
                    screen_secs = row["total_screen_time_seconds"]
                    score_val = float(row["productivity_score"])
                    top_app_val = row["most_used_app"]

                reports.append(
                    ReportSummaryItem(
                        id=row["id"],
                        report_type="daily",
                        period_label=f"Daily Summary - {row['date']}",
                        date=row["date"],
                        total_screen_time_seconds=screen_secs,
                        productivity_score=score_val,
                        email_sent=bool(row["email_sent"]),
                        most_used_app=top_app_val,
                    )
                )

            # Fetch periodic summaries
            cursor2 = conn.execute(
                "SELECT * FROM periodic_summaries ORDER BY period_end DESC LIMIT 50"
            )
            for row in cursor2.fetchall():
                reports.append(
                    ReportSummaryItem(
                        id=row["id"],
                        report_type=row["period_type"],
                        period_label=row["period_label"],
                        date=row["period_end"],
                        total_screen_time_seconds=row["total_screen_time_seconds"],
                        productivity_score=float(row["avg_productivity_score"]),
                        email_sent=bool(row["email_sent"]),
                        most_used_app=None,
                    )
                )

        return APIResponse(success=True, data=ReportHistoryData(reports=reports), error=None)

    except Exception as e:
        logger.error(f"Failed to fetch reports history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reports history") from e


@router.post("/reports/generate", response_model=APIResponse[ReportSummaryItem])
async def generate_report(req: ReportGenerateRequest) -> APIResponse[ReportSummaryItem]:
    """Trigger report generation pipeline for a specific date and report type."""
    try:
        with db_manager.connection() as conn:
            generator = ReportGenerator(conn)
            summary_repo = SummaryRepository(conn)

            if req.report_type == "weekly":
                summary = summary_repo.aggregate_weekly_summary(req.date)
                if req.send_email:
                    generator.generate_and_send_weekly_report(req.date, recipient=req.recipient)
                result_item = ReportSummaryItem(
                    id=summary.id,
                    report_type="weekly",
                    period_label=summary.period_label,
                    date=summary.period_end,
                    total_screen_time_seconds=summary.total_screen_time_seconds,
                    productivity_score=summary.avg_productivity_score,
                    email_sent=summary.email_sent,
                )
            elif req.report_type == "monthly":
                dt = datetime.strptime(req.date, "%Y-%m-%d")
                summary = summary_repo.aggregate_monthly_summary(dt.year, dt.month)
                if req.send_email:
                    generator.generate_and_send_monthly_report(dt.year, dt.month, recipient=req.recipient)
                result_item = ReportSummaryItem(
                    id=summary.id,
                    report_type="monthly",
                    period_label=summary.period_label,
                    date=summary.period_end,
                    total_screen_time_seconds=summary.total_screen_time_seconds,
                    productivity_score=summary.avg_productivity_score,
                    email_sent=summary.email_sent,
                )
            else:
                if req.send_email:
                    daily = generator.generate_and_send_daily_report(req.date, recipient=req.recipient)
                else:
                    daily = summary_repo.aggregate_daily_summary(req.date)
                    summary_repo.save_daily_summary(daily)
                result_item = ReportSummaryItem(
                    id=daily.id,
                    report_type="daily",
                    period_label=f"Daily Summary - {daily.date}",
                    date=daily.date,
                    total_screen_time_seconds=daily.total_screen_time_seconds,
                    productivity_score=daily.productivity_score,
                    email_sent=daily.email_sent,
                    most_used_app=daily.most_used_app,
                )

        return APIResponse(success=True, data=result_item, error=None)

    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report") from e


@router.post("/reports/send-email", response_model=APIResponse[Dict[str, Any]])
async def send_report_email(req: ReportGenerateRequest) -> APIResponse[Dict[str, Any]]:
    """Trigger SMTP report email delivery for a given date and report type."""
    try:
        with db_manager.connection() as conn:
            generator = ReportGenerator(conn)
            if req.report_type == "weekly":
                summary = generator.generate_and_send_weekly_report(req.date, recipient=req.recipient)
            elif req.report_type == "monthly":
                dt = datetime.strptime(req.date, "%Y-%m-%d")
                summary = generator.generate_and_send_monthly_report(dt.year, dt.month, recipient=req.recipient)
            else:
                summary = generator.generate_and_send_daily_report(req.date, recipient=req.recipient)

        success = summary.email_sent
        return APIResponse(
            success=success,
            data={"message": f"Email {'sent successfully' if success else 'dispatch failed'}", "sent": success},
            error=None if success else "SMTP email delivery failed",
        )

    except Exception as e:
        logger.error(f"Failed to send report email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send report email") from e


@router.get("/reports/download/html", response_class=HTMLResponse)
async def download_report_html(report_type: str = "daily", date_str: str = ""):
    """Download Jinja2 HTML report attachment."""
    try:
        target_date = date_str or date.today().isoformat()
        renderer = TemplateRenderer()

        with db_manager.connection() as conn:
            summary_repo = SummaryRepository(conn)
            if report_type == "weekly":
                summary = summary_repo.aggregate_weekly_summary(target_date)
                html_str = renderer.render_weekly_report(summary)
            elif report_type == "monthly":
                dt = datetime.strptime(target_date, "%Y-%m-%d")
                summary = summary_repo.aggregate_monthly_summary(dt.year, dt.month)
                html_str = renderer.render_monthly_report(summary)
            else:
                summary = summary_repo.aggregate_daily_summary(target_date)
                html_str = renderer.render_daily_report(summary)

        filename = f"mindledger_{report_type}_report_{target_date}.html"
        return HTMLResponse(
            content=html_str,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        logger.error(f"Failed to download HTML report: {e}")
        raise HTTPException(status_code=500, detail="Failed to download HTML report") from e


@router.get("/reports/download/pdf", response_class=HTMLResponse)
async def download_report_pdf(report_type: str = "daily", date_str: str = ""):
    """Download PDF report attachment (serves formatted HTML printable template)."""
    try:
        target_date = date_str or date.today().isoformat()
        renderer = TemplateRenderer()

        with db_manager.connection() as conn:
            summary_repo = SummaryRepository(conn)
            if report_type == "weekly":
                summary = summary_repo.aggregate_weekly_summary(target_date)
                html_str = renderer.render_weekly_report(summary)
            elif report_type == "monthly":
                dt = datetime.strptime(target_date, "%Y-%m-%d")
                summary = summary_repo.aggregate_monthly_summary(dt.year, dt.month)
                html_str = renderer.render_monthly_report(summary)
            else:
                summary = summary_repo.aggregate_daily_summary(target_date)
                html_str = renderer.render_daily_report(summary)

        filename = f"mindledger_{report_type}_report_{target_date}.pdf.html"
        return HTMLResponse(
            content=html_str,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        logger.error(f"Failed to download PDF report: {e}")
        raise HTTPException(status_code=500, detail="Failed to download PDF report") from e


@router.get("/settings", response_model=APIResponse[SettingsData])
async def get_settings() -> APIResponse[SettingsData]:
    """Get application settings configuration."""
    try:
        with db_manager.connection() as conn:
            repo = SettingsRepository(conn)
            all_s = repo.get_all()

        data = SettingsData(
            smtp_host=all_s["smtp_host"].value if "smtp_host" in all_s and all_s["smtp_host"].value is not None else getattr(settings, "smtp_host", ""),
            smtp_port=int(all_s["smtp_port"].value) if "smtp_port" in all_s and all_s["smtp_port"].value is not None else getattr(settings, "smtp_port", 587),
            smtp_username=all_s["smtp_username"].value if "smtp_username" in all_s and all_s["smtp_username"].value is not None else getattr(settings, "smtp_username", ""),
            smtp_password=all_s["smtp_password"].value if "smtp_password" in all_s and all_s["smtp_password"].value is not None else getattr(settings, "smtp_password", None),
            recipient_email=all_s["recipient_email"].value if "recipient_email" in all_s and all_s["recipient_email"].value is not None else getattr(settings, "report_recipient_email", ""),
            tracking_enabled=all_s["tracking_enabled"].value.lower() == "true" if "tracking_enabled" in all_s and all_s["tracking_enabled"].value is not None else True,
            idle_threshold_seconds=int(all_s["idle_threshold_seconds"].value) if "idle_threshold_seconds" in all_s and all_s["idle_threshold_seconds"].value is not None else getattr(settings, "idle_threshold_seconds", 300),
            theme=all_s["theme"].value if "theme" in all_s and all_s["theme"].value is not None else "light",
        )

        return APIResponse(success=True, data=data, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch settings") from e


@router.post("/settings", response_model=APIResponse[SettingsData])
async def update_settings(req: SettingsUpdateRequest) -> APIResponse[SettingsData]:
    """Update application settings configuration."""
    try:
        with db_manager.connection() as conn:
            repo = SettingsRepository(conn)
            if req.smtp_host is not None:
                repo.set("smtp_host", req.smtp_host)
            if req.smtp_port is not None:
                repo.set("smtp_port", req.smtp_port, "integer")
            if req.smtp_username is not None:
                repo.set("smtp_username", req.smtp_username)
            if req.smtp_password is not None:
                repo.set("smtp_password", req.smtp_password)
            if req.recipient_email is not None:
                repo.set("recipient_email", req.recipient_email)
            if req.tracking_enabled is not None:
                repo.set("tracking_enabled", str(req.tracking_enabled).lower(), "boolean")
            if req.idle_threshold_seconds is not None:
                repo.set("idle_threshold_seconds", req.idle_threshold_seconds, "integer")
            if req.theme is not None:
                repo.set("theme", req.theme)

        return await get_settings()

    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings") from e


@router.post("/settings/test-email", response_model=APIResponse[Dict[str, Any]])
async def test_email_settings(req: Optional[SettingsUpdateRequest] = None) -> APIResponse[Dict[str, Any]]:
    """Test SMTP email credentials by dispatching a test email."""
    try:
        with db_manager.connection() as conn:
            repo = SettingsRepository(conn)
            all_s = repo.get_all()

        recipient = (
            (req.recipient_email if req and req.recipient_email else None)
            or (all_s.get("recipient_email").value if all_s.get("recipient_email") else "")
            or getattr(settings, "report_recipient_email", "")
        )

        sender = EmailSender()
        success = sender.send_test_email(recipient=recipient)

        return APIResponse(
            success=success,
            data={"message": f"Test email {'sent successfully' if success else 'failed to send'}", "sent": success},
            error=None if success else "Failed to send test email via SMTP",
        )

    except Exception as e:
        logger.error(f"Test email dispatch failed: {e}")
        raise HTTPException(status_code=500, detail="Test email dispatch failed") from e


@router.get("/settings/rules", response_model=APIResponse[List[CategoryRuleItem]])
async def get_category_rules() -> APIResponse[List[CategoryRuleItem]]:
    """Get list of all custom category mapping rules."""
    try:
        with db_manager.connection() as conn:
            repo = CategoryRuleRepository(conn)
            rules = repo.get_all()

        items = [
            CategoryRuleItem(
                id=r.id,
                rule_type=r.rule_type,
                pattern=r.pattern,
                category=r.category,
                productivity=r.productivity,
                priority=r.priority,
                is_active=r.is_active,
            )
            for r in rules
        ]

        return APIResponse(success=True, data=items, error=None)

    except Exception as e:
        logger.error(f"Failed to fetch category rules: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch category rules") from e


@router.post("/settings/rules", response_model=APIResponse[CategoryRuleItem])
async def create_category_rule(req: CategoryRuleCreateRequest) -> APIResponse[CategoryRuleItem]:
    """Create a new custom category rule."""
    try:
        rule = CategoryRule(
            rule_type=req.rule_type,
            pattern=req.pattern,
            category=req.category,
            productivity=req.productivity,
            priority=req.priority,
            is_active=True,
        )

        with db_manager.connection() as conn:
            repo = CategoryRuleRepository(conn)
            rule_id = repo.save(rule)

        item = CategoryRuleItem(
            id=rule_id,
            rule_type=rule.rule_type,
            pattern=rule.pattern,
            category=rule.category,
            productivity=rule.productivity,
            priority=rule.priority,
            is_active=rule.is_active,
        )

        return APIResponse(success=True, data=item, error=None)

    except Exception as e:
        logger.error(f"Failed to create category rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to create category rule") from e


@router.delete("/settings/rules/{rule_id}", response_model=APIResponse[Dict[str, Any]])
async def delete_category_rule(rule_id: int) -> APIResponse[Dict[str, Any]]:
    """Delete a category rule by ID."""
    try:
        with db_manager.connection() as conn:
            repo = CategoryRuleRepository(conn)
            success = repo.delete(rule_id)

        return APIResponse(
            success=success,
            data={"message": f"Rule {rule_id} {'deleted' if success else 'not found'}"},
            error=None if success else "Rule not found",
        )

    except Exception as e:
        logger.error(f"Failed to delete category rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete category rule") from e


@router.post("/settings/clear-history", response_model=APIResponse[Dict[str, Any]])
async def clear_tracking_history() -> APIResponse[Dict[str, Any]]:
    """Clear all tracking history records from database."""
    try:
        with db_manager.connection() as conn:
            conn.execute("DELETE FROM app_sessions;")
            conn.execute("DELETE FROM browser_sessions;")
            conn.execute("DELETE FROM youtube_activity;")
            conn.execute("DELETE FROM daily_summaries;")
            conn.execute("DELETE FROM periodic_summaries;")

        return APIResponse(success=True, data={"message": "Tracking history successfully cleared."}, error=None)

    except Exception as e:
        logger.error(f"Failed to clear tracking history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear tracking history") from e


@router.get("/settings/export")
async def export_tracking_data(format: str = "json"):
    """Export complete activity tracking data as a JSON download."""
    try:
        with db_manager.connection() as conn:
            c1 = conn.execute("SELECT * FROM app_sessions ORDER BY id DESC LIMIT 500")
            apps = [dict(row) for row in c1.fetchall()]

            c2 = conn.execute("SELECT * FROM browser_sessions ORDER BY id DESC LIMIT 500")
            browsers = [dict(row) for row in c2.fetchall()]

            c3 = conn.execute("SELECT * FROM youtube_activity ORDER BY id DESC LIMIT 500")
            yt = [dict(row) for row in c3.fetchall()]

        export_payload = {
            "app_name": APP_NAME,
            "version": APP_VERSION,
            "exported_at": date.today().isoformat(),
            "app_sessions": apps,
            "browser_sessions": browsers,
            "youtube_activity": yt,
        }

        json_str = json.dumps(export_payload, indent=2)
        filename = f"mindledger_export_{date.today().isoformat()}.json"
        return HTMLResponse(
            content=json_str,
            headers={"Content-Type": "application/json", "Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        logger.error(f"Failed to export data: {e}")
        raise HTTPException(status_code=500, detail="Failed to export data") from e
