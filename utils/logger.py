"""
MindLedger - Logger Utility
Centralized logging configuration supporting formatted console and file output.

Author: MindLedger Team
Created: 2026-08-08
"""

import logging
import os
import sys
from pathlib import Path
from typing import Optional

from config.settings import settings

# Global logger cache
_loggers = {}

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def get_logger(name: str, log_file: Optional[str] = "logs/mindledger.log") -> logging.Logger:
    """Retrieve or create a logger instance with MindLedger standard formatting.

    Args:
        name: Name of the logger (typically __name__).
        log_file: Optional relative or absolute path to log file.

    Returns:
        Configured logging.Logger instance.
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.log_level, logging.INFO))
    logger.propagate = False

    # Prevent duplicate handlers
    if not logger.handlers:
        formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

        # Console Handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # File Handler (Optional / Safe Creation)
        if log_file:
            try:
                log_path = Path(log_file)
                log_path.parent.mkdir(parents=True, exist_ok=True)
                file_handler = logging.FileHandler(log_path, encoding="utf-8")
                file_handler.setFormatter(formatter)
                logger.addHandler(file_handler)
            except Exception as e:
                console_handler.setLevel(logging.WARNING)
                logger.warning(f"Could not initialize log file handler at '{log_file}': {e}")

    _loggers[name] = logger
    return logger
