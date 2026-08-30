/**
 * MindLedger Chrome Extension - Modern Popup Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const activeDomain = document.getElementById('active-domain');
  const activeTitle = document.getElementById('active-title');
  const activeTimer = document.getElementById('active-timer');
  const domainAvatar = document.getElementById('domain-avatar');
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

  function getDomainEmoji(domain) {
    if (!domain) return '🌐';
    const d = domain.toLowerCase();
    if (d.includes('github') || d.includes('gitlab')) return '🐙';
    if (d.includes('youtube')) return '📺';
    if (d.includes('google')) return '🔍';
    if (d.includes('stackoverflow')) return '📚';
    if (d.includes('leetcode')) return '⚡';
    if (d.includes('reddit')) return '💬';
    if (d.includes('figma')) return '🎨';
    if (d.includes('chatgpt') || d.includes('claude') || d.includes('openai')) return '🤖';
    if (d.includes('notion')) return '📝';
    if (d.includes('spotify')) return '🎵';
    if (d.includes('netflix') || d.includes('anime')) return '🍿';
    return '🌐';
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
                  <strong>${l.display_name || l.target_identifier}</strong>
                  <span style="font-weight: 700; color: ${l.status === 'exceeded' ? '#DC2626' : '#D97706'};">
                    ${l.status === 'exceeded' ? 'Limit Exceeded' : `${l.remaining_minutes}m left`}
                  </span>
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
          statusText.textContent = 'Disconnected';
          activeDomain.textContent = 'Service Worker Inactive';
          domainAvatar.textContent = '⚠️';
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
          const dom = activeTab.domain || 'Active Webpage';
          activeDomain.textContent = dom;
          activeTitle.textContent = activeTab.title || activeTab.url;
          domainAvatar.textContent = getDomainEmoji(dom);
          startLocalTimer(activeTab.durationSeconds || 0);
        } else {
          activeDomain.textContent = 'No Active Tab';
          activeTitle.textContent = 'Open an HTTP/HTTPS webpage to start tracking';
          domainAvatar.textContent = '🌐';
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
    btnSync.innerHTML = '<span>⏳</span> Syncing...';

    chrome.runtime.sendMessage({ action: 'FLUSH_BUFFER' }, () => {
      setTimeout(() => {
        btnSync.innerHTML = '<span>✓</span> Synced!';
        updateStatus();
      }, 600);
    });
  });

  // Initial load
  updateStatus();
  fetchLimits();
  setInterval(updateStatus, 3000);
});
