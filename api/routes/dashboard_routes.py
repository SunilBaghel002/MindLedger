"""
MindLedger - Dashboard API Routes
FastAPI APIRouter endpoints serving health status, today's dashboard overview, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from api.schemas import (
    APIResponse,
    AppAnalyticsData,
    AppSessionDTO,
    AppsTodayData,
    AppTrendItem,
    AppUsageSummaryItem,
    BrowserAnalyticsData,
    BrowserDomainSummaryItem,
    DashboardTodayData,
    DomainSummaryItem,
    HealthData,
    HourlyActivityTimelineDTO,
    LiveTrackingStatusData,
    QuickStatsDTO,
    ReportGenerateRequest,
    ReportHistoryData,
    ReportSummaryItem,
    URLDetailItem,
    YouTubeAnalyticsData,
    YouTubeChannelSummaryItem,
    YouTubeVideoHistoryItem,
)
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from core.idle_detector import IdleDetector
from database.connection import db_manager
from database.repositories.app_session_repo import AppSessionRepository
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.summary_repo import SummaryRepository
from database.repositories.youtube_repo import YouTubeRepository
from reports.report_generator import ReportGenerator
from reports.template_renderer import TemplateRenderer
from utils.logger import get_logger

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
        raise HTTPException(status_code=500, detail="Failed to fetch live tracking status") from e


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
                    mins = s.duration_seconds // 60
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
        raise HTTPException(status_code=500, detail="Failed to fetch today's dashboard overview") from e


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
            cursor1 = conn.execute(
                "SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 50"
            )
            for row in cursor1.fetchall():
                reports.append(
                    ReportSummaryItem(
                        id=row["id"],
                        report_type="daily",
                        period_label=f"Daily Summary - {row['date']}",
                        date=row["date"],
                        total_screen_time_seconds=row["total_screen_time_seconds"],
                        productivity_score=float(row["productivity_score"]),
                        email_sent=bool(row["email_sent"]),
                        most_used_app=row["most_used_app"],
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
