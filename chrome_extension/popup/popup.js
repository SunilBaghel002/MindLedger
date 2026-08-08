/**
 * MindLedger Chrome Extension - Popup UI Script
 * Fetches status and statistics from background service worker.
 */

let timerInterval = null;
let currentDurationSeconds = 0;

/**
 * Format seconds into mm:ss or hh:mm:ss string
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Update UI elements with status data
 * @param {Object} data
 */
function updateUI(data) {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const domainEl = document.getElementById('active-domain');
  const titleEl = document.getElementById('active-title');
  const timerEl = document.getElementById('active-timer');
  const switchesEl = document.getElementById('stat-switches');
  const youtubeEl = document.getElementById('stat-youtube');
  const bufferedEl = document.getElementById('stat-buffered');
  const syncBtn = document.getElementById('btn-sync');

  // Backend connection status
  if (data.backendOnline) {
    statusBadge.className = 'badge badge-online';
    statusText.textContent = 'Connected';
  } else {
    statusBadge.className = 'badge badge-offline';
    statusText.textContent = 'Offline';
  }

  // Active tab information
  if (data.activeTab && data.activeTab.domain) {
    domainEl.textContent = data.activeTab.domain;
    titleEl.textContent = data.activeTab.title || data.activeTab.url;
    currentDurationSeconds = data.activeTab.durationSeconds || 0;
    timerEl.textContent = formatTime(currentDurationSeconds);

    // Live timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      currentDurationSeconds++;
      timerEl.textContent = formatTime(currentDurationSeconds);
    }, 1000);
  } else {
    domainEl.textContent = 'No Active Tab';
    titleEl.textContent = 'Open an HTTP/HTTPS webpage to start tracking';
    timerEl.textContent = '00m 00s';
    if (timerInterval) clearInterval(timerInterval);
  }

  // Stats
  switchesEl.textContent = data.tabSwitchesToday || 0;
  if (youtubeEl) youtubeEl.textContent = data.youtubeVideosToday || 0;
  bufferedEl.textContent = data.bufferedEventsCount || 0;

  // Sync button state
  if (data.bufferedEventsCount > 0 && data.backendOnline) {
    syncBtn.disabled = false;
  } else {
    syncBtn.disabled = true;
  }
}

/**
 * Request latest status from background worker
 */
function refreshStatus() {
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[MindLedger Popup] Service worker error:', chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      updateUI(response.data);
    }
  });
}

// Initial status fetch
document.addEventListener('DOMContentLoaded', () => {
  refreshStatus();

  // Setup sync button handler
  const syncBtn = document.getElementById('btn-sync');
  syncBtn.addEventListener('click', () => {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="btn-icon">⏳</span> Syncing...';

    chrome.runtime.sendMessage({ action: 'FLUSH_BUFFER' }, (response) => {
      syncBtn.innerHTML = '<span class="btn-icon">🔄</span> Sync Offline Events';
      refreshStatus();
    });
  });
});
