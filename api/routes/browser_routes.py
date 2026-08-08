"""
MindLedger - Browser & YouTube Event API Routes
FastAPI router for receiving tracking events sent by the Chrome extension.

Author: MindLedger Team
Created: 2026-08-08
"""

from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException

from api.schemas import APIResponse, BrowserEventSchema, EventRecordedData, YouTubeEventSchema
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

router = APIRouter(prefix="/api/v1/events", tags=["browser"])
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


@router.post("/browser", response_model=APIResponse[EventRecordedData])
async def receive_browser_event(event: BrowserEventSchema) -> Dict:
    """Receive a browser tab session event from the Chrome extension.

    Args:
        event: Browser event schema payload.

    Returns:
        Confirmation response envelope with inserted record ID.
    """
    logger.debug(f"Received browser event: url={event.url}, domain={event.domain}, duration={event.duration_seconds}s")

    try:
        # Parse timestamps
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

        with db_manager.get_connection() as conn:
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


@router.post("/youtube", response_model=APIResponse[EventRecordedData])
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

        with db_manager.get_connection() as conn:
            repo = YouTubeRepository(conn)
            activity_id = repo.save(activity)
            conn.commit()

        return {
            "success": True,
            "data": {"id": activity_id},
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to record YouTube event: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record YouTube event: {str(e)}")
