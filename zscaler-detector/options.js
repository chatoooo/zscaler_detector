/**
 * options.js
 *
 * Handles saving and restoring user settings for the extension.
 */

// Saves options to chrome.storage
function saveOptions() {
  const bannerEnabled = document.getElementById('bannerEnabled').checked;
  const bannerPosition = document.getElementById('bannerPosition').value;

  chrome.storage.sync.set({
    bannerEnabled: bannerEnabled,
    bannerPosition: bannerPosition
  }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    status.style.opacity = 1;
    setTimeout(() => {
      status.style.opacity = 0;
    }, 1500);
  });
}

// Restores settings from chrome.storage
function restoreOptions() {
  // Use default values: bannerEnabled = true, bannerPosition = 'bottom-right'
  chrome.storage.sync.get({
    bannerEnabled: true,
    bannerPosition: 'bottom-right'
  }, (items) => {
    document.getElementById('bannerEnabled').checked = items.bannerEnabled;
    document.getElementById('bannerPosition').value = items.bannerPosition;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
