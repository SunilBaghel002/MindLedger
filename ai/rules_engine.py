"""
MindLedger - AI Classification Rules Engine
Priority-based classification engine for applications, domains, URLs, YouTube activities, and window titles.

Author: MindLedger Team
Created: 2026-08-09
"""

import re
import sqlite3
from typing import Dict, List, Optional, Tuple

from config.constants import (
    CATEGORY_BROWSING,
    CATEGORY_CODING,
    CATEGORY_COMMUNICATION,
    CATEGORY_ENTERTAINMENT,
    CATEGORY_JOB_SEARCH,
    CATEGORY_LEARNING,
    CATEGORY_MUSIC,
    CATEGORY_SOCIAL_MEDIA,
    CATEGORY_SYSTEM,
    CATEGORY_UNCATEGORIZED,
    CATEGORY_YOUTUBE,
    PRODUCTIVITY_NEUTRAL,
    PRODUCTIVITY_PRODUCTIVE,
    PRODUCTIVITY_UNPRODUCTIVE,
)
from database.models import CategoryRule
from database.repositories.category_rule_repo import CategoryRuleRepository
from utils.logger import get_logger

logger = get_logger(__name__)

# Keyword sets for YouTube title classification
PRODUCTIVE_YOUTUBE_KEYWORDS = [
    "tutorial", "course", "learn", "how to", "explained", "guide", "documentation",
    "react", "python", "javascript", "typescript", "coding", "programming", "development",
    "algorithm", "data structure", "system design", "interview", "web dev", "backend",
    "frontend", "devops", "api", "fastapi", "django", "flask", "node", "sql", "git",
    "gate", "gate exam", "gate cs", "gate cse", "gate smashers", "neso academy", "knowledge gate",
    "gateoverflow", "dsa", "dbms", "operating system", "computer networks", "toc", "compiler design",
    "digital logic", "coa", "computer architecture", "discrete math", "discrete mathematics",
    "engineering mathematics", "aptitude", "pyq", "pyqs", "lecture", "one shot", "gate da", "computer science"
]

ENTERTAINMENT_YOUTUBE_KEYWORDS = [
    "anime", "episode", "movie", "trailer", "clip", "funny", "meme", "reaction",
    "vlog", "unboxing", "gameplay", "stream", "highlights", "gaming"
]

MUSIC_YOUTUBE_KEYWORDS = [
    "music", "song", "lofi", "beats", "playlist", "album", "mix", "remix", "live performance"
]


class RulesEngine:
    """Rule-based AI classification engine.

    Evaluates active applications, browser URLs, YouTube channels/titles,
    and window titles against priority-ordered category rules.

    Attributes:
        repo: CategoryRuleRepository instance (optional).
        rules: Cached list of active CategoryRule objects ordered by priority DESC.
    """

    def __init__(self, db_conn: Optional[sqlite3.Connection] = None, rules: Optional[List[CategoryRule]] = None) -> None:
        """Initialize RulesEngine with optional database connection or pre-loaded rules.

        Args:
            db_conn: Optional active database connection.
            rules: Optional explicit list of CategoryRule instances.
        """
        self.rules: List[CategoryRule] = rules or []
        if db_conn:
            self.load_rules_from_db(db_conn)

    def load_rules_from_db(self, db_conn: sqlite3.Connection) -> None:
        """Load active category rules from database into memory cache.

        Args:
            db_conn: Active sqlite3 Connection.
        """
        try:
            repo = CategoryRuleRepository(db_conn)
            self.rules = repo.get_active_rules()
            logger.debug(f"RulesEngine loaded {len(self.rules)} active rules from database.")
        except Exception as e:
            logger.error(f"Failed to load rules from database: {e}", exc_info=True)
            self.rules = []

    def set_rules(self, rules: List[CategoryRule]) -> None:
        """Explicitly set in-memory rules cache (e.g. for testing).

        Args:
            rules: List of CategoryRule instances.
        """
        self.rules = sorted(rules, key=lambda r: r.priority, reverse=True)

    def classify_app(self, app_name: str, window_title: Optional[str] = None) -> Tuple[str, Optional[str], str]:
        """Classify an application process name and window title.

        Args:
            app_name: Name of executable/process (e.g. 'code.exe', 'discord.exe').
            window_title: Optional active window title text.

        Returns:
            Tuple of (category, subcategory, productivity).
        """
        if not app_name:
            return CATEGORY_UNCATEGORIZED, None, PRODUCTIVITY_NEUTRAL

        app_lower = app_name.lower().strip()
        clean_app = app_lower[:-4] if app_lower.endswith(".exe") else app_lower
        title_lower = window_title.lower().strip() if window_title else ""

        # 1. Match against active rules ordered strictly by priority DESC (both 'app' and 'title_pattern')
        sorted_rules = sorted(self.rules, key=lambda r: r.priority, reverse=True)
        for rule in sorted_rules:
            if rule.rule_type == "app":
                pattern_lower = rule.pattern.lower().strip()
                clean_pattern = pattern_lower[:-4] if pattern_lower.endswith(".exe") else pattern_lower

                if app_lower == pattern_lower or clean_app == clean_pattern or clean_pattern in clean_app:
                    return rule.category, rule.subcategory, rule.productivity

            elif rule.rule_type == "title_pattern" and title_lower:
                pattern_lower = rule.pattern.lower().strip()
                if pattern_lower in title_lower:
                    return rule.category, rule.subcategory, rule.productivity

        # 2. Window title fallback heuristics when no DB rule matched
        if title_lower:
            if any(k in title_lower for k in ["leetcode"]):
                return CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE
            if any(k in title_lower for k in ["github", "gitlab"]):
                return CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE
            if any(k in title_lower for k in ["chatgpt", "claude", "openai"]):
                return CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE
            if any(k in title_lower for k in ["lmarina"]):
                return CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE
            if any(k in title_lower for k in ["gate", "gate smashers", "neso academy", "knowledge gate"]):
                return CATEGORY_LEARNING, "gate_prep", PRODUCTIVITY_PRODUCTIVE
            if any(k in title_lower for k in ["visual studio code", "vscode", "pycharm", "sublime text", "intellij", "git", "terminal"]):
                return CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE

        # 3. Process name fallback heuristics
        if any(k in clean_app for k in ["chrome", "edge", "msedge", "browser", "firefox", "brave", "opera"]):
            return CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL
        if any(k in clean_app for k in ["code", "python", "idea", "clion", "rider", "studio", "cursor", "antigravity", "sublime", "git", "terminal", "powershell", "cmd"]):
            return CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE
        if any(k in clean_app for k in ["discord", "slack", "teams", "telegram", "whatsapp", "zoom"]):
            return CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_NEUTRAL

        return CATEGORY_UNCATEGORIZED, None, PRODUCTIVITY_NEUTRAL

    def classify_browser(self, url: str, domain: str, page_title: Optional[str] = None) -> Tuple[str, Optional[str], str]:
        """Classify a browser visit by domain name, full URL, and page title.

        Args:
            url: Full page URL string.
            domain: Hostname/domain string (e.g. 'github.com').
            page_title: Optional title of the browser tab.

        Returns:
            Tuple of (category, subcategory, productivity).
        """
        if not domain:
            return CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL

        domain_lower = domain.lower().strip()
        if domain_lower.startswith("www."):
            domain_lower = domain_lower[4:]

        url_lower = (url or "").lower().strip()
        title_lower = (page_title or "").lower().strip()

        # 1. Check domain rules
        for rule in self.rules:
            if rule.rule_type == "domain":
                pattern_lower = rule.pattern.lower().strip()
                if pattern_lower.startswith("www."):
                    pattern_lower = pattern_lower[4:]

                if domain_lower == pattern_lower or domain_lower.endswith("." + pattern_lower):
                    return rule.category, rule.subcategory, rule.productivity

        # 2. Check URL pattern rules (regex or substring match)
        for rule in self.rules:
            if rule.rule_type == "url_pattern":
                try:
                    if re.search(rule.pattern, url_lower, re.IGNORECASE):
                        return rule.category, rule.subcategory, rule.productivity
                except re.error:
                    if rule.pattern.lower() in url_lower:
                        return rule.category, rule.subcategory, rule.productivity

        # 3. Check page title pattern rules
        if title_lower:
            for rule in self.rules:
                if rule.rule_type == "title_pattern":
                    pattern_lower = rule.pattern.lower().strip()
                    if pattern_lower in title_lower:
                        return rule.category, rule.subcategory, rule.productivity

        # Default fallbacks based on common domain indicators
        if "github" in domain_lower or "gitlab" in domain_lower or "stackoverflow" in domain_lower:
            return CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE
        if "youtube" in domain_lower or "youtu.be" in domain_lower:
            return CATEGORY_YOUTUBE, "video", PRODUCTIVITY_NEUTRAL

        return CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL

    def classify_youtube(
        self,
        video_title: Optional[str] = None,
        channel_name: Optional[str] = None,
        is_short: bool = False,
    ) -> Tuple[str, Optional[str], str, Optional[bool]]:
        """Classify a YouTube video activity based on channel name, title keywords, and format.

        Args:
            video_title: Title of the YouTube video.
            channel_name: Name of the YouTube channel.
            is_short: Whether the video is a YouTube Short.

        Returns:
            Tuple of (category, subcategory, productivity, is_productive).
        """
        channel_lower = (channel_name or "").strip()

        # 1. Priority 1: Known YouTube Channel Rules
        if channel_lower:
            for rule in self.rules:
                if rule.rule_type == "youtube_channel":
                    if rule.pattern.lower() == channel_lower.lower():
                        is_prod = True if rule.productivity == PRODUCTIVITY_PRODUCTIVE else (False if rule.productivity == PRODUCTIVITY_UNPRODUCTIVE else None)
                        return rule.category, rule.subcategory, rule.productivity, is_prod

        title_lower = (video_title or "").lower().strip()

        # 2. Priority 2: Video Title Keyword Scanning
        if title_lower:
            # Check productive keywords with word boundary matching
            for kw in PRODUCTIVE_YOUTUBE_KEYWORDS:
                if re.search(r"\b" + re.escape(kw) + r"\b", title_lower):
                    return CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True

            # Check entertainment keywords with word boundary matching
            for kw in ENTERTAINMENT_YOUTUBE_KEYWORDS:
                if re.search(r"\b" + re.escape(kw) + r"\b", title_lower):
                    return CATEGORY_ENTERTAINMENT, "video", PRODUCTIVITY_UNPRODUCTIVE, False

            # Check music keywords with word boundary matching
            for kw in MUSIC_YOUTUBE_KEYWORDS:
                if re.search(r"\b" + re.escape(kw) + r"\b", title_lower):
                    return CATEGORY_MUSIC, "lofi", PRODUCTIVITY_NEUTRAL, None

        # 3. YouTube Shorts handling
        if is_short:
            return CATEGORY_ENTERTAINMENT, "youtube_shorts", PRODUCTIVITY_UNPRODUCTIVE, False

        # Fallback
        return CATEGORY_YOUTUBE, "video", PRODUCTIVITY_NEUTRAL, None
