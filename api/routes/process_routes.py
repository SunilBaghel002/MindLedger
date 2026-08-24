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
    AppTerminateRequest,
    AppTerminateResponseData,
    ChildProcessItemDTO,
    GroupedAppDTO,
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
    """Scan and list running OS processes with resource telemetry and grouped application trees."""
    try:
        data = process_supervisor.scan_processes(filter_type=filter_type, sort_by=sort_by)

        grouped_dto_list = []
        for g in data.get("grouped_apps", []):
            children_dtos = [ChildProcessItemDTO(**c) for c in g.get("children", [])]
            g_copy = dict(g)
            g_copy["children"] = children_dtos
            grouped_dto_list.append(GroupedAppDTO(**g_copy))

        return APIResponse(
            success=True,
            data=ProcessListResponseData(
                total_processes=data["total_processes"],
                user_processes_count=data["user_processes_count"],
                hog_count=data["hog_count"],
                total_ram_used_mb=data["total_ram_used_mb"],
                grouped_apps=grouped_dto_list,
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


@router.post("/terminate-app", response_model=APIResponse[AppTerminateResponseData])
async def terminate_application(
    req: AppTerminateRequest,
) -> APIResponse[AppTerminateResponseData]:
    """Safely terminate all worker processes of an application.

    Returns HTTP 403 if the application is a protected Windows binary.
    """
    try:
        result = process_supervisor.terminate_app(
            binary_name=req.binary_name,
            force=req.force,
        )
        return APIResponse(
            success=True,
            data=AppTerminateResponseData(**result),
            error=None,
        )
    except PermissionError as perm_err:
        logger.warning(f"Rejected kill request for protected app {req.binary_name}: {perm_err}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(perm_err),
        ) from perm_err
    except Exception as e:
        logger.error(f"Failed to terminate app {req.binary_name}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to terminate application: {e}",
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
