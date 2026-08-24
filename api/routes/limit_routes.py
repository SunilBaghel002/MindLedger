"""
MindLedger - App & Website Limits API Routes
FastAPI endpoints for daily screen time limits, progressive warnings, and emergency snoozes.

Author: MindLedger Team
Created: 2026-08-24
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Path, Query, status

from api.schemas import (
    APIResponse,
    AppLimitCreateRequest,
    AppLimitDTO,
    AppLimitListResponseData,
    AppLimitSnoozeResponseData,
    AppLimitUpdateRequest,
)
from core.limit_engine import limit_engine
from database.connection import db_manager
from database.repositories.limit_repo import LimitRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/limits", tags=["limits"])


@router.get("", response_model=APIResponse[AppLimitListResponseData])
@router.get("/", response_model=APIResponse[AppLimitListResponseData], include_in_schema=False)
async def get_limits(
    target_date: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
) -> APIResponse[AppLimitListResponseData]:
    """Retrieve all configured limits with today's real-time usage metrics."""
    try:
        limits = limit_engine.get_all_limits_with_status(target_date=target_date)
        return APIResponse(
            success=True,
            data=AppLimitListResponseData(
                count=len(limits),
                limits=[AppLimitDTO(**lim) for lim in limits],
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to fetch limits: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch limits: {e}",
        ) from e


@router.post("", response_model=APIResponse[AppLimitDTO], status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=APIResponse[AppLimitDTO], status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_limit(req: AppLimitCreateRequest) -> APIResponse[AppLimitDTO]:
    """Create a new daily limit rule for an app or website domain."""
    try:
        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            existing = repo.get_limit_by_target(req.target_type, req.target_identifier)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A limit for '{req.target_identifier}' already exists.",
                )

            limit_id = repo.create_limit(
                target_type=req.target_type,
                target_identifier=req.target_identifier,
                display_name=req.display_name,
                daily_limit_minutes=req.daily_limit_minutes,
                is_hard_block=req.is_hard_block,
                warning_threshold_minutes=req.warning_threshold_minutes,
            )

        all_limits = limit_engine.get_all_limits_with_status()
        created = next((l for l in all_limits if l["id"] == limit_id), None)

        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created limit.",
            )

        return APIResponse(
            success=True,
            data=AppLimitDTO(**created),
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create limit: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create limit: {e}",
        ) from e


@router.put("/{limit_id}", response_model=APIResponse[AppLimitDTO])
async def update_limit(
    limit_id: int = Path(..., description="Limit ID"),
    req: AppLimitUpdateRequest = ...,
) -> APIResponse[AppLimitDTO]:
    """Update limit duration or active state."""
    try:
        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            updated = repo.update_limit(
                limit_id=limit_id,
                daily_limit_minutes=req.daily_limit_minutes,
                warning_threshold_minutes=req.warning_threshold_minutes,
                is_hard_block=req.is_hard_block,
                is_active=req.is_active,
            )
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Limit ID {limit_id} not found.",
                )

        all_limits = limit_engine.get_all_limits_with_status()
        item = next((l for l in all_limits if l["id"] == limit_id), None)

        return APIResponse(
            success=True,
            data=AppLimitDTO(**item),
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update limit ID {limit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update limit: {e}",
        ) from e


@router.delete("/{limit_id}", response_model=APIResponse[dict])
async def delete_limit(
    limit_id: int = Path(..., description="Limit ID"),
) -> APIResponse[dict]:
    """Delete a limit rule."""
    try:
        with db_manager.connection() as conn:
            repo = LimitRepository(conn)
            deleted = repo.delete_limit(limit_id)
            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Limit ID {limit_id} not found.",
                )

        return APIResponse(
            success=True,
            data={"limit_id": limit_id, "deleted": True},
            error=None,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete limit ID {limit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete limit: {e}",
        ) from e


@router.post("/{limit_id}/snooze", response_model=APIResponse[AppLimitSnoozeResponseData])
async def snooze_limit(
    limit_id: int = Path(..., description="Limit ID"),
) -> APIResponse[AppLimitSnoozeResponseData]:
    """Grant an emergency +5 minute extension for a limit rule."""
    try:
        result = limit_engine.snooze(limit_id)
        return APIResponse(
            success=True,
            data=AppLimitSnoozeResponseData(
                limit_id=result["limit_id"],
                display_name=result["display_name"],
                added_minutes=result["added_minutes"],
                effective_limit_minutes=result["effective_limit_minutes"],
                snoozes_used=result["snoozes_used"],
                snoozes_remaining=result["snoozes_remaining"],
                status=result["status"],
            ),
            error=None,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        ) from val_err
    except Exception as e:
        logger.error(f"Failed to snooze limit ID {limit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to snooze limit: {e}",
        ) from e
