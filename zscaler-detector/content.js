/**
 * content.js
 *
 * This script is injected into the page to create and display the Zscaler banner.
 */

(() => {
  const BANNER_ID = 'zscaler-detector-banner-by-extension';

  if (document.getElementById(BANNER_ID)) {
    return;
  }

  // Get settings from storage before creating the banner
  chrome.storage.sync.get({ bannerPosition: 'bottom-right' }, (items) => {
    createBanner(items.bannerPosition);
  });

  function createBanner(position) {
    // --- Create Banner Elements ---
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.classList.add('zscaler-banner-ext', position); // Add position class

    const icon = document.createElement('span');
    icon.textContent = '⚠️';
    icon.classList.add('zscaler-banner-ext-icon');
    
    const bannerText = document.createElement('span');
    bannerText.textContent = 'This connection appears to be intercepted.';

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.classList.add('zscaler-banner-ext-close');
    closeButton.setAttribute('aria-label', 'Close banner');

    // --- Assemble and Inject Banner ---
    banner.appendChild(icon);
    banner.appendChild(bannerText);
    banner.appendChild(closeButton);
    document.body.appendChild(banner);

    // --- Animation and Dismissal Logic ---
    const dismissBanner = () => banner.classList.remove('visible');

    closeButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismissBanner();
    };

    banner.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform' && !banner.classList.contains('visible')) {
        banner.remove();
      }
    });

    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });

    setTimeout(dismissBanner, 8000);
  }
})();