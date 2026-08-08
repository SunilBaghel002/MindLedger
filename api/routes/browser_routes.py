"""
MindLedger - Browser & YouTube API Routes
FastAPI router for receiving tracking events and querying browser/YouTube analytics data.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import date as dt_date, datetime
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Query

from api.schemas import (
    APIResponse,
    BrowserDomainsData,
    BrowserEventSchema,
    BrowserTodayData,
    ChannelSummaryItem,
    DomainSummaryItem,
    EventRecordedData,
    YouTubeActivityDTO,
    YouTubeChannelsData,
    YouTubeEventSchema,
    YouTubeTodayData,
)
from config.constants import (
    CATEGORY_BROWSING,
    CATEGORY_CODING,
    CATEGORY_LEARNING,
    CATEGORY_SOCIAL_MEDIA,
    CATEGORY_UNCATEGORIZED,
    CATEGORY_YOUTUBE,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_UNPRODUCTIVE,
)
from config.settings import settings
from database.connection import DatabaseManager
from database.models import BrowserSession, YouTubeActivity
from database.repositories.browser_session_repo import BrowserSessionRepository
from database.repositories.youtube_repo import YouTubeRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["browser"])
db_manager = DatabaseManager(settings.database_path)


def classify_browser_domain(domain: str) -> tuple[str, str]:
    """Classify a domain into a category and productivity score.

    Args:
        domain: Hostname/domain string.

    Returns:
        Tuple of (category, productivity).
    """
    domain_lower = domain.lower()
    if any(k in domain_lower for k in ["github.com", "gitlab.com", "stackoverflow.com", "dev.to"]):
        return CATEGORY_CODING, PRODUCTIVITY_PRODUCTIVE
    if any(k in domain_lower for k in ["youtube.com", "youtu.be"]):
        return CATEGORY_YOUTUBE, PRODUCTIVITY_NEUTRAL
    if any(k in domain_lower for k in ["twitter.com", "x.com", "facebook.com", "instagram.com", "reddit.com", "tiktok.com"]):
        return CATEGORY_SOCIAL_MEDIA, PRODUCTIVITY_UNPRODUCTIVE
    return CATEGORY_BROWSING, PRODUCTIVITY_NEUTRAL


def classify_youtube_video(title: str, is_short: bool) -> tuple[str, bool | None]:
    """Classify a YouTube video based on its title and format.

    Args:
        title: Video title string.
        is_short: Whether the video is a YouTube Short.

    Returns:
        Tuple of (video_category, is_productive).
    """
    title_lower = (title or "").lower()

    if any(k in title_lower for k in ["tutorial", "course", "learn", "python", "javascript", "code", "programming", "lecture", "guide"]):
        return CATEGORY_LEARNING, True

    if any(k in title_lower for k in ["funny", "vlog", "gaming", "music", "song", "trailer", "movie"]):
        return "entertainment", False

    category = "youtube_shorts" if is_short else CATEGORY_YOUTUBE
    return category, None


# POST EVENT ENDPOINTS
@router.post("/events/browser", response_model=APIResponse[EventRecordedData])
async def receive_browser_event(event: BrowserEventSchema) -> Dict:
    """Receive a browser tab session event from the Chrome extension.

    Args:
        event: Browser event schema payload.

    Returns:
        Confirmation response envelope with inserted record ID.
    """
    logger.debug(f"Received browser event: url={event.url}, domain={event.domain}, duration={event.duration_seconds}s")

    try:
        try:
            started_dt = datetime.fromisoformat(event.started_at)
        except Exception:
            started_dt = datetime.now()

        ended_dt = None
        if event.ended_at:
            try:
                ended_dt = datetime.fromisoformat(event.ended_at)
            except Exception:
                ended_dt = None

        date_str = started_dt.strftime("%Y-%m-%d")
        category, productivity = classify_browser_domain(event.domain)

        session = BrowserSession(
            url=event.url,
            domain=event.domain,
            page_title=event.title,
            tab_id=event.tab_id,
            started_at=started_dt,
            ended_at=ended_dt,
            duration_seconds=event.duration_seconds,
            is_active=True,
            category=category,
            productivity=productivity,
            date=date_str,
        )

        with db_manager.connection() as conn:
            repo = BrowserSessionRepository(conn)
            session_id = repo.save(session)
            conn.commit()

        return {
            "success": True,
            "data": {"id": session_id},
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to record browser event: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record browser event: {str(e)}")


@router.post("/events/youtube", response_model=APIResponse[EventRecordedData])
async def receive_youtube_event(event: YouTubeEventSchema) -> Dict:
    """Receive a YouTube video watch event from the Chrome extension.

    Args:
        event: YouTube event schema payload.

    Returns:
        Confirmation response envelope with inserted record ID.
    """
    logger.debug(f"Received YouTube event: video_id={event.video_id}, title={event.video_title}, duration={event.watch_duration_seconds}s")

    try:
        if event.timestamp:
            try:
                started_dt = datetime.fromisoformat(event.timestamp)
            except Exception:
                started_dt = datetime.now()
        else:
            started_dt = datetime.now()

        date_str = started_dt.strftime("%Y-%m-%d")
        video_category, is_productive = classify_youtube_video(event.video_title or "", event.is_short)

        with db_manager.connection() as conn:
            repo = YouTubeRepository(conn)
            existing = repo.find_recent_by_video_id(event.video_id, date_str) if event.video_id else None

            if existing and existing.id:
                repo.update_watch_duration(existing.id, event.watch_duration_seconds, started_dt)
                activity_id = existing.id
            else:
                activity = YouTubeActivity(
                    video_url=event.video_url or f"https://www.youtube.com/watch?v={event.video_id}",
                    video_id=event.video_id,
                    video_title=event.video_title,
                    channel_name=event.channel_name,
                    channel_url=event.channel_url,
                    started_at=started_dt,
                    ended_at=started_dt,
                    watch_duration_seconds=event.watch_duration_seconds,
                    video_category=video_category,
                    is_productive=is_productive,
                    date=date_str,
                )
                activity_id = repo.save(activity)

        return {
            "success": True,
            "data": {"id": activity_id},
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to record YouTube event: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record YouTube event: {str(e)}")


# GET ANALYTICS ENDPOINTS
@router.get("/browser/today", response_model=APIResponse[BrowserTodayData])
async def get_browser_today(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")) -> Dict:
    """Get today's browser usage summary and top domains.

    Args:
        date: Optional date filter string. Defaults to today.

    Returns:
        BrowserTodayData payload wrapped in APIResponse.
    """
    try:
        date_str = date or dt_date.today().isoformat()
        with db_manager.connection() as conn:
            repo = BrowserSessionRepository(conn)
            total_duration = repo.get_total_duration(date_str)
            unique_domains = repo.get_unique_domain_count(date_str)
            top_domains_raw = repo.get_top_domains(date_str, limit=10)
            all_sessions = repo.get_by_date(date_str)

        top_domains = [DomainSummaryItem(**item) for item in top_domains_raw]

        return {
            "success": True,
            "data": {
                "date": date_str,
                "total_browsing_seconds": total_duration,
                "total_unique_domains": unique_domains,
                "total_sessions_count": len(all_sessions),
                "top_domains": top_domains,
            },
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to fetch today's browser summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/browser/domains", response_model=APIResponse[BrowserDomainsData])
async def get_browser_domains(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"), limit: int = Query(20, ge=1, le=100)) -> Dict:
    """Get domain usage breakdown for a given date.

    Args:
        date: Optional date filter.
        limit: Max domains to return.

    Returns:
        BrowserDomainsData payload.
    """
    try:
        date_str = date or dt_date.today().isoformat()
        with db_manager.connection() as conn:
            repo = BrowserSessionRepository(conn)
            domains_raw = repo.get_top_domains(date_str, limit=limit)

        domain_items = [DomainSummaryItem(**item) for item in domains_raw]

        return {
            "success": True,
            "data": {
                "date": date_str,
                "count": len(domain_items),
                "domains": domain_items,
            },
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to fetch browser domains: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/youtube/today", response_model=APIResponse[YouTubeTodayData])
async def get_youtube_today(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")) -> Dict:
    """Get today's YouTube watch activity summary and top channels.

    Args:
        date: Optional date filter.

    Returns:
        YouTubeTodayData payload.
    """
    try:
        date_str = date or dt_date.today().isoformat()
        with db_manager.connection() as conn:
            repo = YouTubeRepository(conn)
            total_watch = repo.get_total_watch_time(date_str)
            video_count = repo.get_video_count(date_str)
            top_channels_raw = repo.get_top_channels(date_str, limit=10)
            all_activities = repo.get_by_date(date_str)

        top_channels = [ChannelSummaryItem(**item) for item in top_channels_raw]
        recent_videos = [
            YouTubeActivityDTO(
                id=act.id,
                video_id=act.video_id,
                video_title=act.video_title,
                channel_name=act.channel_name,
                watch_duration_seconds=act.watch_duration_seconds,
                video_category=act.video_category,
                is_productive=act.is_productive,
                started_at=act.started_at.isoformat(),
            )
            for act in all_activities[-10:]
        ]

        return {
            "success": True,
            "data": {
                "date": date_str,
                "total_watch_seconds": total_watch,
                "total_videos_count": video_count,
                "top_channels": top_channels,
                "recent_videos": recent_videos,
            },
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to fetch today's YouTube summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/youtube/channels", response_model=APIResponse[YouTubeChannelsData])
async def get_youtube_channels(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"), limit: int = Query(20, ge=1, le=100)) -> Dict:
    """Get top YouTube channels by watch time for a given date.

    Args:
        date: Optional date filter.
        limit: Max channels to return.

    Returns:
        YouTubeChannelsData payload.
    """
    try:
        date_str = date or dt_date.today().isoformat()
        with db_manager.connection() as conn:
            repo = YouTubeRepository(conn)
            channels_raw = repo.get_top_channels(date_str, limit=limit)

        channel_items = [ChannelSummaryItem(**item) for item in channels_raw]

        return {
            "success": True,
            "data": {
                "date": date_str,
                "count": len(channel_items),
                "channels": channel_items,
            },
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to fetch YouTube channels: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
