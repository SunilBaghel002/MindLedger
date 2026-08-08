"""
MindLedger - Dashboard API Routes
FastAPI APIRouter endpoints serving health status, today's dashboard overview, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import date
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

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
page_router = APIRouter(tags=["dashboard_html"])


@page_router.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
@page_router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def get_dashboard_landing_page() -> str:
    """HTML landing page for local web dashboard status."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{APP_NAME} — Local Server Active</title>
    <style>
        :root {{
            --primary: #4A90D9;
            --bg-page: #F7F9FC;
            --bg-card: #FFFFFF;
            --text-main: #1A202C;
            --text-sub: #718096;
            --success: #48BB78;
        }}
        body {{
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-page);
            color: var(--text-main);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }}
        .card {{
            background: var(--bg-card);
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            max-width: 540px;
            width: 90%;
            border: 1px solid #E2E8F0;
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            background: #E6FFFA;
            color: #234E52;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
        }}
        .badge::before {{
            content: '';
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            margin-right: 8px;
        }}
        h1 {{ margin: 16px 0 8px 0; font-size: 24px; }}
        p {{ color: var(--text-sub); line-height: 1.6; margin-bottom: 24px; }}
        .links {{ display: flex; flex-direction: column; gap: 12px; }}
        .link-btn {{
            display: block;
            padding: 12px 16px;
            background: #EDF2F7;
            color: #2D3748;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
        }}
        .link-btn:hover {{ background: #E2E8F0; color: #1A202C; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">API Engine Active</div>
        <h1>{APP_NAME} v{APP_VERSION}</h1>
        <p>Your personal digital wellbeing tracking service and local API server are running silently in the background on <strong>127.0.0.1:8787</strong>.</p>
        <div class="links">
            <a class="link-btn" href="/api/v1/dashboard/today" target="_blank">📊 View Today's Overview JSON (/api/v1/dashboard/today)</a>
            <a class="link-btn" href="/api/v1/apps/today" target="_blank">💻 View App Usage Details JSON (/api/v1/apps/today)</a>
            <a class="link-btn" href="/api/v1/health" target="_blank">💚 View Health Status (/api/v1/health)</a>
            <a class="link-btn" href="/docs" target="_blank">📖 View OpenAPI Documentation (/docs)</a>
        </div>
    </div>
</body>
</html>"""


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
