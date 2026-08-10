/**
 * MindLedger Chrome Extension - Background Service Worker (Manifest V3)
 * Tracks active tab URLs, titles, duration spent, and YouTube video events.
 * Buffers tracking data when local backend server is offline.
 */

const API_ENDPOINT = 'http://127.0.0.1:8787/api/v1/events/browser';
const YOUTUBE_API_ENDPOINT = 'http://127.0.0.1:8787/api/v1/events/youtube';
const FLUSH_INTERVAL_MS = 30000; // 30 seconds

// In-memory active tab tracking state
let activeState = {
  tabId: null,
  windowId: null,
  url: null,
  title: null,
  domain: null,
  startTime: null,
};

let tabSwitchCountToday = 0;
let youtubeVideosTrackedToday = 0;
let youtubeVideoIdsToday = new Set();
let lastResetDate = new Date().toISOString().split('T')[0];

let windowBlurTimer = null;
let focusGeneration = 0;

/**
 * Check if a URL should be tracked (HTTP/HTTPS only)
 * @param {string} url
 * @returns {boolean}
 */
function isValidTrackableUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Extract domain name from URL
 * @param {string} url
 * @returns {string|null}
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Reset daily switch & YouTube counter if date changes
 */
function checkDateReset() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== lastResetDate) {
    lastResetDate = today;
    tabSwitchCountToday = 0;
    youtubeVideoIdsToday.clear();
    youtubeVideosTrackedToday = 0;
  }
}

/**
 * Buffer event in chrome.storage.local for resilient offline storage
 * @param {string} bufferKey - 'eventBuffer' or 'youtubeEventBuffer'
 * @param {Object} eventData
 */
async function bufferEvent(bufferKey, eventData) {
  try {
    const result = await chrome.storage.local.get([bufferKey]);
    const buffer = result[bufferKey] || [];
    buffer.push({ ...eventData, buffered_at: new Date().toISOString() });

    if (buffer.length > 500) {
      buffer.splice(0, buffer.length - 500);
    }

    await chrome.storage.local.set({ [bufferKey]: buffer });
    console.log(`[MindLedger] Event buffered locally in ${bufferKey}. Total: ${buffer.length}`);
  } catch (err) {
    console.error(`[MindLedger] Error buffering event in ${bufferKey}:`, err);
  }
}

/**
 * Flush all buffered events (browser & YouTube) to backend server
 */
async function flushBuffer() {
  try {
    const result = await chrome.storage.local.get(['eventBuffer', 'youtubeEventBuffer']);
    const browserBuffer = result.eventBuffer || [];
    const youtubeBuffer = result.youtubeEventBuffer || [];

    if (browserBuffer.length > 0) {
      console.log(`[MindLedger] Attempting to flush ${browserBuffer.length} browser events...`);
      const remainingBrowser = [];
      for (let i = 0; i < browserBuffer.length; i++) {
        const success = await sendEventToBackend(browserBuffer[i], false);
        if (!success) {
          remainingBrowser.push(...browserBuffer.slice(i));
          break;
        }
      }
      await chrome.storage.local.set({ eventBuffer: remainingBrowser });
    }

    if (youtubeBuffer.length > 0) {
      console.log(`[MindLedger] Attempting to flush ${youtubeBuffer.length} YouTube events...`);
      const remainingYoutube = [];
      for (let i = 0; i < youtubeBuffer.length; i++) {
        const success = await sendYouTubeEventToBackend(youtubeBuffer[i], false);
        if (!success) {
          remainingYoutube.push(...youtubeBuffer.slice(i));
          break;
        }
      }
      await chrome.storage.local.set({ youtubeEventBuffer: remainingYoutube });
    }
  } catch (err) {
    console.error('[MindLedger] Error flushing event buffers:', err);
  }
}

/**
 * Send browser event payload to MindLedger FastAPI backend
 * @param {Object} eventData
 * @param {boolean} allowBuffer
 * @returns {Promise<boolean>}
 */
async function sendEventToBackend(eventData, allowBuffer = true) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (response.ok) {
      return true;
    } else {
      if (allowBuffer) await bufferEvent('eventBuffer', eventData);
      return false;
    }
  } catch (err) {
    if (allowBuffer) await bufferEvent('eventBuffer', eventData);
    return false;
  }
}

/**
 * Send YouTube event payload to MindLedger FastAPI backend
 * @param {Object} youtubeData
 * @param {boolean} allowBuffer
 * @returns {Promise<boolean>}
 */
async function sendYouTubeEventToBackend(youtubeData, allowBuffer = true) {
  try {
    const response = await fetch(YOUTUBE_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(youtubeData),
    });

    if (response.ok) {
      return true;
    } else {
      if (allowBuffer) await bufferEvent('youtubeEventBuffer', youtubeData);
      return false;
    }
  } catch (err) {
    if (allowBuffer) await bufferEvent('youtubeEventBuffer', youtubeData);
    return false;
  }
}

/**
 * Finalize a specific session snapshot with custom end timestamp
 * @param {Object} sessionToFinalize
 * @param {number} endTimestamp
 */
/**
 * Finalize a specific session snapshot with custom end timestamp
 * @param {Object} sessionToFinalize
 * @param {number} endTimestamp
 */
async function finalizeSessionSnapshot(sessionToFinalize, endTimestamp = Date.now()) {
  if (!sessionToFinalize || !sessionToFinalize.startTime || !sessionToFinalize.url) {
    return;
  }

  let durationSeconds = Math.round((endTimestamp - sessionToFinalize.startTime) / 1000);

  // Cap single tab session duration to 30 minutes (1800s) to prevent runaway sleep accumulation
  const MAX_SINGLE_SESSION_SECONDS = 1800;
  if (durationSeconds > MAX_SINGLE_SESSION_SECONDS) {
    console.warn(
      `[MindLedger] Capping excessively long tab session duration from ${durationSeconds}s to ${MAX_SINGLE_SESSION_SECONDS}s (likely system sleep/idle).`
    );
    durationSeconds = MAX_SINGLE_SESSION_SECONDS;
  }

  if (durationSeconds >= 1 && isValidTrackableUrl(sessionToFinalize.url)) {
    const payload = {
      url: sessionToFinalize.url,
      domain: sessionToFinalize.domain,
      title: sessionToFinalize.title || sessionToFinalize.url,
      started_at: new Date(sessionToFinalize.startTime).toISOString(),
      ended_at: new Date(endTimestamp).toISOString(),
      duration_seconds: durationSeconds,
      tab_id: sessionToFinalize.tabId,
    };

    console.log('[MindLedger] Recording tab session snapshot:', payload);
    await sendEventToBackend(payload);
  }
}

/**
 * Finalize current active tracking session
 */
async function finalizeCurrentSession() {
  const sessionCopy = { ...activeState };
  activeState = { tabId: null, windowId: null, url: null, title: null, domain: null, startTime: null };
  await finalizeSessionSnapshot(sessionCopy, Date.now());
}

/**
 * Start tracking a tab as active
 * @param {chrome.tabs.Tab} tab
 */
function startTrackingTab(tab) {
  if (!tab || !tab.url || !isValidTrackableUrl(tab.url)) {
    activeState = { tabId: null, windowId: null, url: null, title: null, domain: null, startTime: null };
    return;
  }

  checkDateReset();

  activeState = {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url,
    title: tab.title || tab.url,
    domain: extractDomain(tab.url),
    startTime: Date.now(),
  };

  console.log(`[MindLedger] Started tracking tab #${tab.id}: ${activeState.domain}`);
}

/**
 * Handle tab activation switch
 */
async function handleTabActivated(activeInfo) {
  await finalizeCurrentSession();
  tabSwitchCountToday++;

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    startTrackingTab(tab);
  } catch (err) {
    console.warn('[MindLedger] Could not get tab info on activate:', err);
  }
}

/**
 * Handle tab URL or title update
 */
async function handleTabUpdated(tabId, changeInfo, tab) {
  if (tabId !== activeState.tabId) return;

  if (changeInfo.url && changeInfo.url !== activeState.url) {
    await finalizeCurrentSession();
    startTrackingTab(tab);
  } else if (changeInfo.title) {
    activeState.title = changeInfo.title;
  }
}

/**
 * Handle tab removal
 */
async function handleTabRemoved(tabId) {
  if (tabId === activeState.tabId) {
    await finalizeCurrentSession();
    activeState = { tabId: null, windowId: null, url: null, title: null, domain: null, startTime: null };
  }
}

/**
 * Handle window focus switch - pause immediately when focus leaves Chrome
 */
async function handleWindowFocusChanged(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Focus left Chrome completely (user switched to another application or desktop)
    console.log('[MindLedger] Focus left Chrome windows. Pausing browser tab session.');
    await finalizeCurrentSession();
    return;
  }

  try {
    const win = await chrome.windows.get(windowId);
    if (win && win.type !== 'normal') {
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tabs && tabs.length > 0) {
      await finalizeCurrentSession();
      startTrackingTab(tabs[0]);
    }
  } catch (err) {
    console.warn('[MindLedger] Error querying tab on window focus:', err);
  }
}

/**
 * Handle system idle and screen lock / sleep state transitions
 */
async function handleIdleStateChanged(newState) {
  console.log(`[MindLedger] System idle state changed to: ${newState}`);
  if (newState === 'idle' || newState === 'locked') {
    // System is idle, locked, or sleeping -> finalize session and pause tracking
    await finalizeCurrentSession();
  } else if (newState === 'active') {
    // System returned from idle -> check if Chrome window is focused
    try {
      const lastFocused = await chrome.windows.getLastFocused();
      if (lastFocused && lastFocused.focused && lastFocused.type === 'normal') {
        const tabs = await chrome.tabs.query({ active: true, windowId: lastFocused.id });
        if (tabs && tabs.length > 0) {
          startTrackingTab(tabs[0]);
        }
      }
    } catch (err) {
      console.warn('[MindLedger] Error restoring tracking after system idle return:', err);
    }
  }
}

// Set Chrome idle detection threshold to 60 seconds
if (chrome.idle && chrome.idle.setDetectionInterval) {
  chrome.idle.setDetectionInterval(60);
  chrome.idle.onStateChanged.addListener(handleIdleStateChanged);
}

// Register Chrome Tab & Window Event Listeners
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

// Periodically attempt to flush buffered events
setInterval(flushBuffer, FLUSH_INTERVAL_MS);

// Message Handler for Popup UI and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'YOUTUBE_EVENT') {
    checkDateReset();
    if (request.video_id) {
      youtubeVideoIdsToday.add(request.video_id);
      youtubeVideosTrackedToday = youtubeVideoIdsToday.size;
    }
    console.log('[MindLedger Background] Received YouTube watch event:', request);
    sendYouTubeEventToBackend(request);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'GET_STATUS') {
    (async () => {
      if (windowBlurTimer) {
        clearTimeout(windowBlurTimer);
        windowBlurTimer = null;
      }

      if (!activeState.url) {
        try {
          const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tabs && tabs.length > 0 && isValidTrackableUrl(tabs[0].url)) {
            startTrackingTab(tabs[0]);
          }
        } catch (e) {
          console.warn('[MindLedger] Error recovering active tab for status:', e);
        }
      }

      const result = await chrome.storage.local.get(['eventBuffer', 'youtubeEventBuffer']);
      const browserBuffer = result.eventBuffer || [];
      const youtubeBuffer = result.youtubeEventBuffer || [];
      const totalBuffered = browserBuffer.length + youtubeBuffer.length;

      let backendOnline = false;
      try {
        const ping = await fetch('http://127.0.0.1:8787/api/v1/health', { method: 'GET' });
        backendOnline = ping.ok;
      } catch (e) {
        backendOnline = false;
      }

      sendResponse({
        success: true,
        data: {
          activeTab: {
            url: activeState.url,
            domain: activeState.domain,
            title: activeState.title,
            durationSeconds: activeState.startTime ? Math.round((Date.now() - activeState.startTime) / 1000) : 0,
          },
          backendOnline: backendOnline,
          bufferedEventsCount: totalBuffered,
          tabSwitchesToday: tabSwitchCountToday,
          youtubeVideosToday: youtubeVideosTrackedToday,
          apiEndpoint: API_ENDPOINT,
        },
      });
    })();
    return true;
  }

  if (request.action === 'FLUSH_BUFFER') {
    (async () => {
      await flushBuffer();
      const result = await chrome.storage.local.get(['eventBuffer', 'youtubeEventBuffer']);
      const browserBuffer = result.eventBuffer || [];
      const youtubeBuffer = result.youtubeEventBuffer || [];
      sendResponse({ success: true, remainingBufferCount: browserBuffer.length + youtubeBuffer.length });
    })();
    return true;
  }
});

// Initialize tracking on service worker startup
chrome.tabs.query({ active: true, lastFocusedWindow: true }).then((tabs) => {
  if (tabs && tabs.length > 0) {
    startTrackingTab(tabs[0]);
  }
});

console.log('[MindLedger] Background service worker initialized with generation token blur protection.');
