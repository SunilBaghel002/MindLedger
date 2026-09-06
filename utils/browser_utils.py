"""
MindLedger - Browser Utilities
Helpers for extracting web domains and URLs from window titles and browser metadata.

Author: MindLedger Team
Created: 2026-09-06
"""

from typing import Optional


def extract_domain_from_window_title(title: Optional[str]) -> Optional[str]:
    """Extract well-known website domain from a browser window title.

    Args:
        title: Active window title string (e.g. 'Feed | LinkedIn - Google Chrome').

    Returns:
        Canonical domain string or None if unidentifiable.
    """
    if not title:
        return None

    t = title.lower().strip()

    if "whatsapp" in t:
        return "web.whatsapp.com"
    if "youtube music" in t:
        return "music.youtube.com"
    if "youtube" in t:
        return "www.youtube.com"
    if "linkedin" in t:
        return "www.linkedin.com"
    if "swayam" in t:
        return "swayam.gov.in"
    if "nptel" in t:
        return "onlinecourses.nptel.ac.in"
    if "github" in t or "/first-code" in t or "/sehat-setu" in t:
        return "github.com"
    if "gitlab" in t:
        return "gitlab.com"
    if "chatgpt" in t:
        return "chatgpt.com"
    if "claude" in t:
        return "claude.ai"
    if "piax" in t:
        return "www.piax.org"
    if "experiential" in t or "agent router" in t:
        return "platform.experientiallabs.ai"
    if "arena.ai" in t or "arena |" in t or "lmarena" in t:
        return "arena.ai"
    if "kie.ai" in t or "kie ai" in t:
        return "kie.ai"
    if "v0 by vercel" in t or "v0.app" in t:
        return "v0.app"
    if "speedtest" in t:
        return "www.speedtest.net"
    if "google search" in t or "google - google chrome" in t:
        return "www.google.com"
    if "leetcode" in t:
        return "leetcode.com"
    if "stackoverflow" in t:
        return "stackoverflow.com"
    if "coursera" in t:
        return "coursera.org"
    if "udemy" in t:
        return "udemy.com"

    return None
