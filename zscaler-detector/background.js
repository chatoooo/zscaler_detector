/**
 * background.js
 *
 * Manages icon state and communicates with a native messaging host.
 */

const NATIVE_HOST_NAME = 'com.github.chatoooo.zscaler_detector';

// Caches to store status and avoid re-checking.
const interceptionStatusCache = new Map(); // key: hostname, value: { isIntercepted: boolean, timestamp: number }
const tabHostnameCache = new Map(); // key: tabId, value: hostname

// --- Icon Paths ---
const ICONS = {
  DEFAULT: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  SAFE: {
    16: 'icons/icon-safe16.png',
    48: 'icons/icon-safe48.png',
    128: 'icons/icon-safe128.png',
  },
  INTERCEPTED: {
    16: 'icons/icon-intercepted16.png',
    48: 'icons/icon-intercepted48.png',
    128: 'icons/icon-intercepted128.png',
  },
};

// --- Event Listeners ---

// 1. Listen for tab updates. This is now the main trigger.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab starts loading a new page, reset its icon.
  if (changeInfo.status === 'loading') {
    resetIcon(tabId);
  }

  // When a tab finishes loading and has a valid URL, check its status.
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const hostname = new URL(tab.url).hostname;
    checkAndupdateUi(hostname, tabId);
  }
});

// 2. Update icon when user switches to a different tab.
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;
  const hostname = tabHostnameCache.get(tabId);
  updateUiForTab(tabId, hostname);
});

// 3. Clean up cache when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  tabHostnameCache.delete(tabId);
});

// --- Core Logic ---

/**
 * Checks the interception status (using cache or native app) and updates the UI.
 * @param {string} hostname The hostname to check.
 * @param {number} tabId The ID of the tab.
 */
function checkAndupdateUi(hostname, tabId) {
  // Store the hostname for the current tab for quick lookups on tab switch.
  tabHostnameCache.set(tabId, hostname);

  const cachedData = interceptionStatusCache.get(hostname);
  const cacheMaxAge = 3600 * 1000; // 1 hour in milliseconds

  // If we have a fresh cached result, use it.
  if (cachedData && (Date.now() - cachedData.timestamp < cacheMaxAge)) {
    updateIcon(tabId, cachedData.isIntercepted);
    // Banner is not shown for cached results to be less intrusive.
    return;
  }

  // Otherwise (no cache or stale cache), ask the native app.
  chrome.runtime.sendNativeMessage(
    NATIVE_HOST_NAME,
    { hostname: hostname },
    (response) => {
      // It's possible the tab was closed before the native app responds.
      // The check inside updateIcon will handle this gracefully.
      if (chrome.runtime.lastError) {
        console.error(`[Extension] Error: ${chrome.runtime.lastError.message}`);
        // interceptionStatusCache.set(hostname, { isIntercepted: false, timestamp: Date.now() });
        // updateIcon(tabId, false);
        return;
      }

      const isIntercepted = response && response.intercepted === true;
      interceptionStatusCache.set(hostname, { isIntercepted: isIntercepted, timestamp: Date.now() });
      
      updateIcon(tabId, isIntercepted);
      
      // ONLY show the banner on the first detection within a cache cycle.
      if (isIntercepted) {
        injectBanner(tabId);
      }
    }
  );
}


/**
 * Updates the UI for a tab, typically on tab switch.
 * @param {number} tabId The ID of the tab.
 * @param {string} hostname The hostname associated with the tab.
 */
function updateUiForTab(tabId, hostname) {
  if (hostname && interceptionStatusCache.has(hostname)) {
    const cachedData = interceptionStatusCache.get(hostname);
    updateIcon(tabId, cachedData.isIntercepted);
  } else {
    resetIcon(tabId);
  }
}

// --- UI Functions ---

/**
 * Sets the extension icon based on interception status.
 * @param {number} tabId The ID of the tab.
 * @param {boolean} isIntercepted The status of the connection.
 */
function updateIcon(tabId, isIntercepted) {
  // First, check if the tab still exists.
  chrome.tabs.get(tabId, (tab) => {
    // If the tab is gone, or there was an error, just do nothing.
    if (chrome.runtime.lastError || !tab) {
      return;
    }
    // If the tab exists, proceed with setting the icon.
    const iconPath = isIntercepted ? ICONS.INTERCEPTED : ICONS.SAFE;
    chrome.action.setIcon({ tabId: tabId, path: iconPath });
  });
}

/**
 * Resets the extension icon to its default state.
 * @param {number} tabId The ID of the tab.
 */
function resetIcon(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    chrome.action.setIcon({ tabId: tabId, path: ICONS.DEFAULT });
  });
}

/**
 * Injects the banner into the page if enabled in settings.
 * @param {number} tabId The ID of the tab.
 */
function injectBanner(tabId) {
  chrome.storage.sync.get({ bannerEnabled: true }, (items) => {
    if (items.bannerEnabled) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['style.css'],
        });
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js'],
        });
      });
    }
  });
}