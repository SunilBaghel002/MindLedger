"""
MindLedger - Process Management API Routes
FastAPI endpoints for background process monitoring, resource hog detection, and safe process termination.

Author: MindLedger Team
Created: 2026-08-24
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
import psutil

from api.schemas import (
    APIResponse,
    ProcessItemDTO,
    ProcessListResponseData,
    ProcessOptimizeResponseData,
    ProcessTerminateRequest,
    ProcessTerminateResponseData,
)
from core.process_supervisor import process_supervisor
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/processes", tags=["processes"])


@router.get("", response_model=APIResponse[ProcessListResponseData])
@router.get("/", response_model=APIResponse[ProcessListResponseData], include_in_schema=False)
async def get_processes(
    filter_type: str = Query("user", alias="filter", description="Process filter: 'all', 'user', 'hogs', 'system'"),
    sort_by: str = Query("memory", description="Sort by: 'memory', 'cpu', 'hog_score', 'name'"),
) -> APIResponse[ProcessListResponseData]:
    """Scan and list running OS processes with resource telemetry and hog scoring."""
    try:
        data = process_supervisor.scan_processes(filter_type=filter_type, sort_by=sort_by)
        return APIResponse(
            success=True,
            data=ProcessListResponseData(
                total_processes=data["total_processes"],
                user_processes_count=data["user_processes_count"],
                hog_count=data["hog_count"],
                total_ram_used_mb=data["total_ram_used_mb"],
                processes=[ProcessItemDTO(**p) for p in data["processes"]],
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to scan processes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan running processes: {e}",
        ) from e


@router.post("/terminate", response_model=APIResponse[ProcessTerminateResponseData])
async def terminate_process(
    req: ProcessTerminateRequest,
) -> APIResponse[ProcessTerminateResponseData]:
    """Safely terminate a running process with system protection guardrails.

    Returns HTTP 403 if the process is a protected Windows binary.
    """
    try:
        result = process_supervisor.terminate_process(
            pid=req.pid,
            process_name=req.process_name,
            force=req.force,
        )
        return APIResponse(
            success=True,
            data=ProcessTerminateResponseData(**result),
            error=None,
        )
    except PermissionError as perm_err:
        logger.warning(f"Rejected kill request for protected PID {req.pid}: {perm_err}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(perm_err),
        ) from perm_err
    except psutil.NoSuchProcess as not_found_err:
        logger.warning(f"Process PID {req.pid} not found: {not_found_err}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process with PID {req.pid} is no longer running.",
        ) from not_found_err
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        ) from val_err
    except Exception as e:
        logger.error(f"Failed to terminate PID {req.pid}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to terminate process: {e}",
        ) from e


@router.post("/optimize", response_model=APIResponse[ProcessOptimizeResponseData])
async def optimize_processes(
    min_score: float = Query(15.0, description="Minimum Resource Hog score threshold"),
) -> APIResponse[ProcessOptimizeResponseData]:
    """Automatically optimize and terminate idle background resource hogs."""
    try:
        result = process_supervisor.optimize_idle_processes(min_hog_score=min_score)
        return APIResponse(
            success=True,
            data=ProcessOptimizeResponseData(
                optimized_count=result["optimized_count"],
                total_memory_freed_mb=result["total_memory_freed_mb"],
                terminated_processes=[
                    ProcessTerminateResponseData(**p) for p in result["terminated_processes"]
                ],
            ),
            error=None,
        )
    except Exception as e:
        logger.error(f"Failed to optimize idle processes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize background processes: {e}",
        ) from e
