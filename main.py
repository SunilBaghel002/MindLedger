"""
MindLedger - Application Entry Point
Main entry point for starting the MindLedger tracking engine, database migrations, and server.

Author: MindLedger Team
Created: 2026-08-08
"""

import sys
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from database.connection import db_manager
from database.migrations.v001_initial import up as run_v001_migration
from database.seed_data import seed_database
from utils.logger import get_logger

logger = get_logger(__name__)


def initialize_database() -> None:
    """Run database migrations and seed default configuration."""
    logger.info(f"Initializing database at: {settings.database_path}")
    with db_manager.connection() as conn:
        run_v001_migration(conn)
        seed_database(conn)
    logger.info("Database initialization and seeding completed successfully.")


def main() -> None:
    """Initialize and start the MindLedger application services."""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Host: {settings.app_host}:{settings.app_port}")
    logger.info(f"Database: {settings.database_path}")
    logger.info(
        f"Poll Interval: {settings.poll_interval_seconds}s | Idle Threshold: {settings.idle_threshold_seconds}s"
    )

    # Initialize Database
    initialize_database()

    logger.info("Phase 1B: Database Setup Complete.")


if __name__ == "__main__":
    main()
