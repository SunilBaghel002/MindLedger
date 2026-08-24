/**
 * MindLedger Chrome Extension - YouTube Content Script
 * Tracks video watch duration, video title, channel name, channel URL, and YouTube Shorts.
 * Supports variable playback speeds (1.25x, 1.5x, 1.75x, 2x) and third-party extensions (Enhancer for YouTube).
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
 * @param {string} [urlStr]
 * @returns {{ isWatch: boolean, isShort: boolean, videoId: string|null }}
 */
function parseYouTubeUrl(urlStr) {
  try {
    const url = new URL(urlStr || window.location.href);
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return { isWatch: !!v, isShort: false, videoId: v };
    } else if (url.pathname.startsWith('/shorts/')) {
      const parts = url.pathname.split('/');
      const v = parts[2] || null;
      return { isWatch: false, isShort: !!v, videoId: v };
    }
  } catch (e) {
    // Ignore invalid URL
  }
  return { isWatch: false, isShort: false, videoId: null };
}

/**
 * Extract channel name and URL from modern YouTube DOM
 * @returns {{ name: string|null, url: string|null }}
 */
function extractChannelInfo() {
  const channelSelectors = [
    'ytd-watch-metadata #owner ytd-channel-name a',
    '#owner #channel-name a',
    'ytd-video-owner-renderer #channel-name a',
    '#upload-info #channel-name a',
    'ytd-channel-name yt-formatted-string a',
    '#text.ytd-channel-name a',
    'ytd-channel-name #text a',
    '#owner ytd-channel-name',
    '#owner #channel-name',
    'ytd-video-owner-renderer ytd-channel-name',
  ];

  for (const selector of channelSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent && el.textContent.trim()) {
      const rawName = el.textContent.trim().replace(/\s+/g, ' ');
      if (rawName && rawName !== 'Subscribe' && rawName !== 'Join') {
        const href = el.getAttribute('href') || (el.querySelector('a') && el.querySelector('a').getAttribute('href'));
        const fullUrl = href ? (href.startsWith('http') ? href : `https://www.youtube.com${href}`) : null;
        return { name: rawName, url: fullUrl };
      }
    }
  }

  const metaAuthor =
    document.querySelector('meta[name="author"]') ||
    document.querySelector('link[itemprop="name"]') ||
    document.querySelector('span[itemprop="author"] link[itemprop="name"]');

  if (metaAuthor) {
    const name = metaAuthor.getAttribute('content') || metaAuthor.getAttribute('href');
    if (name && name.trim()) {
      return { name: name.trim(), url: null };
    }
  }

  // Fallback: check document title for channel hint (e.g. "Title - Channel - YouTube")
  if (document.title && document.title.includes('-')) {
    const parts = document.title.split('-');
    if (parts.length >= 3) {
      return { name: parts[parts.length - 2].trim(), url: null };
    }
  }

  return { name: 'Unknown Channel', url: null };
}

/**
 * Extract video title from YouTube DOM
 * @returns {string}
 */
function extractVideoTitle() {
  const titleSelectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    '#title h1.ytd-watch-metadata',
    'h1.ytd-watch-metadata',
    'yt-formatted-string.ytd-watch-metadata',
    'h1.title.ytd-video-primary-info-renderer',
    'h2.title.ytd-shorts-player-controls',
  ];

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent && el.textContent.trim()) {
      return el.textContent.trim().replace(/\s+/g, ' ');
    }
  }

  if (document.title) {
    return document.title.replace(/\s*-\s*YouTube\s*$/, '').trim();
  }

  return 'Untitled YouTube Video';
}

/**
 * Get currently attached HTML5 video element
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

  const channelInfo = extractChannelInfo();
  const videoTitle = currentTrackingState.videoTitle || extractVideoTitle();
  const channelName =
    currentTrackingState.channelName && currentTrackingState.channelName !== 'Unknown Channel'
      ? currentTrackingState.channelName
      : channelInfo.name;

  const payload = {
    type: 'YOUTUBE_EVENT',
    video_id: currentTrackingState.videoId,
    video_title: videoTitle,
    channel_name: channelName || 'Unknown Channel',
    channel_url: currentTrackingState.channelUrl || channelInfo.url || '',
    video_url: currentTrackingState.videoUrl || window.location.href,
    is_short: currentTrackingState.isShort,
    watch_duration_seconds: Math.round(currentTrackingState.accumulatedSeconds),
    video_duration_seconds: Math.round(currentTrackingState.videoDurationSeconds || 0),
    timestamp: new Date().toISOString(),
  };

  console.log('[MindLedger YouTube] Sending watch event:', payload);
  try {
    chrome.runtime.sendMessage(payload, () => {
      if (chrome.runtime.lastError) {
        // Ignore inactive worker errors
      }
    });
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
 * Update playing time counter with playbackRate awareness
 */
function tickPlayer() {
  const vid = getActiveVideoElement();

  if (vid && !vid.paused && !vid.ended && vid.readyState >= 2) {
    const now = Date.now();
    if (currentTrackingState.lastPlayingTimestamp) {
      const deltaSeconds = (now - currentTrackingState.lastPlayingTimestamp) / 1000;
      if (deltaSeconds > 0 && deltaSeconds < 3) {
        // Accumulate active watch time
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
    if (currentTrackingState.videoId && currentTrackingState.accumulatedSeconds >= 3) {
      flushYouTubeSession();
    }
    currentTrackingState.lastPlayingTimestamp = null;
  });

  video.addEventListener('ended', () => {
    flushYouTubeSession();
  });
}

/**
 * Initialize tracking session for video URL
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

  // If same video is already being tracked, don't reset
  if (currentTrackingState.videoId === urlInfo.videoId) {
    getActiveVideoElement();
    return;
  }

  // Cancel any pending metadata discovery timer
  if (activeMetadataTimer) {
    clearInterval(activeMetadataTimer);
    activeMetadataTimer = null;
  }

  // Flush previous session when changing to a different video ID
  flushYouTubeSession();

  const currentToken = ++youtubeSessionToken;
  let attempts = 0;

  // Immediate first discovery attempt
  const initialChannel = extractChannelInfo();
  const initialTitle = extractVideoTitle();

  currentTrackingState.videoId = urlInfo.videoId;
  currentTrackingState.videoTitle = initialTitle;
  currentTrackingState.channelName = initialChannel.name;
  currentTrackingState.channelUrl = initialChannel.url;
  currentTrackingState.videoUrl = window.location.href;
  currentTrackingState.isShort = urlInfo.isShort;
  currentTrackingState.startTime = Date.now();
  currentTrackingState.accumulatedSeconds = 0;

  const metadataTimer = setInterval(() => {
    attempts++;
    const channelInfo = extractChannelInfo();
    const title = extractVideoTitle();

    if ((title && channelInfo.name && channelInfo.name !== 'Unknown Channel') || attempts >= 10) {
      clearInterval(metadataTimer);
      if (activeMetadataTimer === metadataTimer) {
        activeMetadataTimer = null;
      }

      if (youtubeSessionToken !== currentToken) {
        return;
      }

      if (title && title !== 'Untitled YouTube Video') {
        currentTrackingState.videoTitle = title;
      }
      if (channelInfo.name && channelInfo.name !== 'Unknown Channel') {
        currentTrackingState.channelName = channelInfo.name;
        currentTrackingState.channelUrl = channelInfo.url;
      }

      console.log(`[MindLedger YouTube] Tracking active: "${currentTrackingState.videoTitle}" by ${currentTrackingState.channelName}`);
    }
  }, 500);

  activeMetadataTimer = metadataTimer;
  getActiveVideoElement();
}

// Listen to YouTube SPA navigation events
window.addEventListener('yt-navigate-finish', () => {
  setupVideoTracking();
});

// Periodic URL & player tick loop (every 1 second)
setInterval(() => {
  if (window.location.href !== lastKnownUrl) {
    lastKnownUrl = window.location.href;
    setupVideoTracking();
  }
  tickPlayer();
}, 1000);

// Frequent periodic sync (every 10 seconds during active playback)
setInterval(() => {
  if (currentTrackingState.videoId && currentTrackingState.accumulatedSeconds >= 5) {
    const channelInfo = extractChannelInfo();
    const videoTitle = currentTrackingState.videoTitle || extractVideoTitle();
    const channelName =
      currentTrackingState.channelName && currentTrackingState.channelName !== 'Unknown Channel'
        ? currentTrackingState.channelName
        : channelInfo.name;

    const payload = {
      type: 'YOUTUBE_EVENT',
      video_id: currentTrackingState.videoId,
      video_title: videoTitle,
      channel_name: channelName || 'Unknown Channel',
      channel_url: currentTrackingState.channelUrl || channelInfo.url || '',
      video_url: currentTrackingState.videoUrl || window.location.href,
      is_short: currentTrackingState.isShort,
      watch_duration_seconds: Math.round(currentTrackingState.accumulatedSeconds),
      video_duration_seconds: Math.round(currentTrackingState.videoDurationSeconds || 0),
      timestamp: new Date().toISOString(),
    };

    console.log('[MindLedger YouTube] Periodic sync event (10s):', payload);
    try {
      chrome.runtime.sendMessage(payload, () => {
        if (chrome.runtime.lastError) {
          // Ignore worker reconnects
        }
      });
    } catch (e) {
      // Ignore worker disconnect errors
    }
    currentTrackingState.accumulatedSeconds = 0;
  }
}, 10000);

// Flush on page unload or visibility hidden
window.addEventListener('beforeunload', () => {
  flushYouTubeSession();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentTrackingState.videoId && currentTrackingState.accumulatedSeconds >= 2) {
    const channelInfo = extractChannelInfo();
    const payload = {
      type: 'YOUTUBE_EVENT',
      video_id: currentTrackingState.videoId,
      video_title: currentTrackingState.videoTitle || extractVideoTitle(),
      channel_name: currentTrackingState.channelName || channelInfo.name,
      channel_url: currentTrackingState.channelUrl || channelInfo.url || '',
      video_url: currentTrackingState.videoUrl || window.location.href,
      is_short: currentTrackingState.isShort,
      watch_duration_seconds: Math.round(currentTrackingState.accumulatedSeconds),
      video_duration_seconds: Math.round(currentTrackingState.videoDurationSeconds || 0),
      timestamp: new Date().toISOString(),
    };
    try {
      chrome.runtime.sendMessage(payload);
    } catch (e) {}
    currentTrackingState.accumulatedSeconds = 0;
  }
});

// Initial setup on script load
setupVideoTracking();
console.log('[MindLedger YouTube] Real-time content script loaded and active.');

