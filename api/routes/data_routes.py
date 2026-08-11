"""
MindLedger - Data Management API Routes
Endpoints serving data export (JSON/CSV), JSON data import, live database backup, legacy data archival & cleanup, and cloud sync.

Author: MindLedger Team
Created: 2026-08-11
"""

import os
from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import HTMLResponse, Response

from api.schemas import APIResponse
from database.connection import db_manager
from utils.cloud_sync import cloud_sync_manager
from utils.data_manager import data_manager
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/data", tags=["data_management"])


@router.get("/export")
async def export_data(
    format: str = Query("json", pattern=r"^(json|csv)$"),
    table: str = Query("app_sessions"),
):

    """Export tracking dataset as JSON file or CSV file attachment."""
    try:
        with db_manager.connection() as conn:
            if format == "csv":
                csv_str = data_manager.export_csv(conn, table_name=table)
                filename = f"mindledger_{table}_{date.today().isoformat()}.csv"
                return Response(
                    content=csv_str,
                    media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )
            else:
                json_str = data_manager.export_json(conn)
                filename = f"mindledger_backup_{date.today().isoformat()}.json"
                return Response(
                    content=json_str,
                    media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'},
                )
    except Exception as e:
        logger.error(f"Data export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data export failed: {str(e)}") from e


@router.post("/import", response_model=APIResponse[Dict[str, int]])
async def import_data(payload: Dict[str, Any] = Body(...)) -> APIResponse[Dict[str, int]]:
    """Import structured JSON dataset into SQLite database."""
    try:
        json_str = json.dumps(payload)
        with db_manager.connection() as conn:
            imported_counts = data_manager.import_json(conn, json_str)
        return APIResponse(success=True, data=imported_counts, error=None)
    except Exception as e:
        logger.error(f"Data import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data import failed: {str(e)}") from e


@router.post("/backup", response_model=APIResponse[Dict[str, str]])
async def create_backup() -> APIResponse[Dict[str, str]]:
    """Trigger online SQLite database backup file creation."""
    try:
        backup_filename = f"mindledger_backup_{date.today().isoformat()}.db.bak"
        backup_path = os.path.join("logs", "backups", backup_filename)

        with db_manager.connection() as conn:
            actual_path = data_manager.create_database_backup(conn, backup_path)

        return APIResponse(
            success=True,
            data={"backup_path": actual_path, "filename": backup_filename},
            error=None,
        )
    except Exception as e:
        logger.error(f"Database backup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database backup failed: {str(e)}") from e


@router.post("/cleanup", response_model=APIResponse[Dict[str, Any]])
async def archive_and_cleanup_data(
    months_to_keep: int = Query(6, ge=1, le=36),
) -> APIResponse[Dict[str, Any]]:
    """Archive granular tracking sessions older than months_to_keep into ZIP file and delete raw entries."""
    try:
        archive_dir = os.path.join("logs", "archives")
        with db_manager.connection() as conn:
            res = data_manager.archive_and_cleanup(conn, archive_dir, months_to_keep=months_to_keep)
        return APIResponse(success=True, data=res, error=None)
    except Exception as e:
        logger.error(f"Data cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data cleanup failed: {str(e)}") from e


@router.post("/sync", response_model=APIResponse[Dict[str, Any]])
async def sync_data_to_cloud(
    cloud_url: Optional[str] = Query(None),
    api_key: Optional[str] = Query(None),
) -> APIResponse[Dict[str, Any]]:
    """Trigger optional cloud sync uploading daily summary records to remote REST endpoint."""
    try:
        with db_manager.connection() as conn:
            res = cloud_sync_manager.sync_daily_summaries(conn, cloud_url=cloud_url, api_key=api_key)
        return APIResponse(success=res["status"] == "success", data=res, error=res.get("error"))
    except Exception as e:
        logger.error(f"Cloud sync request failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cloud sync failed: {str(e)}") from e
