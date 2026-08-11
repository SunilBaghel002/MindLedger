"""
MindLedger - Cloud Sync Manager
Optional synchronization engine for backing up aggregated daily summaries to cloud endpoints (Supabase / PostgreSQL REST).

Author: MindLedger Team
Created: 2026-08-11
"""

import json
import sqlite3
from typing import Any, Dict, Optional

import httpx

from utils.logger import get_logger

logger = get_logger(__name__)


class CloudSyncManager:
    """Manages optional remote synchronization of daily aggregated productivity summaries."""

    def sync_daily_summaries(
        self,
        conn: sqlite3.Connection,
        cloud_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sync unsynced daily summary records to remote REST endpoint.

        Args:
            conn: Active sqlite3 connection.
            cloud_url: Remote REST API URL or Supabase table endpoint.
            api_key: Secret API key or Bearer token.

        Returns:
            Dict containing sync status metrics.
        """
        if not cloud_url:
            return {"status": "disabled", "synced_count": 0, "message": "Cloud sync URL not configured."}

        cursor = conn.execute("SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 30;")
        rows = [dict(row) for row in cursor.fetchall()]

        if not rows:
            return {"status": "success", "synced_count": 0, "message": "No summary records to sync."}

        headers = {
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
        if api_key:
            headers["apikey"] = api_key
            headers["Authorization"] = f"Bearer {api_key}"

        synced_count = 0
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(cloud_url, json=rows, headers=headers)
                if response.status_code in (200, 201, 204):
                    synced_count = len(rows)
                    logger.info(f"Cloud sync uploaded {synced_count} summary records to {cloud_url}")
                    return {"status": "success", "synced_count": synced_count, "message": "Cloud sync completed successfully."}
                else:
                    logger.warning(f"Cloud sync API returned status {response.status_code}: {response.text}")
                    return {"status": "error", "synced_count": 0, "error": f"API error HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"Cloud sync failed: {e}")
            return {"status": "error", "synced_count": 0, "error": str(e)}


# Singleton CloudSyncManager instance
cloud_sync_manager = CloudSyncManager()
