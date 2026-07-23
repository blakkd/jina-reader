(function() {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'light');
  }

  chrome.storage.session.get('resultPage', function(items) {
    applyTheme(items.resultPage.theme);
    document.getElementById('content').innerHTML = items.resultPage.text.replace(/^\s+/, '');
    chrome.storage.session.remove('resultPage');
  });
})();
