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
    learning_time_seconds: int = 0
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


class BatteryVitalsDTO(BaseModel):
    """Payload for battery hardware status."""

    percent: Optional[int] = 100
    is_charging: bool = True
    power_plugged: bool = True
    discharge_rate_hr: Optional[float] = None
    status_text: str = "Plugged In"


class MemoryVitalsDTO(BaseModel):
    """Payload for system memory utilization."""

    used_gb: float = 0.0
    total_gb: float = 0.0
    percent: float = 0.0


class HydrationVitalsDTO(BaseModel):
    """Payload for hydration telemetry in TopBar."""

    count: int = 0
    goal: int = 8
    volume_ml: int = 0
    next_reminder_minutes: int = 30


class LimitWarningDTO(BaseModel):
    """Payload for approaching or breached app/domain limits."""

    target_name: str
    used_seconds: int = 0
    limit_seconds: int = 0
    percent_used: float = 0.0
    is_breached: bool = False


class DashboardVitalsData(BaseModel):
    """Payload for TopBar real-time vitals telemetry."""

    is_tracking: bool = True
    current_app: Optional[str] = None
    active_session_seconds: int = 0
    screen_time_today_seconds: int = 0
    productivity_score: float = 0.0
    battery: BatteryVitalsDTO = Field(default_factory=BatteryVitalsDTO)
    memory: MemoryVitalsDTO = Field(default_factory=MemoryVitalsDTO)
    hydration: HydrationVitalsDTO = Field(default_factory=HydrationVitalsDTO)
    limits_warning: List[LimitWarningDTO] = Field(default_factory=list)



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


class SettingsData(BaseModel):
    """Payload representing application settings configuration."""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: Optional[str] = ""
    smtp_password: Optional[str] = None
    recipient_email: Optional[str] = ""
    tracking_enabled: bool = True
    tracking_mode: str = "ignore_background"  # 'ignore_background', 'record_both', 'foreground_only'
    idle_threshold_seconds: int = 300
    theme: str = "light"


class SettingsUpdateRequest(BaseModel):
    """Payload to update application settings."""

    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    recipient_email: Optional[str] = None
    tracking_enabled: Optional[bool] = None
    tracking_mode: Optional[str] = None
    idle_threshold_seconds: Optional[int] = None
    theme: Optional[str] = None


class CategoryRuleItem(BaseModel):
    """Summary item representing a category rule."""

    id: Optional[int] = None
    rule_type: str = "app"
    pattern: str
    category: str
    productivity: str = "productive"
    priority: int = 10
    is_active: bool = True


class CategoryRuleCreateRequest(BaseModel):
    """Payload to create a new category mapping rule."""

    rule_type: str = "app"
    pattern: str
    category: str
    productivity: str = "productive"
    priority: int = 10


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


class ProcessItemDTO(BaseModel):
    """Data transfer object for individual OS process telemetry."""

    pid: int
    name: str
    title: Optional[str] = None
    type: str = "user"  # "user" or "system"
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    is_background: bool = True
    background_duration_seconds: int = 0
    is_protected: bool = False
    hog_score: float = 0.0
    is_hog: bool = False
    power_impact: str = "Low"
    category: str = "Application"
    description: str = ""


class ChildProcessItemDTO(BaseModel):
    """Data transfer object for child/worker sub-process inside a grouped application."""

    pid: int
    name: str
    role: str = "Worker Process"
    memory_mb: float = 0.0
    cpu_percent: float = 0.0
    power_impact: str = "Low"
    is_protected: bool = False
    hog_score: float = 0.0


class GroupedAppDTO(BaseModel):
    """Data transfer object representing a grouped parent application with multiple child processes."""

    app_name: str
    binary_name: str
    category: str = "Application"
    description: str = ""
    total_memory_mb: float = 0.0
    total_cpu_percent: float = 0.0
    process_count: int = 1
    power_impact: str = "Low"
    hog_score: float = 0.0
    is_hog: bool = False
    is_protected: bool = False
    type: str = "user"  # "user" or "system"
    profile_info: List[str] = Field(default_factory=list)
    pids: List[int] = Field(default_factory=list)
    children: List[ChildProcessItemDTO] = Field(default_factory=list)


class ProcessListResponseData(BaseModel):
    """Payload response for process scanner query."""

    total_processes: int = 0
    user_processes_count: int = 0
    hog_count: int = 0
    total_ram_used_mb: float = 0.0
    grouped_apps: List[GroupedAppDTO] = Field(default_factory=list)
    processes: List[ProcessItemDTO] = Field(default_factory=list)


class ProcessTerminateRequest(BaseModel):
    """Request payload for terminating an active process."""

    pid: int
    process_name: Optional[str] = None
    force: bool = False


class ProcessTerminateResponseData(BaseModel):
    """Response payload for process termination."""

    pid: int
    process_name: str
    memory_freed_mb: float = 0.0
    status: str = "terminated"


class AppTerminateRequest(BaseModel):
    """Request payload for terminating all worker processes of an application."""

    binary_name: str
    force: bool = False


class AppTerminateResponseData(BaseModel):
    """Response payload for application termination."""

    app_name: str
    binary_name: str
    terminated_pids_count: int
    memory_freed_mb: float
    status: str = "terminated"


class ProcessOptimizeResponseData(BaseModel):
    """Response payload for automated background hog optimization."""

    optimized_count: int = 0
    total_memory_freed_mb: float = 0.0
    terminated_processes: List[ProcessTerminateResponseData] = Field(default_factory=list)


class BatteryStatusData(BaseModel):
    """Payload for battery status query."""

    is_battery_present: bool = True
    percent: int = 100
    is_plugged: bool = True
    charging_status: str = "Plugged In"
    time_remaining_formatted: str = "Unlimited"
    seconds_left: Optional[int] = None
    discharge_rate_percent_per_hour: Optional[float] = None


class BatteryHealthData(BaseModel):
    """Payload for battery hardware health query."""

    is_battery_present: bool = True
    current_percentage: int = 100
    is_charging: bool = True
    design_capacity_mwh: Optional[int] = None
    full_charge_capacity_mwh: Optional[int] = None
    wear_level_percent: float = 0.0
    cycle_count: Optional[int] = None
    power_profile: str = "Balanced"


class BatteryHistoryPointDTO(BaseModel):
    """Data point representation for battery discharge time-series."""

    timestamp: str
    percent: int
    is_plugged: bool
    discharge_rate: Optional[float] = None
    top_drainer: Optional[str] = None


class BatteryHistoryData(BaseModel):
    """Payload for battery history time-series query."""

    date: str
    points: List[BatteryHistoryPointDTO] = Field(default_factory=list)


class PowerDrainerDTO(BaseModel):
    """Data transfer object for energy consuming application."""

    pid: int
    name: str
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    energy_score: float = 0.0
    power_impact: str = "Low"


class PowerDrainersData(BaseModel):
    """Payload for energy drainers leaderboard."""

    count: int = 0
    drainers: List[PowerDrainerDTO] = Field(default_factory=list)


class AppLimitDTO(BaseModel):
    """Data transfer object for application or domain limit configuration and status."""

    id: int
    target_type: str  # "app" or "domain"
    target_identifier: str
    display_name: str
    daily_limit_minutes: int
    warning_threshold_minutes: Optional[int] = None
    is_hard_block: bool = False
    is_active: bool = True
    max_snoozes_per_day: int = 2
    effective_limit_minutes: int = 0
    used_seconds: int = 0
    used_minutes: float = 0.0
    remaining_minutes: int = 0
    percentage_used: float = 0.0
    status: str = "normal"  # "normal", "warning", "critical", "exceeded"
    snoozes_used: int = 0
    snoozes_remaining: int = 2


class AppLimitCreateRequest(BaseModel):
    """Request payload for creating a new usage limit rule."""

    target_type: str  # "app" or "domain"
    target_identifier: str
    display_name: str
    daily_limit_minutes: int = Field(ge=1, le=1440)
    is_hard_block: bool = False
    warning_threshold_minutes: Optional[int] = None


class AppLimitUpdateRequest(BaseModel):
    """Request payload for updating limit rule properties."""

    daily_limit_minutes: Optional[int] = Field(None, ge=1, le=1440)
    warning_threshold_minutes: Optional[int] = None
    is_hard_block: Optional[bool] = None
    is_active: Optional[bool] = None


class AppLimitListResponseData(BaseModel):
    """Payload for listing all configured limits."""

    count: int = 0
    limits: List[AppLimitDTO] = Field(default_factory=list)


class AppLimitSnoozeResponseData(BaseModel):
    """Response payload for snooze emergency pass."""

    limit_id: int
    display_name: str
    added_minutes: int = 5
    effective_limit_minutes: int
    snoozes_used: int
    snoozes_remaining: int
    status: str


class WaterStatusData(BaseModel):
    """Payload for hydration status query."""

    enabled: bool = True
    mode: str = "smart"  # "smart" or "custom"
    next_reminder_seconds: int = 0
    next_reminder_formatted: str = "0m"
    today_intake_ml: int = 0
    daily_goal_ml: int = 2000
    glasses_drank: int = 0
    target_glasses: int = 8
    percentage_completed: float = 0.0
    last_drank_at: Optional[str] = None


class WaterDrinkRequest(BaseModel):
    """Request payload for logging a glass of water."""

    amount_ml: int = Field(250, ge=50, le=2000)
    source: str = "dashboard_widget"


class WaterDrinkResponseData(BaseModel):
    """Response payload for logging water drink."""

    today_intake_ml: int
    glasses_drank: int
    percentage_completed: float
    message: str = "Hydration logged successfully!"


class WaterSnoozeRequest(BaseModel):
    """Request payload for snoozing water reminder."""

    minutes: int = Field(10, ge=1, le=120)


class WaterSnoozeResponseData(BaseModel):
    """Response payload for snoozing water reminder."""

    snoozed_minutes: int
    next_reminder_formatted: str


class WaterHistoryPointDTO(BaseModel):
    """Data point representation for daily hydration intake history."""

    date: str
    total_ml: int
    drink_count: int
    daily_goal_ml: int


class WaterHistoryData(BaseModel):
    """Payload for water history query."""

    days_logged: int
    history: List[WaterHistoryPointDTO] = Field(default_factory=list)





