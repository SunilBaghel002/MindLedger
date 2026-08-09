"""
MindLedger - Category Rule Repository
Data access repository for category_rules table operations.

Author: MindLedger Team
Created: 2026-08-09
"""

import sqlite3
from typing import Any, Dict, List, Optional

from database.models import CategoryRule
from utils.logger import get_logger

logger = get_logger(__name__)


class CategoryRuleRepository:
    """Repository for category_rules table CRUD operations."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        """Initialize CategoryRuleRepository.

        Args:
            connection: Active sqlite3 database connection.
        """
        self.conn = connection
        self.conn.row_factory = sqlite3.Row

    def get_all(self, is_active: Optional[bool] = None) -> List[CategoryRule]:
        """Get all category rules ordered by priority descending.

        Args:
            is_active: Optional boolean filter. If None, returns all rules.

        Returns:
            List of CategoryRule instances.
        """
        if is_active is not None:
            cursor = self.conn.execute(
                """
                SELECT * FROM category_rules
                WHERE is_active = ?
                ORDER BY priority DESC, id ASC
                """,
                (1 if is_active else 0,),
            )
        else:
            cursor = self.conn.execute(
                """
                SELECT * FROM category_rules
                ORDER BY priority DESC, id ASC
                """
            )
        rows = cursor.fetchall()
        return [CategoryRule.from_row(row) for row in rows]

    def get_active_rules(self) -> List[CategoryRule]:
        """Get all active category rules ordered by priority descending.

        Returns:
            List of active CategoryRule instances.
        """
        return self.get_all(is_active=True)

    def get_by_type(self, rule_type: str, is_active: Optional[bool] = None) -> List[CategoryRule]:
        """Get category rules by rule type.

        Args:
            rule_type: Type of rule ('app', 'domain', 'url_pattern', 'title_pattern', 'youtube_channel').
            is_active: Optional boolean filter. If None, returns both active and inactive rules.

        Returns:
            List of matching CategoryRule instances.
        """
        if is_active is not None:
            cursor = self.conn.execute(
                """
                SELECT * FROM category_rules
                WHERE rule_type = ? AND is_active = ?
                ORDER BY priority DESC, id ASC
                """,
                (rule_type, 1 if is_active else 0),
            )
        else:
            cursor = self.conn.execute(
                """
                SELECT * FROM category_rules
                WHERE rule_type = ?
                ORDER BY priority DESC, id ASC
                """,
                (rule_type,),
            )
        rows = cursor.fetchall()
        return [CategoryRule.from_row(row) for row in rows]

    def get_by_id(self, rule_id: int) -> Optional[CategoryRule]:
        """Fetch a single rule by primary key ID.

        Args:
            rule_id: Rule ID.

        Returns:
            CategoryRule object or None if not found.
        """
        cursor = self.conn.execute(
            "SELECT * FROM category_rules WHERE id = ?",
            (rule_id,),
        )
        row = cursor.fetchone()
        return CategoryRule.from_row(row) if row else None

    def save(self, rule: CategoryRule) -> int:
        """Insert a new category rule into the database.

        Args:
            rule: CategoryRule instance.

        Returns:
            The inserted rule's ID.
        """
        cursor = self.conn.execute(
            """
            INSERT OR REPLACE INTO category_rules
                (rule_type, pattern, category, subcategory, productivity, priority, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rule.rule_type,
                rule.pattern,
                rule.category,
                rule.subcategory,
                rule.productivity,
                rule.priority,
                1 if rule.is_active else 0,
            ),
        )
        self.conn.commit()
        logger.info(f"Saved category rule id={cursor.lastrowid}: {rule.rule_type}={rule.pattern} -> {rule.category}")
        return cursor.lastrowid

    def update(self, rule_id: int, updates: Dict[str, Any]) -> bool:
        """Update fields of an existing category rule.

        Args:
            rule_id: Primary key ID of the rule.
            updates: Dictionary mapping column names to new values.

        Returns:
            True if updated successfully, False otherwise.
        """
        if not updates:
            return False

        allowed_fields = {"rule_type", "pattern", "category", "subcategory", "productivity", "priority", "is_active"}
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

        if not filtered_updates:
            return False

        set_clauses = [f"{k} = ?" for k in filtered_updates.keys()]
        values = list(filtered_updates.values())
        values.append(rule_id)

        sql = f"UPDATE category_rules SET {', '.join(set_clauses)} WHERE id = ?"
        cursor = self.conn.execute(sql, values)
        self.conn.commit()
        return cursor.rowcount > 0

    def delete(self, rule_id: int) -> bool:
        """Delete a category rule by ID.

        Args:
            rule_id: Primary key ID of the rule.

        Returns:
            True if deleted successfully, False otherwise.
        """
        cursor = self.conn.execute("DELETE FROM category_rules WHERE id = ?", (rule_id,))
        self.conn.commit()
        return cursor.rowcount > 0
