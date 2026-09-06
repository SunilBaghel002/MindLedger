/**
 * MindLedger Chrome Extension - Universal Active Tab Heartbeat Content Script
 * Runs in web pages to track active user presence, keep service worker alive,
 * and ensure reading/study time is never lost even during long idle tab intervals.
 */

(function () {
  'use strict';

  // Only run on standard http/https pages
  if (!window.location.protocol.startsWith('http')) return;

  const HEARTBEAT_INTERVAL_MS = 15000; // 15 seconds
  let lastUserActivity = Date.now();
  let heartbeatTimer = null;

  function markUserActive() {
    lastUserActivity = Date.now();
  }

  // Detect user engagement
  window.addEventListener('mousemove', markUserActive, { passive: true });
  window.addEventListener('keydown', markUserActive, { passive: true });
  window.addEventListener('scroll', markUserActive, { passive: true });
  window.addEventListener('click', markUserActive, { passive: true });

  function sendHeartbeat() {
    // Only send if page is currently visible
    if (document.visibilityState !== 'visible') {
      return;
    }

    // Check if user was active recently (within last 3 minutes)
    const inactiveSeconds = (Date.now() - lastUserActivity) / 1000;
    if (inactiveSeconds > 180) {
      return;
    }

    try {
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: 'HEARTBEAT_TICK',
          url: window.location.href,
          title: document.title || window.location.href,
          lastActivityAgo: inactiveSeconds,
        }, () => {
          // Ignore potential "Receiving end does not exist" harmless warnings
          if (chrome.runtime.lastError) {
            // Ignored
          }
        });
      }
    } catch (err) {
      // Extension context invalidated (e.g. extension was reloaded)
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    }
  }

  // Listen to visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markUserActive();
      sendHeartbeat();
    }
  });

  // Start periodic heartbeat
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Initial heartbeat when tab loads
  setTimeout(sendHeartbeat, 2000);
})();
