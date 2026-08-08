/**
 * MindLedger Chrome Extension - Background Service Worker (Manifest V3)
 * Tracks active tab URLs, titles, and duration spent.
 * Buffers tracking data when local backend server is offline.
 */

const API_ENDPOINT = 'http://127.0.0.1:8787/api/v1/events/browser';
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
let lastResetDate = new Date().toISOString().split('T')[0];

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
 * Reset daily switch counter if date changes
 */
function checkDateReset() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== lastResetDate) {
    lastResetDate = today;
    tabSwitchCountToday = 0;
  }
}

/**
 * Buffer event in chrome.storage.local for resilient offline storage
 * @param {Object} eventData
 */
async function bufferEvent(eventData) {
  try {
    const result = await chrome.storage.local.get(['eventBuffer']);
    const buffer = result.eventBuffer || [];
    buffer.push({ ...eventData, buffered_at: new Date().toISOString() });

    // Limit buffer to maximum 500 events
    if (buffer.length > 500) {
      buffer.splice(0, buffer.length - 500);
    }

    await chrome.storage.local.set({ eventBuffer: buffer });
    console.log(`[MindLedger] Event buffered locally. Total buffered: ${buffer.length}`);
  } catch (err) {
    console.error('[MindLedger] Error buffering event:', err);
  }
}

/**
 * Flush buffered events to backend server
 */
async function flushBuffer() {
  try {
    const result = await chrome.storage.local.get(['eventBuffer']);
    const buffer = result.eventBuffer || [];

    if (buffer.length === 0) return;

    console.log(`[MindLedger] Attempting to flush ${buffer.length} buffered events...`);

    const remaining = [];
    for (let i = 0; i < buffer.length; i++) {
      const event = buffer[i];
      const success = await sendEventToBackend(event, false);
      if (!success) {
        // Backend unavailable, keep remaining events in buffer
        remaining.push(...buffer.slice(i));
        break;
      }
    }

    await chrome.storage.local.set({ eventBuffer: remaining });
    if (remaining.length < buffer.length) {
      console.log(`[MindLedger] Flushed ${buffer.length - remaining.length} events successfully.`);
    }
  } catch (err) {
    console.error('[MindLedger] Error flushing event buffer:', err);
  }
}

/**
 * Send event payload to MindLedger FastAPI backend
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
      console.warn(`[MindLedger] Backend returned status ${response.status}`);
      if (allowBuffer) await bufferEvent(eventData);
      return false;
    }
  } catch (err) {
    // Backend offline / network error
    if (allowBuffer) await bufferEvent(eventData);
    return false;
  }
}

/**
 * Finalize current tracking session and dispatch event
 */
async function finalizeCurrentSession() {
  if (!activeState.startTime || !activeState.url) {
    return;
  }

  const now = Date.now();
  const durationSeconds = Math.round((now - activeState.startTime) / 1000);

  // Ignore tiny durations (< 1 second)
  if (durationSeconds >= 1 && isValidTrackableUrl(activeState.url)) {
    const payload = {
      url: activeState.url,
      domain: activeState.domain,
      title: activeState.title || activeState.url,
      started_at: new Date(activeState.startTime).toISOString(),
      ended_at: new Date(now).toISOString(),
      duration_seconds: durationSeconds,
      tab_id: activeState.tabId,
    };

    console.log('[MindLedger] Recording tab session:', payload);
    await sendEventToBackend(payload);
  }

  // Clear state
  activeState.startTime = null;
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

  // Finalize session if URL changed on active tab
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
 * Handle window focus switch
 */
async function handleWindowFocusChanged(windowId) {
  await finalizeCurrentSession();

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Focus left Chrome completely
    activeState = { tabId: null, windowId: null, url: null, title: null, domain: null, startTime: null };
  } else {
    // Focused on a Chrome window, find active tab
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs && tabs.length > 0) {
        startTrackingTab(tabs[0]);
      }
    } catch (err) {
      console.warn('[MindLedger] Error querying tab on window focus:', err);
    }
  }
}

// Register Chrome Tab & Window Event Listeners
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

// Periodically attempt to flush buffered events
setInterval(flushBuffer, FLUSH_INTERVAL_MS);

// Message Handler for Popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_STATUS') {
    (async () => {
      const result = await chrome.storage.local.get(['eventBuffer']);
      const buffer = result.eventBuffer || [];

      // Check backend ping status
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
          bufferedEventsCount: buffer.length,
          tabSwitchesToday: tabSwitchCountToday,
          apiEndpoint: API_ENDPOINT,
        },
      });
    })();
    return true; // Keep message channel open for async response
  }

  if (request.action === 'FLUSH_BUFFER') {
    (async () => {
      await flushBuffer();
      const result = await chrome.storage.local.get(['eventBuffer']);
      const buffer = result.eventBuffer || [];
      sendResponse({ success: true, remainingBufferCount: buffer.length });
    })();
    return true;
  }
});

// Initialize tracking on service worker startup
chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  if (tabs && tabs.length > 0) {
    startTrackingTab(tabs[0]);
  }
});

console.log('[MindLedger] Background service worker initialized.');
