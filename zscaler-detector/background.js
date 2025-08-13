/**
 * background.js
 *
 * Manages icon state and communicates with a native messaging host.
 * Uses chrome.storage.session to persist data across service worker restarts.
 */

const NATIVE_HOST_NAME = 'com.github.chatoooo.zscaler_detector';

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

// 1. Listen for tab updates. This is the main trigger.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    await resetIcon(tabId);
  }
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    const hostname = new URL(tab.url).hostname;
    await checkAndupdateUi(hostname, tabId);
  }
});

// 2. Update icon when user switches to a different tab.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const data = await chrome.storage.session.get(['tabHostnames', 'interceptionStatusCache']);
  const tabHostnames = data.tabHostnames || {};
  const interceptionStatusCache = data.interceptionStatusCache || {};
  const hostname = tabHostnames[tabId];
  await updateUiForTab(tabId, hostname, interceptionStatusCache);
});

// 3. Clean up storage when a tab is closed.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.session.get('tabHostnames');
  const tabHostnames = data.tabHostnames || {};
  if (tabHostnames[tabId]) {
    delete tabHostnames[tabId];
    await chrome.storage.session.set({ tabHostnames });
  }
});

// --- Core Logic ---

/**
 * Checks the interception status and updates the UI.
 * @param {string} hostname The hostname to check.
 * @param {number} tabId The ID of the tab.
 */
async function checkAndupdateUi(hostname, tabId) {
  // Update the hostname for this tab in session storage.
  let { tabHostnames = {} } = await chrome.storage.session.get('tabHostnames');
  tabHostnames[tabId] = hostname;
  await chrome.storage.session.set({ tabHostnames });

  let { interceptionStatusCache = {} } = await chrome.storage.session.get('interceptionStatusCache');
  const cachedData = interceptionStatusCache[hostname];
  const cacheMaxAge = 3600 * 1000; // 1 hour

  if (cachedData && (Date.now() - cachedData.timestamp < cacheMaxAge)) {
    await updateIcon(tabId, cachedData.isIntercepted);
    return;
  }

  // Ask the native app.
  chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { hostname: hostname },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error(`[Extension] Error: ${chrome.runtime.lastError.message}`);
          interceptionStatusCache[hostname] = { isIntercepted: false, timestamp: Date.now() };
          await chrome.storage.session.set({ interceptionStatusCache });
          await updateIcon(tabId, false);
          return;
        }

        const isIntercepted = response && response.intercepted === true;
        interceptionStatusCache[hostname] = { isIntercepted, timestamp: Date.now() };
        await chrome.storage.session.set({ interceptionStatusCache });

        await updateIcon(tabId, isIntercepted);

        if (isIntercepted) {
          await injectBanner(tabId);
        }
      }
  );
}

/**
 * Updates the UI for a tab based on stored data.
 * @param {number} tabId The ID of the tab.
 * @param {string} hostname The hostname associated with the tab.
 * @param {object} interceptionStatusCache The cache of interception statuses.
 */
async function updateUiForTab(tabId, hostname, interceptionStatusCache) {
  if (hostname && interceptionStatusCache[hostname]) {
    const cachedData = interceptionStatusCache[hostname];
    await updateIcon(tabId, cachedData.isIntercepted);
  } else {
    await resetIcon(tabId);
  }
}

// --- UI Functions ---

async function updateIcon(tabId, isIntercepted) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab) {
      const iconPath = isIntercepted ? ICONS.INTERCEPTED : ICONS.SAFE;
      await chrome.action.setIcon({ tabId: tabId, path: iconPath });
    }
  } catch (error) {
    // Tab was likely closed, which is fine.
  }
}

async function resetIcon(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab) {
      await chrome.action.setIcon({ tabId: tabId, path: ICONS.DEFAULT });
    }
  } catch (error) {
    // Tab was likely closed.
  }
}

async function injectBanner(tabId) {
  const { bannerEnabled = true } = await chrome.storage.sync.get('bannerEnabled');
  if (bannerEnabled) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab) {
        await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['style.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] });
      }
    } catch (error) {
      // Tab was likely closed.
    }
  }
}