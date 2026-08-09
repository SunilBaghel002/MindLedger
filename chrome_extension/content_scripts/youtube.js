/**
 * MindLedger Chrome Extension - YouTube Content Script
 * Tracks video watch duration, video title, channel name, channel URL, and YouTube Shorts.
 * Compatible with third-party extensions like "Enhancer for YouTube" (Cinema Mode, Mini Player, etc.).
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
let lastKnownUrl = window.location.href;
let activeMetadataTimer = null;
let youtubeSessionToken = 0;

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

  if (document.title) {
    return document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();
  }

  return 'Untitled YouTube Video';
}

/**
 * Get currently attached HTML5 video element (handles DOM re-parenting by Enhancer for YouTube)
 * @returns {HTMLVideoElement|null}
 */
function getActiveVideoElement() {
  if (videoElement && document.contains(videoElement)) {
    return videoElement;
  }
  const newVid = document.querySelector('video');
  if (newVid) {
    videoElement = newVid;
    attachVideoListeners(videoElement);
  }
  return videoElement;
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
    console.warn('[MindLedger YouTube] Could not send message to background worker:', err);
  }

  resetState();
}

/**
 * Reset local tracking state
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
  const vid = getActiveVideoElement();

  if (vid && !vid.paused && !vid.ended && vid.readyState >= 2) {
    const now = Date.now();
    if (currentTrackingState.lastPlayingTimestamp) {
      const deltaSeconds = (now - currentTrackingState.lastPlayingTimestamp) / 1000;
      if (deltaSeconds > 0 && deltaSeconds < 3) {
        currentTrackingState.accumulatedSeconds += deltaSeconds;
      }
    }
    currentTrackingState.lastPlayingTimestamp = now;

    if (vid.duration && !isNaN(vid.duration)) {
      currentTrackingState.videoDurationSeconds = vid.duration;
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
  if (!video) return;
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
 * Initialize tracking session for video URL with session token cancellation
 */
function setupVideoTracking() {
  const urlInfo = parseYouTubeUrl(window.location.href);

  // If not a watch or shorts page, flush existing session and cancel pending timer
  if (!urlInfo.isWatch && !urlInfo.isShort) {
    if (activeMetadataTimer) {
      clearInterval(activeMetadataTimer);
      activeMetadataTimer = null;
    }
    youtubeSessionToken++;
    flushYouTubeSession();
    return;
  }

  // If same video is already being tracked (e.g. Cinema Mode toggle / Enhancer DOM changes), DO NOT RESET
  if (currentTrackingState.videoId === urlInfo.videoId) {
    getActiveVideoElement();
    return;
  }

  // Cancel any pending metadata discovery timer from a previous video
  if (activeMetadataTimer) {
    clearInterval(activeMetadataTimer);
    activeMetadataTimer = null;
  }

  // Flush previous session ONLY when changing to a different video ID
  flushYouTubeSession();

  const currentToken = ++youtubeSessionToken;
  let attempts = 0;

  const metadataTimer = setInterval(() => {
    attempts++;
    const channelInfo = extractChannelInfo();
    const title = extractVideoTitle();

    if ((title && channelInfo.name !== 'Unknown Channel') || attempts >= 10) {
      clearInterval(metadataTimer);
      if (activeMetadataTimer === metadataTimer) {
        activeMetadataTimer = null;
      }

      // Verify timer still belongs to the active tracking session
      if (youtubeSessionToken !== currentToken) {
        return;
      }

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

  activeMetadataTimer = metadataTimer;
  getActiveVideoElement();
}

// Listen to YouTube SPA navigation events
window.addEventListener('yt-navigate-finish', () => {
  setupVideoTracking();
});

// Periodic URL & player tick loop
setInterval(() => {
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
    setupVideoTracking();
  }
  tickPlayer();
}, 1000);

// Periodically flush watch time every 30 seconds
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
      // Ignore worker disconnect errors
    }
    // Reset watch counter after periodic sync
    currentTrackingState.accumulatedSeconds = 0;
  }
}, 30000);

// Flush on page unload/close
window.addEventListener('beforeunload', () => {
  flushYouTubeSession();
});

// Initial setup on script load
setupVideoTracking();
console.log('[MindLedger YouTube] Enhancer-compatible content script loaded and active.');
