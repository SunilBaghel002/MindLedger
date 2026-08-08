"""
MindLedger - Application Entry Point
Main entry point for starting the MindLedger tracking engine and server.

Author: MindLedger Team
Created: 2026-08-08
"""

import sys
from config.constants import APP_NAME, APP_VERSION
from config.settings import settings
from utils.logger import get_logger

logger = get_logger(__name__)


def main() -> None:
    """Initialize and start the MindLedger application services."""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Host: {settings.app_host}:{settings.app_port}")
    logger.info(f"Database: {settings.database_path}")
    logger.info(f"Poll Interval: {settings.poll_interval_seconds}s | Idle Threshold: {settings.idle_threshold_seconds}s")
    logger.info("Phase 1A: Project Setup Complete.")


if __name__ == "__main__":
    main()
