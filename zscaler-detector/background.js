/**
 * background.js
 *
 * Manages icon state, dynamic blocking, and communicates with a native messaging host.
 */

const NATIVE_HOST_NAME = 'com.github.chatoooo.zscaler_detector';

// --- Icon Paths ---
const ICONS = {
  DEFAULT: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
  SAFE: { 16: 'icons/icon-safe16.png', 48: 'icons/icon-safe48.png', 128: 'icons/icon-safe128.png' },
  INTERCEPTED: { 16: 'icons/icon-intercepted16.png', 48: 'icons/icon-intercepted48.png', 128: 'icons/icon-intercepted128.png' },
};

// --- Event Listeners ---

// On install or update, merge the default domain list with the user's list.
chrome.runtime.onInstalled.addListener(async (details) => {
  // This runs on first install and on every update.
  const response = await fetch(chrome.runtime.getURL('default_domains.txt'));
  const text = await response.text();
  // More robust filtering: trim each line, then filter out empty lines and comments.
  const defaultDomains = new Set(
      text.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
  );

  // Get the user's current list.
  const data = await chrome.storage.sync.get({ blockedDomains: '' });
  const userDomains = new Set(data.blockedDomains.split('\n').map(d => d.trim()).filter(Boolean));

  // Merge them. The Set handles duplicates automatically.
  const mergedSet = new Set([...defaultDomains, ...userDomains]);
  const mergedDomains = Array.from(mergedSet).sort().join('\n');

  // Save the new merged list.
  await chrome.storage.sync.set({ blockedDomains: mergedDomains });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    const hostname = new URL(tab.url).hostname;
    await handlePageLoad(tabId, hostname);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const data = await chrome.storage.session.get(['tabHostnames', 'interceptionStatusCache']);
  const tabHostnames = data.tabHostnames || {};
  const interceptionStatusCache = data.interceptionStatusCache || {};
  const hostname = tabHostnames[tabId];
  await updateUiForTab(tabId, hostname, interceptionStatusCache);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'proceedToSite') {
    handleProceed(message.hostname, message.remember, sender.tab.id);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.session.get('tabHostnames');
  const tabHostnames = data.tabHostnames || {};
  if (tabHostnames[tabId]) {
    delete tabHostnames[tabId];
    await chrome.storage.session.set({ tabHostnames });
  }
});

// --- Main Logic ---

async function handlePageLoad(tabId, hostname) {
  await resetIcon(tabId);

  let { tabHostnames = {} } = await chrome.storage.session.get('tabHostnames');
  tabHostnames[tabId] = hostname;
  await chrome.storage.session.set({ tabHostnames });

  // Check if the site is on the SESSION bypass list.
  let { sessionBypassList = [] } = await chrome.storage.session.get('sessionBypassList');
  if (sessionBypassList.includes(hostname)) {
    await checkAndUpdateStatus(hostname, tabId, false); // It's bypassed for the session, proceed.
    return;
  }

  // Check if the site is on the PERMANENT "remembered" bypass list.
  const { rememberedBypassList = [] } = await chrome.storage.sync.get('rememberedBypassList');
  if (rememberedBypassList.some(bypassDomain => hostname === bypassDomain || hostname.endsWith(`.${bypassDomain}`))) {
    await checkAndUpdateStatus(hostname, tabId, false); // It's permanently bypassed, proceed.
    return;
  }

  // Check if the site is on the permanent blocklist.
  const { blockedDomains = '' } = await chrome.storage.sync.get('blockedDomains');
  const domains = blockedDomains.split('\n').map(d => d.trim()).filter(Boolean);
  const isOnBlocklist = domains.some(blockedDomain => hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`));

  await checkAndUpdateStatus(hostname, tabId, isOnBlocklist);
}

async function checkAndUpdateStatus(hostname, tabId, shouldBlockIfIntercepted) {
  if (shouldBlockIfIntercepted) {
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: 'body { visibility: hidden !important; }'
    });
  }

  let { interceptionStatusCache = {} } = await chrome.storage.session.get('interceptionStatusCache');
  const cachedData = interceptionStatusCache[hostname];
  const cacheMaxAge = 3600 * 1000;

  if (cachedData && (Date.now() - cachedData.timestamp < cacheMaxAge)) {
    // Result is cached and fresh. Don't show the banner.
    await processResult(tabId, hostname, cachedData.isIntercepted, shouldBlockIfIntercepted, false);
    return;
  }

  // If not in cache, ask the native app.
  chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { hostname }, async (response) => {
    if (chrome.runtime.lastError) {
      // Don't show banner on error.
      await processResult(tabId, hostname, false, shouldBlockIfIntercepted, false);
      return;
    }
    const isIntercepted = response && response.intercepted === true;
    // This is a new result, so show the banner if needed.
    await processResult(tabId, hostname, isIntercepted, shouldBlockIfIntercepted, true);
  });
}

async function processResult(tabId, hostname, isIntercepted, wasCheckBlocked, showBanner) {
  // Cache the result.
  let { interceptionStatusCache = {} } = await chrome.storage.session.get('interceptionStatusCache');
  interceptionStatusCache[hostname] = { isIntercepted, timestamp: Date.now() };
  await chrome.storage.session.set({ interceptionStatusCache });

  // Update the icon.
  await updateIcon(tabId, isIntercepted);

  // Decide what to do with the page.
  if (wasCheckBlocked && isIntercepted) {
    const confirmationUrl = chrome.runtime.getURL(`confirmation.html#${hostname}`);
    await chrome.tabs.update(tabId, { url: confirmationUrl });
  } else {
    if (wasCheckBlocked) {
      try {
        await chrome.scripting.removeCSS({
          target: { tabId },
          css: 'body { visibility: hidden !important; }'
        });
      } catch(e) {}
    }
    // Show the non-blocking banner only if it's a new detection.
    if (isIntercepted && showBanner) {
      await injectBanner(tabId);
    }
  }
}

async function handleProceed(hostname, remember, tabId) {
  if (remember) {
    // Add to the permanent, synced bypass list.
    const { rememberedBypassList = [] } = await chrome.storage.sync.get('rememberedBypassList');
    if (!rememberedBypassList.includes(hostname)) {
      rememberedBypassList.push(hostname);
      await chrome.storage.sync.set({ rememberedBypassList });
    }
  } else {
    // Add to the session-level bypass list.
    let { sessionBypassList = [] } = await chrome.storage.session.get('sessionBypassList');
    if (!sessionBypassList.includes(hostname)) {
      sessionBypassList.push(hostname);
    }
    await chrome.storage.session.set({ sessionBypassList });
  }

  // Navigate to the site. The next onUpdated event will be handled correctly by handlePageLoad.
  await chrome.tabs.update(tabId, { url: `https://${hostname}` });
}

async function updateUiForTab(tabId, hostname, interceptionStatusCache) {
  if (hostname && interceptionStatusCache[hostname]) {
    await updateIcon(tabId, interceptionStatusCache[hostname].isIntercepted);
  } else {
    await resetIcon(tabId);
  }
}

// --- UI Functions ---

async function updateIcon(tabId, isIntercepted) {
  try {
    if (await chrome.tabs.get(tabId)) {
      const iconPath = isIntercepted ? ICONS.INTERCEPTED : ICONS.SAFE;
      await chrome.action.setIcon({ tabId, path: iconPath });
    }
  } catch (e) {}
}

async function resetIcon(tabId) {
  try {
    if (await chrome.tabs.get(tabId)) {
      await chrome.action.setIcon({ tabId, path: ICONS.DEFAULT });
    }
  } catch (e) {}
}

async function injectBanner(tabId) {
  const { bannerEnabled = true } = await chrome.storage.sync.get('bannerEnabled');
  if (bannerEnabled) {
    try {
      if (await chrome.tabs.get(tabId)) {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ['style.css'] });
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      }
    } catch (e) {}
  }
}