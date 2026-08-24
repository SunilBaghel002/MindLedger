/**
 * MindLedger Chrome Extension - Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const activeDomain = document.getElementById('active-domain');
  const activeTitle = document.getElementById('active-title');
  const activeTimer = document.getElementById('active-timer');
  const statSwitches = document.getElementById('stat-switches');
  const statYoutube = document.getElementById('stat-youtube');
  const statBuffered = document.getElementById('stat-buffered');
  const btnSync = document.getElementById('btn-sync');
  const syncCount = document.getElementById('sync-count');
  const limitsSection = document.getElementById('limits-section');
  const limitsList = document.getElementById('limits-list');

  let currentSeconds = 0;
  let timerInterval = null;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }

  function startLocalTimer(initialSeconds) {
    if (timerInterval) clearInterval(timerInterval);
    currentSeconds = initialSeconds;
    activeTimer.textContent = formatTime(currentSeconds);

    timerInterval = setInterval(() => {
      currentSeconds += 1;
      activeTimer.textContent = formatTime(currentSeconds);
    }, 1000);
  }

  async function fetchLimits() {
    try {
      const res = await fetch('http://127.0.0.1:8787/api/v1/limits');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.limits) {
          const domainLimits = data.data.limits.filter(
            (l) => l.target_type === 'domain' && l.is_active && (l.status === 'warning' || l.status === 'critical' || l.status === 'exceeded')
          );

          if (domainLimits.length > 0) {
            limitsSection.style.display = 'block';
            limitsList.innerHTML = domainLimits
              .map(
                (l) => `
                <div class="limit-item">
                  <strong>${l.display_name}</strong>
                  <span>${l.status === 'exceeded' ? 'Exceeded' : `${l.remaining_minutes}m left`}</span>
                </div>
              `
              )
              .join('');
          } else {
            limitsSection.style.display = 'none';
          }
        }
      }
    } catch (e) {
      limitsSection.style.display = 'none';
    }
  }

  async function updateStatus() {
    try {
      chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          statusBadge.className = 'badge badge-offline';
          statusText.textContent = 'Offline';
          activeDomain.textContent = 'Service Worker Inactive';
          return;
        }

        const { activeTab, backendOnline, bufferedEventsCount, tabSwitchesToday, youtubeVideosToday } = response.data;

        // Online status pill
        if (backendOnline) {
          statusBadge.className = 'badge badge-online';
          statusText.textContent = 'Connected';
        } else {
          statusBadge.className = 'badge badge-offline';
          statusText.textContent = 'Buffering Offline';
        }

        // Active tab details
        if (activeTab && activeTab.url) {
          activeDomain.textContent = activeTab.domain || 'Active Webpage';
          activeTitle.textContent = activeTab.title || activeTab.url;
          startLocalTimer(activeTab.durationSeconds || 0);
        } else {
          activeDomain.textContent = 'No Active Tab';
          activeTitle.textContent = 'Open an HTTP/HTTPS webpage to start tracking';
          activeTimer.textContent = '00m 00s';
          if (timerInterval) clearInterval(timerInterval);
        }

        // Stats grid
        statSwitches.textContent = tabSwitchesToday || 0;
        statYoutube.textContent = youtubeVideosToday || 0;
        statBuffered.textContent = bufferedEventsCount || 0;

        // Sync button
        if (bufferedEventsCount > 0 && backendOnline) {
          btnSync.style.display = 'flex';
          syncCount.textContent = bufferedEventsCount;
          btnSync.disabled = false;
        } else {
          btnSync.style.display = 'none';
        }
      });
    } catch (err) {
      console.warn('Popup status error:', err);
    }
  }

  // Manual sync button click
  btnSync.addEventListener('click', () => {
    btnSync.disabled = true;
    btnSync.textContent = 'Syncing...';

    chrome.runtime.sendMessage({ action: 'FLUSH_BUFFER' }, (res) => {
      setTimeout(() => {
        btnSync.textContent = 'Synced!';
        updateStatus();
      }, 500);
    });
  });

  // Initial load
  updateStatus();
  fetchLimits();
  setInterval(updateStatus, 3000);
});
