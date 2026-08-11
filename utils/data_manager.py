"""
MindLedger - Data Manager
Comprehensive data management utility handling JSON/CSV export, JSON import, database backup automation, data archival, and legacy session cleanup.

Author: MindLedger Team
Created: 2026-08-11
"""

import csv
import io
import json
import os
import sqlite3
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from utils.logger import get_logger

logger = get_logger(__name__)


class DataManager:
    """Provides methods for exporting, importing, backing up, archiving, and cleaning up MindLedger data."""

    def export_json(self, conn: sqlite3.Connection) -> str:
        """Export all tracking sessions, summaries, and rules into a structured JSON string.

        Args:
            conn: Active sqlite3 connection.

        Returns:
            JSON string containing all exported dataset tables.
        """
        tables = [
            "app_sessions",
            "browser_sessions",
            "youtube_activity",
            "daily_summaries",
            "periodic_summaries",
            "category_rules",
            "settings",
        ]
        export_data: Dict[str, List[Dict[str, Any]]] = {}

        for table in tables:
            cursor = conn.execute(f"SELECT * FROM {table};")
            export_data[table] = [dict(row) for row in cursor.fetchall()]

        meta = {
            "version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "data": export_data,
        }
        return json.dumps(meta, indent=2)

    def export_csv(self, conn: sqlite3.Connection, table_name: str) -> str:
        """Export a specific database table to CSV string format.

        Args:
            conn: Active sqlite3 connection.
            table_name: Name of target table e.g. 'app_sessions'.

        Returns:
            Formatted CSV text string.

        Raises:
            ValueError: If table_name is invalid.
        """
        valid_tables = {
            "app_sessions",
            "browser_sessions",
            "youtube_activity",
            "daily_summaries",
            "periodic_summaries",
            "category_rules",
        }
        if table_name not in valid_tables:
            raise ValueError(f"Invalid export table: {table_name}. Allowed: {valid_tables}")

        cursor = conn.execute(f"SELECT * FROM {table_name};")
        rows = cursor.fetchall()
        if not rows:
            return ""

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(rows[0].keys())  # Header row
        for row in rows:
            writer.writerow(list(row))

        return output.getvalue()

    def import_json(self, conn: sqlite3.Connection, json_str: str) -> Dict[str, int]:
        """Import structured JSON dataset into SQLite database using parameterized queries.

        Args:
            conn: Active sqlite3 connection.
            json_str: JSON string matching export schema.

        Returns:
            Dict mapping table names to count of imported records.
        """
        payload = json.loads(json_str)
        data = payload.get("data", payload)
        counts: Dict[str, int] = {}

        # Import Category Rules
        rules = data.get("category_rules", [])
        rule_count = 0
        for r in rules:
            try:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO category_rules
                    (rule_type, pattern, category, subcategory, productivity, priority, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        r["rule_type"],
                        r["pattern"],
                        r["category"],
                        r.get("subcategory"),
                        r["productivity"],
                        r.get("priority", 0),
                        1 if r.get("is_active", True) else 0,
                    ),
                )
                rule_count += 1
            except sqlite3.Error as e:
                logger.warning(f"Error importing category rule {r}: {e}")
        counts["category_rules"] = rule_count

        # Import App Sessions
        app_sessions = data.get("app_sessions", [])
        app_count = 0
        for s in app_sessions:
            try:
                conn.execute(
                    """
                    INSERT INTO app_sessions
                    (app_name, app_path, window_title, started_at, ended_at, duration_seconds, is_foreground, category, subcategory, productivity, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        s["app_name"],
                        s.get("app_path"),
                        s.get("window_title"),
                        s["started_at"],
                        s.get("ended_at"),
                        s.get("duration_seconds", 0),
                        1 if s.get("is_foreground", True) else 0,
                        s.get("category", "uncategorized"),
                        s.get("subcategory"),
                        s.get("productivity", "neutral"),
                        s["date"],
                    ),
                )
                app_count += 1
            except sqlite3.Error as e:
                logger.warning(f"Error importing app session {s}: {e}")
        counts["app_sessions"] = app_count

        # Import Browser Sessions
        browser_sessions = data.get("browser_sessions", [])
        browser_count = 0
        for b in browser_sessions:
            try:
                conn.execute(
                    """
                    INSERT INTO browser_sessions
                    (url, domain, page_title, tab_id, started_at, ended_at, duration_seconds, is_active, category, subcategory, productivity, date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        b["url"],
                        b["domain"],
                        b.get("page_title"),
                        b.get("tab_id"),
                        b["started_at"],
                        b.get("ended_at"),
                        b.get("duration_seconds", 0),
                        1 if b.get("is_active", True) else 0,
                        b.get("category", "uncategorized"),
                        b.get("subcategory"),
                        b.get("productivity", "neutral"),
                        b["date"],
                    ),
                )
                browser_count += 1
            except sqlite3.Error as e:
                logger.warning(f"Error importing browser session {b}: {e}")
        counts["browser_sessions"] = browser_count

        conn.commit()
        return counts

    def create_database_backup(self, src_conn: sqlite3.Connection, backup_path: str) -> str:
        """Create a consistent online SQLite database backup file using native backup API.

        Args:
            src_conn: Active source sqlite3 connection.
            backup_path: Target output path for .db.bak file.

        Returns:
            Absolute path to generated backup file.
        """
        backup_dir = Path(backup_path).parent
        if backup_dir and not backup_dir.exists():
            backup_dir.mkdir(parents=True, exist_ok=True)

        dest_conn = sqlite3.connect(backup_path)
        try:
            with dest_conn:
                src_conn.backup(dest_conn)
            logger.info(f"Database backup created successfully at: {backup_path}")
        finally:
            dest_conn.close()

        return str(Path(backup_path).resolve())

    def archive_and_cleanup(
        self, conn: sqlite3.Connection, archive_dir: str, months_to_keep: int = 6
    ) -> Dict[str, Any]:
        """Compress raw tracking sessions older than months_to_keep into a ZIP archive and delete raw rows.

        Args:
            conn: Active sqlite3 connection.
            archive_dir: Directory where ZIP archives are stored.
            months_to_keep: Months of raw granular session data to retain.

        Returns:
            Dict containing count of archived and cleaned rows, and archive zip path.
        """
        cutoff_date = (datetime.now() - timedelta(days=months_to_keep * 30)).strftime("%Y-%m-%d")
        Path(archive_dir).mkdir(parents=True, exist_ok=True)

        zip_filename = f"mindledger_archive_before_{cutoff_date}.zip"
        zip_path = os.path.join(archive_dir, zip_filename)

        # Collect raw records older than cutoff
        app_rows = [dict(r) for r in conn.execute("SELECT * FROM app_sessions WHERE date < ?;", (cutoff_date,)).fetchall()]
        browser_rows = [dict(r) for r in conn.execute("SELECT * FROM browser_sessions WHERE date < ?;", (cutoff_date,)).fetchall()]
        yt_rows = [dict(r) for r in conn.execute("SELECT * FROM youtube_activity WHERE date < ?;", (cutoff_date,)).fetchall()]

        total_archived = len(app_rows) + len(browser_rows) + len(yt_rows)

        if total_archived > 0:
            archive_payload = {
                "cutoff_date": cutoff_date,
                "archived_at": datetime.now().isoformat(),
                "app_sessions": app_rows,
                "browser_sessions": browser_rows,
                "youtube_activity": yt_rows,
            }

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("archive_data.json", json.dumps(archive_payload, indent=2))

            # Clean up raw rows
            conn.execute("DELETE FROM app_sessions WHERE date < ?;", (cutoff_date,))
            conn.execute("DELETE FROM browser_sessions WHERE date < ?;", (cutoff_date,))
            conn.execute("DELETE FROM youtube_activity WHERE date < ?;", (cutoff_date,))
            conn.commit()

            logger.info(
                f"Archived {total_archived} legacy entries before {cutoff_date} into {zip_path}"
            )

        return {
            "cutoff_date": cutoff_date,
            "archived_count": total_archived,
            "archive_file": zip_path if total_archived > 0 else None,
        }


# Singleton DataManager instance
data_manager = DataManager()
