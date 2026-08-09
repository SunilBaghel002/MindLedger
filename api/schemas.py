"""
MindLedger - API Request/Response Schemas
Pydantic v2 data models for API response envelopes, dashboard data, health check, browser events, YouTube events, and data retrieval payloads.

Author: MindLedger Team
Created: 2026-08-08
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standardized API Response envelope for all endpoints."""

    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None


class HealthData(BaseModel):
    """Payload for health check endpoint."""

    status: str = "ok"
    app: str = "MindLedger"
    version: str = "0.1.0"


class AppUsageSummaryItem(BaseModel):
    """Summary representation of an application's usage duration."""

    app_name: str
    category: str
    productivity: str
    total_seconds: int


class HourlyActivityTimelineDTO(BaseModel):
    """Payload for hourly activity breakdown chart."""

    labels: List[str] = Field(default_factory=list)
    productive: List[int] = Field(default_factory=list)
    neutral: List[int] = Field(default_factory=list)
    unproductive: List[int] = Field(default_factory=list)


class QuickStatsDTO(BaseModel):
    """Payload for quick insights and statistics."""

    peak_hour: Optional[str] = None
    focus_ratio_pct: float = 0.0
    top_category: Optional[str] = None


class DomainSummaryItem(BaseModel):
    """Summary representation of domain duration and classification."""

    domain: str
    category: str
    productivity: str
    total_seconds: int


class DashboardTodayData(BaseModel):
    """Payload for today's dashboard overview."""

    date: str
    total_screen_time_seconds: int = 0
    productive_time_seconds: int = 0
    unproductive_time_seconds: int = 0
    neutral_time_seconds: int = 0
    productivity_score: float = 0.0
    top_apps: List[AppUsageSummaryItem] = Field(default_factory=list)
    top_websites: List[DomainSummaryItem] = Field(default_factory=list)
    timeline: Optional[HourlyActivityTimelineDTO] = None
    quick_stats: Optional[QuickStatsDTO] = None


class LiveTrackingStatusData(BaseModel):
    """Payload for live active window tracking status query."""

    is_tracking: bool = True
    current_app: Optional[str] = None
    window_title: Optional[str] = None
    started_at: Optional[str] = None
    duration_seconds: int = 0
    is_idle: bool = False


class AppSessionDTO(BaseModel):
    """Data transfer object for individual application tracking session."""

    id: Optional[int] = None
    app_name: str
    window_title: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int = 0
    category: str
    productivity: str


class AppsTodayData(BaseModel):
    """Payload for today's application usage details."""

    date: str
    total_sessions_count: int = 0
    total_screen_time_seconds: int = 0
    top_apps: List[AppUsageSummaryItem] = Field(default_factory=list)
    recent_sessions: List[AppSessionDTO] = Field(default_factory=list)


class AppTrendItem(BaseModel):
    """Daily trend data point for application usage."""

    date: str
    total_seconds: int = 0


class AppAnalyticsData(BaseModel):
    """Payload for application usage analytics and history."""

    date_range: str
    total_screen_time_seconds: int = 0
    total_apps_count: int = 0
    top_apps: List[AppUsageSummaryItem] = Field(default_factory=list)
    category_breakdown: Dict[str, int] = Field(default_factory=dict)
    trend: List[AppTrendItem] = Field(default_factory=list)


class BrowserEventSchema(BaseModel):
    """Payload sent by Chrome extension for browser tab tracking events."""

    url: str
    domain: str
    title: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: int = 0
    tab_id: Optional[int] = None


class YouTubeEventSchema(BaseModel):
    """Payload sent by Chrome extension for YouTube video watch events."""

    type: Optional[str] = "YOUTUBE_EVENT"
    video_id: str
    video_title: Optional[str] = None
    channel_name: Optional[str] = None
    channel_url: Optional[str] = None
    video_url: Optional[str] = None
    is_short: bool = False
    watch_duration_seconds: int = 0
    video_duration_seconds: int = 0
    timestamp: Optional[str] = None


class EventRecordedData(BaseModel):
    """Payload response confirming an event was saved."""

    id: int


class BrowserTodayData(BaseModel):
    """Payload for today's browser tracking analytics."""

    date: str
    total_browsing_seconds: int = 0
    total_unique_domains: int = 0
    total_sessions_count: int = 0
    top_domains: List[DomainSummaryItem] = Field(default_factory=list)


class URLDetailItem(BaseModel):
    """Detailed information for specific URL visited under a domain."""

    url: str
    page_title: Optional[str] = None
    total_seconds: int = 0
    visit_count: int = 0


class BrowserDomainSummaryItem(BaseModel):
    """Summary representation of domain duration, classification, and visit count."""

    domain: str
    category: str
    productivity: str
    total_seconds: int = 0
    visit_count: int = 0


class BrowserAnalyticsData(BaseModel):
    """Payload for browser usage analytics and history."""

    date_range: str
    total_browsing_seconds: int = 0
    unique_domains_count: int = 0
    top_domains: List[BrowserDomainSummaryItem] = Field(default_factory=list)
    category_breakdown: Dict[str, int] = Field(default_factory=dict)


class BrowserDomainsData(BaseModel):
    """Payload for domain breakdown list."""

    date: str
    count: int = 0
    domains: List[DomainSummaryItem] = Field(default_factory=list)


class ChannelSummaryItem(BaseModel):
    """Summary representation of channel watch duration."""

    channel_name: str
    channel_url: Optional[str] = None
    total_videos: int = 0
    total_seconds: int = 0


class YouTubeActivityDTO(BaseModel):
    """DTO for individual YouTube watch activity."""

    id: Optional[int] = None
    video_id: Optional[str] = None
    video_title: Optional[str] = None
    channel_name: Optional[str] = None
    watch_duration_seconds: int = 0
    video_category: str = "uncategorized"
    is_productive: Optional[bool] = None
    started_at: str


class YouTubeTodayData(BaseModel):
    """Payload for today's YouTube watch analytics."""

    date: str
    total_watch_seconds: int = 0
    total_videos_count: int = 0
    top_channels: List[ChannelSummaryItem] = Field(default_factory=list)
    recent_videos: List[YouTubeActivityDTO] = Field(default_factory=list)


class YouTubeChannelSummaryItem(BaseModel):
    """Summary representation of channel watch duration and category."""

    channel_name: str
    channel_url: Optional[str] = None
    video_category: Optional[str] = "uncategorized"
    total_videos: int = 0
    total_seconds: int = 0


class YouTubeVideoHistoryItem(BaseModel):
    """Detailed item for searchable YouTube video watch history."""

    id: int
    video_id: Optional[str] = None
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    channel_name: Optional[str] = None
    watch_duration_seconds: int = 0
    video_category: str = "uncategorized"
    is_productive: Optional[bool] = None
    is_short: bool = False
    date: str
    started_at: str


class YouTubeAnalyticsData(BaseModel):
    """Payload for YouTube watch analytics and video history."""

    date_range: str
    total_watch_seconds: int = 0
    productive_watch_seconds: int = 0
    entertainment_watch_seconds: int = 0
    shorts_watch_seconds: int = 0
    longform_watch_seconds: int = 0
    shorts_ratio_pct: float = 0.0
    channels_count: int = 0
    top_channels: List[YouTubeChannelSummaryItem] = Field(default_factory=list)
    category_breakdown: Dict[str, int] = Field(default_factory=dict)
    history: List[YouTubeVideoHistoryItem] = Field(default_factory=list)


class ReportGenerateRequest(BaseModel):
    """Payload to trigger report generation and optional email delivery."""

    report_type: str = "daily"
    date: str
    send_email: bool = False
    recipient: Optional[str] = None


class ReportSummaryItem(BaseModel):
    """Summary record item for reports history and archive."""

    id: Optional[int] = None
    report_type: str
    period_label: str
    date: str
    total_screen_time_seconds: int = 0
    productivity_score: float = 0.0
    email_sent: bool = False
    most_used_app: Optional[str] = None


class ReportHistoryData(BaseModel):
    """Payload containing list of all generated reports."""

    reports: List[ReportSummaryItem] = Field(default_factory=list)


class YouTubeChannelsData(BaseModel):
    """Payload for YouTube channels breakdown list."""

    date: str
    count: int = 0
    channels: List[ChannelSummaryItem] = Field(default_factory=list)


from datetime import datetime

ALLOWED_RULE_TYPES = {"app", "domain", "url_pattern", "title_pattern", "youtube_channel"}
ALLOWED_PRODUCTIVITY_LEVELS = {"productive", "neutral", "unproductive"}


class CategoryRuleDTO(BaseModel):
    """Data transfer object representing a classification rule."""

    id: Optional[int] = None
    rule_type: str
    pattern: str
    category: str
    subcategory: Optional[str] = None
    productivity: str
    priority: int = 0
    is_active: bool = True


class CategoryRuleCreate(BaseModel):
    """Payload schema for adding a new classification rule."""

    rule_type: str  # 'app', 'domain', 'url_pattern', 'title_pattern', 'youtube_channel'
    pattern: str
    category: str
    subcategory: Optional[str] = None
    productivity: str  # 'productive', 'neutral', 'unproductive'
    priority: int = 0
    is_active: bool = True

    @field_validator("rule_type")
    @classmethod
    def validate_rule_type(cls, v: str) -> str:
        s = v.strip()
        if not s or s not in ALLOWED_RULE_TYPES:
            raise ValueError(f"rule_type must be one of {sorted(ALLOWED_RULE_TYPES)}")
        return s

    @field_validator("productivity")
    @classmethod
    def validate_productivity(cls, v: str) -> str:
        s = v.strip()
        if not s or s not in ALLOWED_PRODUCTIVITY_LEVELS:
            raise ValueError(f"productivity must be one of {sorted(ALLOWED_PRODUCTIVITY_LEVELS)}")
        return s

    @field_validator("pattern", "category")
    @classmethod
    def validate_nonblank(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be blank")
        return s


class CategoryRuleUpdate(BaseModel):
    """Payload schema for updating an existing classification rule."""

    rule_type: Optional[str] = None
    pattern: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    productivity: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("rule_type")
    @classmethod
    def validate_rule_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s or s not in ALLOWED_RULE_TYPES:
            raise ValueError(f"rule_type must be one of {sorted(ALLOWED_RULE_TYPES)}")
        return s

    @field_validator("productivity")
    @classmethod
    def validate_productivity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s or s not in ALLOWED_PRODUCTIVITY_LEVELS:
            raise ValueError(f"productivity must be one of {sorted(ALLOWED_PRODUCTIVITY_LEVELS)}")
        return s

    @field_validator("pattern", "category")
    @classmethod
    def validate_nonblank_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be blank")
        return s


class CategoryRulesListData(BaseModel):
    """Payload for listing category rules."""

    count: int = 0
    rules: List[CategoryRuleDTO] = Field(default_factory=list)


class ReclassifyRequest(BaseModel):
    """Payload schema for requesting historical data re-classification."""

    from_date: Optional[str] = None  # YYYY-MM-DD
    to_date: Optional[str] = None    # YYYY-MM-DD

    @field_validator("from_date", "to_date")
    @classmethod
    def validate_iso_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        try:
            datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
        return s

    @model_validator(mode="after")
    def validate_date_range(self) -> "ReclassifyRequest":
        if self.from_date and self.to_date:
            d_from = datetime.strptime(self.from_date, "%Y-%m-%d")
            d_to = datetime.strptime(self.to_date, "%Y-%m-%d")
            if d_from > d_to:
                raise ValueError("from_date cannot be later than to_date")
        return self


class ReclassifyResultData(BaseModel):
    """Payload schema summarizing historical re-classification results."""

    reclassified_app_sessions: int = 0
    reclassified_browser_sessions: int = 0
    reclassified_youtube_activities: int = 0
    updated_daily_summaries: int = 0

