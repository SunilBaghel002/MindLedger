"""
MindLedger - Reclassify and Sync Today's Data
Updates category rules, reclassifies all of today's app sessions using the improved
rules engine, and synthesizes missing browser sessions from desktop window titles.

Author: MindLedger Team
Created: 2026-09-06
"""

from datetime import datetime, date
import sqlite3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from ai.rules_engine import RulesEngine
from utils.browser_utils import extract_domain_from_window_title
from database.seed_data import DEFAULT_CATEGORY_RULES


def sync_db(db_path: Path):
    if not db_path.exists():
        print(f"[SKIP] DB does not exist at {db_path}")
        return

    print(f"\n[SYNCING] Database at {db_path}")
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # 1. Seed any missing category rules
    print("Checking and inserting category rules...")
    for rule in DEFAULT_CATEGORY_RULES:
        rule_type, pattern, category, subcategory, productivity, priority = rule
        cur = conn.execute(
            "SELECT id FROM category_rules WHERE rule_type = ? AND pattern = ?",
            (rule_type, pattern),
        )
        if not cur.fetchone():
            conn.execute(
                """
                INSERT INTO category_rules (rule_type, pattern, category, subcategory, productivity, priority, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                """,
                (rule_type, pattern, category, subcategory, productivity, priority),
            )
            print(f"  + Added rule: {rule_type} | {pattern} -> {category}/{productivity}")
    conn.commit()

    # 2. Reclassify today's app sessions
    today_str = date.today().isoformat()
    rules_engine = RulesEngine(db_conn=conn)

    cur = conn.execute(
        "SELECT id, app_name, window_title, category, productivity FROM app_sessions WHERE date = ?",
        (today_str,),
    )
    sessions = cur.fetchall()
    print(f"Reclassifying {len(sessions)} app sessions for {today_str}...")

    updated_count = 0
    for s in sessions:
        new_cat, new_sub, new_prod = rules_engine.classify_app(s["app_name"], s["window_title"])
        if new_cat != s["category"] or new_prod != s["productivity"]:
            conn.execute(
                """
                UPDATE app_sessions
                SET category = ?, subcategory = ?, productivity = ?
                WHERE id = ?
                """,
                (new_cat, new_sub, new_prod, s["id"]),
            )
            updated_count += 1

    conn.commit()
    print(f"  -> Reclassified {updated_count} app sessions!")

    # 3. Synthesize missing browser sessions from Chrome foreground window titles
    cur = conn.execute(
        """
        SELECT id, window_title, started_at, ended_at, duration_seconds
        FROM app_sessions
        WHERE date = ? AND is_foreground = 1 AND LOWER(app_name) LIKE '%chrome%' AND duration_seconds > 0
        """,
        (today_str,),
    )
    chrome_sessions = cur.fetchall()
    print(f"Checking {len(chrome_sessions)} Chrome foreground sessions for domain synthesis...")

    synthesized_count = 0
    for cs in chrome_sessions:
        title = cs["window_title"]
        domain = extract_domain_from_window_title(title)
        if not domain:
            continue

        started_at = cs["started_at"]
        duration = cs["duration_seconds"]

        # Check if browser_sessions already has an event near this time for this domain
        cur_check = conn.execute(
            """
            SELECT id FROM browser_sessions
            WHERE date = ? AND domain = ? AND started_at >= datetime(?, '-60 seconds') AND started_at <= datetime(?, '+60 seconds')
            """,
            (today_str, domain, started_at, started_at),
        )
        if not cur_check.fetchone():
            cat, sub, prod = rules_engine.classify_browser(url=f"https://{domain}", domain=domain, page_title=title)
            conn.execute(
                """
                INSERT INTO browser_sessions (url, domain, page_title, tab_id, started_at, ended_at, duration_seconds, is_active, category, subcategory, productivity, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                """,
                (
                    f"https://{domain}",
                    domain,
                    title,
                    0,
                    started_at,
                    cs["ended_at"] or started_at,
                    duration,
                    cat,
                    sub,
                    prod,
                    today_str,
                ),
            )
            synthesized_count += 1

    conn.commit()
    print(f"  -> Synthesized {synthesized_count} missing browser domain sessions!")

    conn.close()


def main():
    appdata_db = Path.home() / "AppData" / "Local" / "MindLedger" / "mindledger.db"
    local_db = Path(__file__).resolve().parent.parent / "mindledger.db"

    sync_db(appdata_db)
    sync_db(local_db)
    print("\n[DONE] Successfully reclassified and synced today's data!")


if __name__ == "__main__":
    main()
