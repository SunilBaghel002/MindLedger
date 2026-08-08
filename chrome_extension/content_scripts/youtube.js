/**
 * MindLedger Chrome Extension - YouTube Content Script
 * Tracks video watch duration, video title, channel name, channel URL, and YouTube Shorts.
 * Handles YouTube Single Page Application (SPA) navigation seamlessly.
 */

let currentTrackingState = {
  videoId: null,
  videoTitle: null,
  channelName: null,
  channelUrl: null,
  videoUrl: null,
  isShort: false,
  startTime: null,
  accumulatedSeconds: 0,
  lastPlayingTimestamp: null,
  videoDurationSeconds: 0,
};

let videoElement = null;
let pollInterval = null;
let lastKnownUrl = window.location.href;

/**
 * Check if current URL is a YouTube video or Shorts page
 * @returns {{ isWatch: boolean, isShort: boolean, videoId: string|null }}
 */
function parseYouTubeUrl(urlStr) {
  try {
    const url = new URL(urlStr || window.location.href);
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return { isWatch: true, isShort: false, videoId: v };
    } else if (url.pathname.startsWith('/shorts/')) {
      const parts = url.pathname.split('/');
      const v = parts[2] || null;
      return { isWatch: false, isShort: true, videoId: v };
    }
  } catch (e) {
    // Ignore invalid URL
  }
  return { isWatch: false, isShort: false, videoId: null };
}

/**
 * Extract channel name and URL from YouTube DOM
 * @returns {{ name: string|null, url: string|null }}
 */
function extractChannelInfo() {
  // Selector priority list for YouTube's evolving layout
  const channelSelectors = [
    '#owner #channel-name a',
    '#text.ytd-channel-name a',
    'ytd-video-owner-renderer #channel-name a',
    '#upload-info #channel-name a',
  ];

  for (const selector of channelSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      const name = el.textContent.trim();
      const href = el.getAttribute('href');
      const fullUrl = href ? (href.startsWith('http') ? href : `https://www.youtube.com${href}`) : null;
      return { name, url: fullUrl };
    }
  }

  // Fallback to meta tags
  const metaAuthor = document.querySelector('meta[name="author"]') || document.querySelector('link[itemprop="name"]');
  if (metaAuthor) {
    const name = metaAuthor.getAttribute('content') || metaAuthor.getAttribute('href');
    return { name: name || 'Unknown Channel', url: null };
  }

  return { name: 'Unknown Channel', url: null };
}

/**
 * Extract video title from YouTube DOM
 * @returns {string}
 */
function extractVideoTitle() {
  const titleSelectors = [
    '#title h1.ytd-watch-metadata',
    'h1.ytd-watch-metadata',
    'yt-formatted-string.ytd-watch-metadata',
    'h1.title.ytd-video-primary-info-renderer',
    'h2.title.ytd-shorts-player-controls',
  ];

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }

  // Fallback: document title minus " - YouTube"
  if (document.title) {
    return document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();
  }

  return 'Untitled YouTube Video';
}

/**
 * Flush accumulated watch time for current video session to background worker
 */
function flushYouTubeSession() {
  if (!currentTrackingState.videoId || currentTrackingState.accumulatedSeconds < 1) {
    resetState();
    return;
  }

  const payload = {
    type: 'YOUTUBE_EVENT',
    video_id: currentTrackingState.videoId,
    video_title: currentTrackingState.videoTitle || extractVideoTitle(),
    channel_name: currentTrackingState.channelName || 'Unknown Channel',
    channel_url: currentTrackingState.channelUrl || '',
    video_url: currentTrackingState.videoUrl || window.location.href,
    is_short: currentTrackingState.isShort,
    watch_duration_seconds: Math.round(currentTrackingState.accumulatedSeconds),
    video_duration_seconds: Math.round(currentTrackingState.videoDurationSeconds || 0),
    timestamp: new Date().toISOString(),
  };

  console.log('[MindLedger YouTube] Sending watch event:', payload);
  try {
    chrome.runtime.sendMessage(payload);
  } catch (err) {
    console.warn('[MindLedger YouTube] Could not send message to extension background:', err);
  }

  resetState();
}

/**
 * Reset local state
 */
function resetState() {
  currentTrackingState = {
    videoId: null,
    videoTitle: null,
    channelName: null,
    channelUrl: null,
    videoUrl: null,
    isShort: false,
    startTime: null,
    accumulatedSeconds: 0,
    lastPlayingTimestamp: null,
    videoDurationSeconds: 0,
  };
}

/**
 * Update playing time counter
 */
function tickPlayer() {
  if (!videoElement) {
    videoElement = document.querySelector('video');
    if (videoElement) attachVideoListeners(videoElement);
  }

  if (videoElement && !videoElement.paused && !videoElement.ended && videoElement.readyState >= 2) {
    const now = Date.now();
    if (currentTrackingState.lastPlayingTimestamp) {
      const deltaSeconds = (now - currentTrackingState.lastPlayingTimestamp) / 1000;
      // Cap max delta at 3 seconds to avoid massive jumps during tab sleeping
      if (deltaSeconds > 0 && deltaSeconds < 3) {
        currentTrackingState.accumulatedSeconds += deltaSeconds;
      }
    }
    currentTrackingState.lastPlayingTimestamp = now;

    // Refresh duration if available
    if (videoElement.duration && !isNaN(videoElement.duration)) {
      currentTrackingState.videoDurationSeconds = videoElement.duration;
    }
  } else {
    currentTrackingState.lastPlayingTimestamp = null;
  }
}

/**
 * Attach event listeners to HTML5 video element
 * @param {HTMLVideoElement} video
 */
function attachVideoListeners(video) {
  video.addEventListener('play', () => {
    currentTrackingState.lastPlayingTimestamp = Date.now();
  });

  video.addEventListener('pause', () => {
    currentTrackingState.lastPlayingTimestamp = null;
  });

  video.addEventListener('ended', () => {
    flushYouTubeSession();
  });
}

/**
 * Initialize tracking session for new video URL
 */
function setupVideoTracking() {
  const urlInfo = parseYouTubeUrl(window.location.href);

  // If not a watch page or shorts page, flush existing session and exit
  if (!urlInfo.isWatch && !urlInfo.isShort) {
    flushYouTubeSession();
    return;
  }

  // If same video is already being tracked, do not reset
  if (currentTrackingState.videoId === urlInfo.videoId) {
    return;
  }

  // Flush previous video session if changing to a new video
  flushYouTubeSession();

  // Retry extracting metadata until YouTube DOM updates
  let attempts = 0;
  const metadataTimer = setInterval(() => {
    attempts++;
    const channelInfo = extractChannelInfo();
    const title = extractVideoTitle();

    if ((title && channelInfo.name !== 'Unknown Channel') || attempts >= 10) {
      clearInterval(metadataTimer);

      currentTrackingState.videoId = urlInfo.videoId;
      currentTrackingState.videoTitle = title;
      currentTrackingState.channelName = channelInfo.name;
      currentTrackingState.channelUrl = channelInfo.url;
      currentTrackingState.videoUrl = window.location.href;
      currentTrackingState.isShort = urlInfo.isShort;
      currentTrackingState.startTime = Date.now();
      currentTrackingState.accumulatedSeconds = 0;

      console.log(`[MindLedger YouTube] Tracking started: "${title}" by ${channelInfo.name}`);
    }
  }, 500);

  videoElement = document.querySelector('video');
  if (videoElement) {
    attachVideoListeners(videoElement);
  }
}

// Listen to YouTube SPA navigation events
window.addEventListener('yt-navigate-finish', () => {
  setupVideoTracking();
});

// Periodic URL check fallback for SPA transitions
setInterval(() => {
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
    setupVideoTracking();
  }
  tickPlayer();
}, 1000);

// Periodically flush tracking data every 30 seconds if watch duration is accumulating
setInterval(() => {
  if (currentTrackingState.videoId && currentTrackingState.accumulatedSeconds >= 10) {
    const channelInfo = extractChannelInfo();
    const payload = {
      type: 'YOUTUBE_EVENT',
      video_id: currentTrackingState.videoId,
      video_title: currentTrackingState.videoTitle || extractVideoTitle(),
      channel_name: currentTrackingState.channelName || channelInfo.name,
      channel_url: currentTrackingState.channelUrl || channelInfo.url,
      video_url: currentTrackingState.videoUrl || window.location.href,
      is_short: currentTrackingState.isShort,
      watch_duration_seconds: Math.round(currentTrackingState.accumulatedSeconds),
      video_duration_seconds: Math.round(currentTrackingState.videoDurationSeconds || 0),
      timestamp: new Date().toISOString(),
    };

    console.log('[MindLedger YouTube] Periodic sync event:', payload);
    try {
      chrome.runtime.sendMessage(payload);
    } catch (e) {
      // Ignore background disconnect errors
    }
    // Reset watch counter after periodic sync
    currentTrackingState.accumulatedSeconds = 0;
  }
}, 30000);

// Flush on page unload/close
window.addEventListener('beforeunload', () => {
  flushYouTubeSession();
});

// Initial tracking setup on load
setupVideoTracking();
console.log('[MindLedger YouTube] Content script loaded and active.');
