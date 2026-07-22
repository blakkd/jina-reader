// background.js - Service worker for Jina Reader extension

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set defaults on install
    chrome.storage.local.set({
      level: 'advanced',
      displayMode: 'new',
    });
  }
});
