"""
MindLedger - Rules Engine Unit Tests
Comprehensive test suite verifying priority-based classification engine and CategoryRuleRepository across 50+ real-world examples.

Author: MindLedger Team
Created: 2026-08-09
"""

import sqlite3
import pytest

from ai.rules_engine import RulesEngine
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
from database.connection import DatabaseManager
from database.migrations.v001_initial import up as migrate_v001
from database.models import CategoryRule
from database.repositories.category_rule_repo import CategoryRuleRepository
from database.seed_data import seed_database


@pytest.fixture
def in_memory_db():
    """Fixture providing an initialized, migrated, and seeded in-memory SQLite database."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    migrate_v001(conn)
    seed_database(conn)
    yield conn
    conn.close()


@pytest.fixture
def rules_engine(in_memory_db):
    """Fixture providing a RulesEngine initialized with seeded DB rules."""
    return RulesEngine(db_conn=in_memory_db)


def test_app_classification(rules_engine):
    """Test app process name and window title classification across common applications."""
    test_cases = [
        ("code.exe", "main.py - MindLedger", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE),
        ("code", "index.js - VS Code", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE),
        ("pycharm64.exe", "app.py - MindLedger", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE),
        ("devenv.exe", "Solution Explorer", CATEGORY_CODING, "ide", PRODUCTIVITY_PRODUCTIVE),
        ("windowsterminal.exe", "PowerShell", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE),
        ("cmd.exe", "Command Prompt", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE),
        ("powershell.exe", "Administrator", CATEGORY_CODING, "terminal", PRODUCTIVITY_PRODUCTIVE),
        ("githubdesktop.exe", "GitHub Desktop", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE),
        ("postman.exe", "My Workspace - Postman", CATEGORY_CODING, "api_testing", PRODUCTIVITY_PRODUCTIVE),
        ("slack.exe", "#general - Slack", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_PRODUCTIVE),
        ("discord.exe", "General Voice", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_NEUTRAL),
        ("teams.exe", "Sync Meeting", CATEGORY_COMMUNICATION, "chat", PRODUCTIVITY_PRODUCTIVE),
        ("spotify.exe", "Lofi Beats - Spotify", CATEGORY_MUSIC, "listening", PRODUCTIVITY_NEUTRAL),
        ("vlc.exe", "Movie.mkv", CATEGORY_ENTERTAINMENT, "movies", PRODUCTIVITY_UNPRODUCTIVE),
        ("explorer.exe", "C:\\Projects", CATEGORY_SYSTEM, "file_manager", PRODUCTIVITY_NEUTRAL),
        ("notepad.exe", "notes.txt", CATEGORY_SYSTEM, "other", PRODUCTIVITY_NEUTRAL),
        ("unknown_app.exe", "Untitled Window", CATEGORY_UNCATEGORIZED, None, PRODUCTIVITY_NEUTRAL),
    ]

    for app_name, window_title, exp_cat, exp_sub, exp_prod in test_cases:
        cat, sub, prod = rules_engine.classify_app(app_name=app_name, window_title=window_title)
        assert cat == exp_cat, f"Failed app category for {app_name}: got {cat}, expected {exp_cat}"
        assert sub == exp_sub, f"Failed app subcategory for {app_name}: got {sub}, expected {exp_sub}"
        assert prod == exp_prod, f"Failed app productivity for {app_name}: got {prod}, expected {exp_prod}"


def test_domain_and_url_classification(rules_engine):
    """Test domain and URL classification across popular websites."""
    test_cases = [
        ("https://github.com/facebook/react", "github.com", "facebook/react", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE),
        ("https://gitlab.com/repo", "gitlab.com", "GitLab Repo", CATEGORY_CODING, "git", PRODUCTIVITY_PRODUCTIVE),
        ("https://stackoverflow.com/questions/123", "stackoverflow.com", "Python issue", CATEGORY_CODING, "debugging", PRODUCTIVITY_PRODUCTIVE),
        ("https://leetcode.com/problems/two-sum", "leetcode.com", "Two Sum - LeetCode", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE),
        ("https://hackerrank.com/challenges", "hackerrank.com", "HackerRank", CATEGORY_CODING, "practice", PRODUCTIVITY_PRODUCTIVE),
        ("https://developer.mozilla.org/en-US/", "developer.mozilla.org", "MDN Web Docs", CATEGORY_LEARNING, "documentation", PRODUCTIVITY_PRODUCTIVE),
        ("https://docs.python.org/3/", "docs.python.org", "Python Docs", CATEGORY_LEARNING, "documentation", PRODUCTIVITY_PRODUCTIVE),
        ("https://medium.com/@dev/post", "medium.com", "Medium Article", CATEGORY_LEARNING, "reading", PRODUCTIVITY_PRODUCTIVE),
        ("https://dev.to/article", "dev.to", "DEV Community", CATEGORY_LEARNING, "reading", PRODUCTIVITY_PRODUCTIVE),
        ("https://www.udemy.com/course/python", "udemy.com", "Udemy Python", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE),
        ("https://coursera.org/learn/ml", "coursera.org", "Coursera ML", CATEGORY_LEARNING, "course", PRODUCTIVITY_PRODUCTIVE),
        ("https://www.linkedin.com/jobs", "linkedin.com", "Jobs - LinkedIn", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE),
        ("https://naukri.com/jobs", "naukri.com", "Naukri Jobs", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE),
        ("https://indeed.com/jobs", "indeed.com", "Indeed Jobs", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE),
        ("https://wellfound.com/jobs", "wellfound.com", "Wellfound Startup Jobs", CATEGORY_JOB_SEARCH, "portal", PRODUCTIVITY_PRODUCTIVE),
        ("https://chatgpt.com/c/123", "chatgpt.com", "ChatGPT Code Helper", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE),
        ("https://claude.ai/chat/456", "claude.ai", "Claude Assistant", CATEGORY_CODING, "ai_assist", PRODUCTIVITY_PRODUCTIVE),
        ("https://google.com/search?q=test", "google.com", "Google Search", CATEGORY_BROWSING, "search", PRODUCTIVITY_NEUTRAL),
        ("https://mail.google.com/mail/u/0", "mail.google.com", "Gmail Inbox", CATEGORY_COMMUNICATION, "email", PRODUCTIVITY_NEUTRAL),
        ("https://reddit.com/r/python", "reddit.com", "r/python - Reddit", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://twitter.com/home", "twitter.com", "X / Twitter", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://x.com/home", "x.com", "X Feed", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://instagram.com", "instagram.com", "Instagram Feed", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://facebook.com", "facebook.com", "Facebook Feed", CATEGORY_ENTERTAINMENT, "social_media", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://netflix.com/watch/123", "netflix.com", "Netflix Watch", CATEGORY_ENTERTAINMENT, "movies", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://crunchyroll.com/anime", "crunchyroll.com", "Crunchyroll Anime", CATEGORY_ENTERTAINMENT, "anime", PRODUCTIVITY_UNPRODUCTIVE),
        ("https://unknownblog.org", "unknownblog.org", "Personal Blog", CATEGORY_BROWSING, "web", PRODUCTIVITY_NEUTRAL),
    ]

    for url, domain, title, exp_cat, exp_sub, exp_prod in test_cases:
        cat, sub, prod = rules_engine.classify_browser(url=url, domain=domain, page_title=title)
        assert cat == exp_cat, f"Failed domain category for {domain}: got {cat}, expected {exp_cat}"
        assert sub == exp_sub, f"Failed domain subcategory for {domain}: got {sub}, expected {exp_sub}"
        assert prod == exp_prod, f"Failed domain productivity for {domain}: got {prod}, expected {exp_prod}"


def test_youtube_classification(rules_engine):
    """Test YouTube video classification by channel name, title keywords, and shorts format."""
    channel_test_cases = [
        ("React Tutorial 2026", "Fireship", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Node.js Crash Course", "Traversy Media", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Full Stack Web Dev", "freeCodeCamp.org", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("CSS Grid Layout", "Web Dev Simplified", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Vue 3 Tutorial", "The Net Ninja", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Python for Beginners", "Programming with Mosh", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Lofi Beats to Study", "Lofi Girl", False, CATEGORY_MUSIC, "lofi", PRODUCTIVITY_NEUTRAL, None),
    ]

    for title, channel, is_short, exp_cat, exp_sub, exp_prod, exp_is_prod in channel_test_cases:
        cat, sub, prod, is_p = rules_engine.classify_youtube(video_title=title, channel_name=channel, is_short=is_short)
        assert cat == exp_cat, f"Failed YouTube channel category for {channel}: got {cat}, expected {exp_cat}"
        assert sub == exp_sub, f"Failed YouTube channel subcategory for {channel}: got {sub}, expected {exp_sub}"
        assert prod == exp_prod, f"Failed YouTube channel productivity for {channel}: got {prod}, expected {exp_prod}"
        assert is_p == exp_is_prod, f"Failed YouTube channel is_productive for {channel}: got {is_p}, expected {exp_is_prod}"

    title_keyword_test_cases = [
        ("FastAPI Python Complete Tutorial and Guide", "Unknown Channel", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("System Design Interview Masterclass", "Unknown Channel", False, CATEGORY_LEARNING, "tutorial", PRODUCTIVITY_PRODUCTIVE, True),
        ("Funny Cat Clips Meme Reaction Vlog", "Unknown Channel", False, CATEGORY_ENTERTAINMENT, "video", PRODUCTIVITY_UNPRODUCTIVE, False),
        ("Movie Trailer Highlights 2026", "Unknown Channel", False, CATEGORY_ENTERTAINMENT, "video", PRODUCTIVITY_UNPRODUCTIVE, False),
        ("Relaxing Lofi Music Song Playlist", "Unknown Channel", False, CATEGORY_MUSIC, "lofi", PRODUCTIVITY_NEUTRAL, None),
        ("Random Video Title With No Keywords", "Unknown Channel", True, CATEGORY_ENTERTAINMENT, "youtube_shorts", PRODUCTIVITY_UNPRODUCTIVE, False),
        ("Random Long Video Title With No Keywords", "Unknown Channel", False, CATEGORY_YOUTUBE, "video", PRODUCTIVITY_NEUTRAL, None),
    ]

    for title, channel, is_short, exp_cat, exp_sub, exp_prod, exp_is_prod in title_keyword_test_cases:
        cat, sub, prod, is_p = rules_engine.classify_youtube(video_title=title, channel_name=channel, is_short=is_short)
        assert cat == exp_cat, f"Failed YouTube title category for '{title}': got {cat}, expected {exp_cat}"
        assert sub == exp_sub, f"Failed YouTube title subcategory for '{title}': got {sub}, expected {exp_sub}"
        assert prod == exp_prod, f"Failed YouTube title productivity for '{title}': got {prod}, expected {exp_prod}"
        assert is_p == exp_is_prod, f"Failed YouTube title is_productive for '{title}': got {is_p}, expected {exp_is_prod}"


def test_category_rule_repository_crud(in_memory_db):
    """Test CRUD operations on CategoryRuleRepository."""
    repo = CategoryRuleRepository(in_memory_db)

    # 1. Create Rule
    new_rule = CategoryRule(
        rule_type="app",
        pattern="custom_ide.exe",
        category=CATEGORY_CODING,
        subcategory="custom_ide",
        productivity=PRODUCTIVITY_PRODUCTIVE,
        priority=200,
        is_active=True,
    )
    rule_id = repo.save(new_rule)
    assert rule_id > 0

    # 2. Read Rule
    fetched = repo.get_by_id(rule_id)
    assert fetched is not None
    assert fetched.pattern == "custom_ide.exe"
    assert fetched.priority == 200

    # 3. Update Rule
    updated = repo.update(rule_id, {"priority": 300, "subcategory": "updated_ide"})
    assert updated is True
    re_fetched = repo.get_by_id(rule_id)
    assert re_fetched.priority == 300
    assert re_fetched.subcategory == "updated_ide"

    # 4. Delete Rule
    deleted = repo.delete(rule_id)
    assert deleted is True
    assert repo.get_by_id(rule_id) is None


def test_priority_override(in_memory_db):
    """Test high priority rules overriding lower priority default rules."""
    repo = CategoryRuleRepository(in_memory_db)

    # Insert high-priority rule classifying github.com as entertainment
    override_rule = CategoryRule(
        rule_type="domain",
        pattern="github.com",
        category=CATEGORY_ENTERTAINMENT,
        subcategory="social",
        productivity=PRODUCTIVITY_UNPRODUCTIVE,
        priority=500,  # Higher than default 100
        is_active=True,
    )
    repo.save(override_rule)

    engine = RulesEngine(db_conn=in_memory_db)
    cat, sub, prod = engine.classify_browser(url="https://github.com", domain="github.com")

    assert cat == CATEGORY_ENTERTAINMENT
    assert prod == PRODUCTIVITY_UNPRODUCTIVE
