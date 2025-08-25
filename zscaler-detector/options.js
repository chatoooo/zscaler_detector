/**
 * options.js
 *
 * Handles saving and restoring user settings for the extension.
 */

async function saveOptions() {
  const bannerEnabled = document.getElementById('bannerEnabled').checked;
  const bannerPosition = document.getElementById('bannerPosition').value;
  const blockedDomains = document.getElementById('blockedDomains').value;

  await chrome.storage.sync.set({
    bannerEnabled,
    bannerPosition,
    blockedDomains
  });
  showStatus('Options saved.');
}

async function restoreOptions() {
  // Restore synced (permanent) settings
  const syncItems = await chrome.storage.sync.get({
    bannerEnabled: true,
    bannerPosition: 'bottom-right',
    blockedDomains: '',
    rememberedBypassList: []
  });

  document.getElementById('bannerEnabled').checked = syncItems.bannerEnabled;
  document.getElementById('bannerPosition').value = syncItems.bannerPosition;
  document.getElementById('blockedDomains').value = syncItems.blockedDomains;
  document.getElementById('rememberedBypassList').value = syncItems.rememberedBypassList.join('\n');

  // Restore session settings
  const sessionItems = await chrome.storage.session.get({ sessionBypassList: [] });
  document.getElementById('sessionBypassList').value = sessionItems.sessionBypassList.join('\n');
}

async function clearPermanentBypass() {
  await chrome.storage.sync.set({ rememberedBypassList: [] });
  await restoreOptions(); // Refresh the view
  showStatus('Permanently allowed list cleared.');
}

async function clearSessionBypass() {
  await chrome.storage.session.set({ sessionBypassList: [] });
  await restoreOptions(); // Refresh the view
  showStatus('Session allowed list cleared.');
}

function showStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.opacity = 1;
  setTimeout(() => {
    status.style.opacity = 0;
  }, 2000);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('clearPermanentBypass').addEventListener('click', clearPermanentBypass);
document.getElementById('clearSessionBypass').addEventListener('click', clearSessionBypass);