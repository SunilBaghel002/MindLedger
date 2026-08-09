"""
MindLedger - Category Rules API Routes
FastAPI router for category rules CRUD operations and historical data re-classification.

Author: MindLedger Team
Created: 2026-08-09
"""

import asyncio
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query

from ai.rules_engine import RulesEngine
from api.schemas import (
    APIResponse,
    CategoryRuleCreate,
    CategoryRuleDTO,
    CategoryRulesListData,
    CategoryRuleUpdate,
    ReclassifyRequest,
    ReclassifyResultData,
)
from config.settings import settings
from database.connection import DatabaseManager
from database.models import CategoryRule
from database.repositories.category_rule_repo import CategoryRuleRepository
from database.repositories.summary_repo import SummaryRepository
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["categories"])


def get_db_manager() -> DatabaseManager:
    """Get DatabaseManager for current settings.database_path."""
    return DatabaseManager(settings.database_path)


@router.get("/categories", response_model=APIResponse[CategoryRulesListData])
async def list_category_rules(
    rule_type: Optional[str] = Query(None, description="Filter by rule type: app, domain, url_pattern, title_pattern, youtube_channel"),
    is_active: Optional[bool] = Query(None, description="Filter by rule active status"),
) -> Dict:
    """Retrieve category rules ordered by priority descending.

    Args:
        rule_type: Optional filter string for rule type.
        is_active: Optional boolean filter for active status.

    Returns:
        APIResponse payload containing rule list and count.
    """
    try:
        with get_db_manager().connection() as conn:
            repo = CategoryRuleRepository(conn)
            if rule_type:
                rules = repo.get_by_type(rule_type, is_active=is_active)
            else:
                rules = repo.get_all(is_active=is_active)

        dtos = [
            CategoryRuleDTO(
                id=r.id,
                rule_type=r.rule_type,
                pattern=r.pattern,
                category=r.category,
                subcategory=r.subcategory,
                productivity=r.productivity,
                priority=r.priority,
                is_active=r.is_active,
            )
            for r in rules
        ]

        return {
            "success": True,
            "data": {
                "count": len(dtos),
                "rules": dtos,
            },
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to list category rules: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/{rule_id}", response_model=APIResponse[CategoryRuleDTO])
async def get_category_rule(rule_id: int) -> Dict:
    """Fetch a single category rule by ID.

    Args:
        rule_id: Primary key ID of the rule.

    Returns:
        APIResponse containing the target CategoryRuleDTO.
    """
    try:
        with get_db_manager().connection() as conn:
            repo = CategoryRuleRepository(conn)
            rule = repo.get_by_id(rule_id)

        if not rule:
            raise HTTPException(status_code=404, detail=f"Category rule with ID {rule_id} not found.")

        dto = CategoryRuleDTO(
            id=rule.id,
            rule_type=rule.rule_type,
            pattern=rule.pattern,
            category=rule.category,
            subcategory=rule.subcategory,
            productivity=rule.productivity,
            priority=rule.priority,
            is_active=rule.is_active,
        )

        return {
            "success": True,
            "data": dto,
            "error": None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch category rule id={rule_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categories", response_model=APIResponse[CategoryRuleDTO], status_code=201)
async def create_category_rule(payload: CategoryRuleCreate) -> Dict:
    """Create a new category classification rule.

    Args:
        payload: CategoryRuleCreate schema.

    Returns:
        APIResponse containing the created CategoryRuleDTO.
    """
    try:
        rule_model = CategoryRule(
            rule_type=payload.rule_type,
            pattern=payload.pattern,
            category=payload.category,
            subcategory=payload.subcategory,
            productivity=payload.productivity,
            priority=payload.priority,
            is_active=payload.is_active,
        )

        with get_db_manager().connection() as conn:
            repo = CategoryRuleRepository(conn)
            rule_id = repo.save(rule_model)
            created_rule = repo.get_by_id(rule_id)

        dto = CategoryRuleDTO(
            id=created_rule.id,
            rule_type=created_rule.rule_type,
            pattern=created_rule.pattern,
            category=created_rule.category,
            subcategory=created_rule.subcategory,
            productivity=created_rule.productivity,
            priority=created_rule.priority,
            is_active=created_rule.is_active,
        )

        return {
            "success": True,
            "data": dto,
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to create category rule: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/categories/{rule_id}", response_model=APIResponse[CategoryRuleDTO])
async def update_category_rule(rule_id: int, payload: CategoryRuleUpdate) -> Dict:
    """Update fields of an existing category rule.

    Args:
        rule_id: ID of the rule to update.
        payload: CategoryRuleUpdate payload.

    Returns:
        APIResponse containing updated CategoryRuleDTO.
    """
    try:
        update_data = payload.model_dump(exclude_unset=True)

        with get_db_manager().connection() as conn:
            repo = CategoryRuleRepository(conn)
            rule = repo.get_by_id(rule_id)
            if not rule:
                raise HTTPException(status_code=404, detail=f"Category rule with ID {rule_id} not found.")

            if update_data:
                repo.update(rule_id, update_data)

            updated_rule = repo.get_by_id(rule_id)

        dto = CategoryRuleDTO(
            id=updated_rule.id,
            rule_type=updated_rule.rule_type,
            pattern=updated_rule.pattern,
            category=updated_rule.category,
            subcategory=updated_rule.subcategory,
            productivity=updated_rule.productivity,
            priority=updated_rule.priority,
            is_active=updated_rule.is_active,
        )

        return {
            "success": True,
            "data": dto,
            "error": None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update category rule id={rule_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/categories/{rule_id}", response_model=APIResponse[Dict[str, Any]])
async def delete_category_rule(rule_id: int) -> Dict:
    """Delete a category rule by ID.

    Args:
        rule_id: ID of the rule to delete.

    Returns:
        APIResponse confirming deletion.
    """
    try:
        with get_db_manager().connection() as conn:
            repo = CategoryRuleRepository(conn)
            rule = repo.get_by_id(rule_id)
            if not rule:
                raise HTTPException(status_code=404, detail=f"Category rule with ID {rule_id} not found.")

            repo.delete(rule_id)

        return {
            "success": True,
            "data": {"id": rule_id, "deleted": True},
            "error": None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete category rule id={rule_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _perform_reclassification_job(
    from_date: Optional[str] = None, to_date: Optional[str] = None
) -> Dict[str, int]:
    """Synchronous worker job executing historical reclassification in bounded batches within a single atomic transaction.

    Args:
        from_date: Optional start date filter (YYYY-MM-DD).
        to_date: Optional end date filter (YYYY-MM-DD).

    Returns:
        Dict summarizing reclassification metrics.
    """
    affected_dates = set()
    app_count = 0
    browser_count = 0
    yt_count = 0
    updated_summaries_count = 0
    batch_size = 1000

    with get_db_manager().connection() as conn:
        try:
            rules_engine = RulesEngine(db_conn=conn)

            # 1. Reclassify app_sessions in bounded batches
            sql_app = "SELECT id, app_name, window_title, date FROM app_sessions"
            params_app = []
            where_clauses = []
            if from_date:
                where_clauses.append("date >= ?")
                params_app.append(from_date)
            if to_date:
                where_clauses.append("date <= ?")
                params_app.append(to_date)
            if where_clauses:
                sql_app += " WHERE " + " AND ".join(where_clauses)

            cursor = conn.execute(sql_app, params_app)
            while True:
                batch = cursor.fetchmany(batch_size)
                if not batch:
                    break
                for row in batch:
                    row_id, app_name, window_title, row_date = row[0], row[1], row[2], row[3]
                    cat, sub, prod = rules_engine.classify_app(app_name, window_title)
                    conn.execute(
                        "UPDATE app_sessions SET category = ?, subcategory = ?, productivity = ? WHERE id = ?",
                        (cat, sub, prod, row_id),
                    )
                    affected_dates.add(row_date)
                    app_count += 1

            # 2. Reclassify browser_sessions in bounded batches
            sql_browser = "SELECT id, url, domain, page_title, date FROM browser_sessions"
            params_browser = []
            where_clauses = []
            if from_date:
                where_clauses.append("date >= ?")
                params_browser.append(from_date)
            if to_date:
                where_clauses.append("date <= ?")
                params_browser.append(to_date)
            if where_clauses:
                sql_browser += " WHERE " + " AND ".join(where_clauses)

            cursor = conn.execute(sql_browser, params_browser)
            while True:
                batch = cursor.fetchmany(batch_size)
                if not batch:
                    break
                for row in batch:
                    row_id, url, domain, title, row_date = row[0], row[1], row[2], row[3], row[4]
                    cat, sub, prod = rules_engine.classify_browser(url, domain, title)
                    conn.execute(
                        "UPDATE browser_sessions SET category = ?, subcategory = ?, productivity = ? WHERE id = ?",
                        (cat, sub, prod, row_id),
                    )
                    affected_dates.add(row_date)
                    browser_count += 1

            # 3. Reclassify youtube_activity in bounded batches
            sql_yt = "SELECT id, video_title, channel_name, video_category, date FROM youtube_activity"
            params_yt = []
            where_clauses = []
            if from_date:
                where_clauses.append("date >= ?")
                params_yt.append(from_date)
            if to_date:
                where_clauses.append("date <= ?")
                params_yt.append(to_date)
            if where_clauses:
                sql_yt += " WHERE " + " AND ".join(where_clauses)

            cursor = conn.execute(sql_yt, params_yt)
            while True:
                batch = cursor.fetchmany(batch_size)
                if not batch:
                    break
                for row in batch:
                    row_id, title, channel, existing_cat, row_date = row[0], row[1], row[2], row[3], row[4]
                    is_short = (existing_cat == "youtube_shorts")
                    cat, sub, prod, is_p = rules_engine.classify_youtube(title, channel, is_short)
                    conn.execute(
                        "UPDATE youtube_activity SET video_category = ?, is_productive = ? WHERE id = ?",
                        (cat, 1 if is_p is True else (0 if is_p is False else None), row_id),
                    )
                    affected_dates.add(row_date)
                    yt_count += 1

            # 4. Re-aggregate daily summaries for affected dates BEFORE committing
            summary_repo = SummaryRepository(conn)
            for dt in affected_dates:
                summary_repo.aggregate_daily_summary(dt)
                updated_summaries_count += 1

            # Commit ONLY AFTER all updates and daily summaries succeed atomically
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    return {
        "reclassified_app_sessions": app_count,
        "reclassified_browser_sessions": browser_count,
        "reclassified_youtube_activities": yt_count,
        "updated_daily_summaries": updated_summaries_count,
    }


@router.post("/categories/reclassify", response_model=APIResponse[ReclassifyResultData])
async def reclassify_historical_data(payload: Optional[ReclassifyRequest] = None) -> Dict:
    """Re-classify historical tracking data using current active category rules and update daily summaries.

    Args:
        payload: Optional ReclassifyRequest specifying date bounds.

    Returns:
        APIResponse summarizing counts of reclassified sessions and updated daily summaries.
    """
    try:
        from_date = payload.from_date if payload else None
        to_date = payload.to_date if payload else None

        result_data = await asyncio.to_thread(
            _perform_reclassification_job, from_date, to_date
        )

        logger.info(
            f"Reclassification completed: apps={result_data['reclassified_app_sessions']}, "
            f"browser={result_data['reclassified_browser_sessions']}, "
            f"yt={result_data['reclassified_youtube_activities']}, "
            f"summaries={result_data['updated_daily_summaries']}"
        )

        return {
            "success": True,
            "data": result_data,
            "error": None,
        }
    except Exception as e:
        logger.error(f"Failed to reclassify historical data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
