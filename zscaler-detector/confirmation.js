document.addEventListener('DOMContentLoaded', () => {
    const hostnameEl = document.getElementById('hostname');
    const goBackBtn = document.getElementById('goBack');
    const proceedBtn = document.getElementById('proceed');
    const rememberCheckbox = document.getElementById('remember');

    // The hostname is passed in the URL hash.
    const hostname = window.location.hash.substring(1);

    hostnameEl.textContent = hostname || 'an unknown site';

    goBackBtn.addEventListener('click', () => {
        window.history.back();
    });

    proceedBtn.addEventListener('click', () => {
        // Tell the background script to allow this site.
        chrome.runtime.sendMessage({
            action: 'proceedToSite',
            hostname: hostname,
            remember: rememberCheckbox.checked
        });
    });
});