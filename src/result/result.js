(function() {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'light');
  }

  chrome.storage.session.get('resultPage', function(items) {
    applyTheme(items.resultPage.theme);
    const content = items.resultPage.text;
    const el = document.getElementById('content');
    if (content.startsWith('data:image/')) {
      const img = document.createElement('img');
      img.src = content;
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      el.appendChild(img);
    } else {
      el.innerHTML = content.replace(/^\s+/, '');
    }
    chrome.storage.session.remove('resultPage');
  });
})();
