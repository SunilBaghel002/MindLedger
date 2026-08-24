"""
MindLedger - Water Hydration API Routes
FastAPI endpoints for smart water reminder status, 1-click drink logging, snooze passes, and intake history.

Author: MindLedger Team
Created: 2026-08-24
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from api.schemas import (
    APIResponse,
    WaterDrinkRequest,
    WaterDrinkResponseData,
    WaterHistoryData,
    WaterHistoryPointDTO,
    WaterSnoozeRequest,
    WaterSnoozeResponseData,
    WaterStatusData,
)
from core.hydration_scheduler import hydration_scheduler
from database.connection import db_manager
from database.repositories.water_repo import WaterRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/water", tags=["water"])


@router.get("/status", response_model=APIResponse[WaterStatusData])
async def get_water_status(
    target_date: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
) -> APIResponse[WaterStatusData]:
    """Retrieve real-time hydration countdown, daily intake, and goal progress."""
    try:
        status_dict = hydration_scheduler.get_status(target_date)
        return APIResponse(
            success=True,
            data=WaterStatusData(**status_dict),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to fetch water status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch hydration status: {e}",
        ) from e


@router.post("/drink", response_model=APIResponse[WaterDrinkResponseData])
async def log_water_drink(req: WaterDrinkRequest) -> APIResponse[WaterDrinkResponseData]:
    """Log a glass of water consumed and reset reminder countdown."""
    try:
        new_status = hydration_scheduler.drink(
            amount_ml=req.amount_ml,
            source=req.source,
        )
        return APIResponse(
            success=True,
            data=WaterDrinkResponseData(
                today_intake_ml=new_status["today_intake_ml"],
                glasses_drank=new_status["glasses_drank"],
                percentage_completed=new_status["percentage_completed"],
                message=f"Logged {req.amount_ml}ml of water!",
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to log water drink: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record water drink: {e}",
        ) from e


@router.post("/snooze", response_model=APIResponse[WaterSnoozeResponseData])
async def snooze_water_reminder(req: WaterSnoozeRequest) -> APIResponse[WaterSnoozeResponseData]:
    """Snooze the next hydration reminder by specified minutes."""
    try:
        new_status = hydration_scheduler.snooze(minutes=req.minutes)
        return APIResponse(
            success=True,
            data=WaterSnoozeResponseData(
                snoozed_minutes=req.minutes,
                next_reminder_formatted=new_status["next_reminder_formatted"],
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to snooze water reminder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to snooze hydration reminder: {e}",
        ) from e


@router.get("/history", response_model=APIResponse[WaterHistoryData])
async def get_water_history(
    days: int = Query(7, ge=1, le=30, description="Number of past days to query"),
) -> APIResponse[WaterHistoryData]:
    """Retrieve daily hydration totals for the last N days."""
    try:
        with db_manager.connection() as conn:
            repo = WaterRepository(conn)
            history_rows = repo.get_history(days=days)

        points = [
            WaterHistoryPointDTO(
                date=row["date"],
                total_ml=row["total_ml"],
                drink_count=row["drink_count"],
                daily_goal_ml=row["daily_goal_ml"] or 2000,
            )
            for row in history_rows
        ]

        return APIResponse(
            success=True,
            data=WaterHistoryData(
                days_logged=len(points),
                history=points,
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to fetch water history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch water history: {e}",
        ) from e
