"""
MindLedger - API Request/Response Schemas
Pydantic v2 data models for API response envelopes, dashboard data, health check, and app usage details.

Author: MindLedger Team
Created: 2026-08-08
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

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


class DashboardTodayData(BaseModel):
    """Payload for today's dashboard overview."""

    date: str
    total_screen_time_seconds: int = 0
    productive_time_seconds: int = 0
    unproductive_time_seconds: int = 0
    neutral_time_seconds: int = 0
    productivity_score: float = 0.0
    top_apps: List[AppUsageSummaryItem] = Field(default_factory=list)


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
