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

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const parts = reader.result.split(',');
      resolve(parts[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function buildApiRequest(params) {
  const headers = {};

  const server = params['EU Residency'] === 'true'
    ? 'https://eu-r-beta.jina.ai'
    : 'https://r.jina.ai';

  if (params['Add API Key for Higher Rate Limit'] === 'true' && params['apiKey']) {
    headers['Authorization'] = `Bearer ${params['apiKey']}`;
  }

  const engineMap = {
    'Default': '',
    'Speed First': 'curl',
    'Best Quality': 'browser',
    'Experimental': 'cf-browser-rendering',
  };
  const engineVal = engineMap[params['Browser Engine (Quality/Speed)']];
  if (engineVal) headers['X-Engine'] = engineVal;

  const formatMap = {
    'Default': '',
    'Markdown': 'markdown',
    'HTML': 'html',
    'Text': 'text',
    'Screenshot': 'screenshot',
    'Pageshot': 'pageshot',
  };
  const formatVal = formatMap[params['Content Format']];
  if (formatVal) headers['X-Respond-With'] = formatVal;

  if (params['JSON Response'] === 'true') {
    headers['Accept'] = 'application/json';
  }

  if (params['Use ReaderLM-v2'] === 'true') {
    headers['X-Respond-With'] = headers['X-Respond-With'] ? `${headers['X-Respond-With']},readerlm-v2` : 'readerlm-v2';
  }

  if (params['Timeout (seconds)'] === 'true' && params['timeoutValue']) {
    headers['X-Timeout'] = params['timeoutValue'];
  }

  if (params['Token Budget'] === 'true' && params['tokenBudgetValue']) {
    headers['X-Token-Budget'] = params['tokenBudgetValue'];
  }

  if (params['Max Tokens'] === 'true' && params['maxTokensValue']) {
    headers['X-Max-Tokens'] = params['maxTokensValue'];
  }

  if (params['Remove All Images'] === 'true') {
    headers['X-Retain-Images'] = 'none';
  }

  if (params['OpenAI Citation Format'] === 'true') {
    headers['X-Retain-Links'] = 'gpt-oss';
  }

  const linksSummaryMap = { 'None': '', 'Dedup': 'true', 'All': 'true' };
  if (linksSummaryMap[params['Links Summary Section']]) {
    headers['X-With-links-Summary'] = 'true';
  }

  const imgSummaryMap = { 'None': '', 'Dedup': 'true', 'All': 'true' };
  if (imgSummaryMap[params['Images Summary Section']]) {
    headers['X-With-Images-Summary'] = 'true';
  }

  if (params['Forward Cookie'] === 'true' && params['cookieValue']) {
    headers['X-Set-Cookie'] = params['cookieValue'];
  }

  if (params['Image Caption'] === 'true') {
    headers['X-With-Generated-Alt'] = 'true';
  }

  if (params['Use a Proxy Server'] === 'true' && params['proxyValue']) {
    headers['X-Proxy-Url'] = params['proxyValue'];
  }

  if (params['Use a Country-Specific Proxy Server'] === 'true' && params['proxyCountryValue']) {
    headers['X-Proxy'] = params['proxyCountryValue'];
  }

  if (params['Bypass Cached Content'] !== 'false') {
    headers['X-No-Cache'] = 'true';
  }

  if (params['Cache Tolerance (seconds)'] === 'true' && params['cacheToleranceValue']) {
    headers['X-Cache-Tolerance'] = params['cacheToleranceValue'];
  }

  if (params['Preserve Base64 Images'] === 'true') {
    headers['X-Keep-Img-Data-Url'] = 'true';
  }

  if (params['Do Not Cache or Track'] === 'true') {
    headers['DNT'] = '1';
  }

  const gfmMap = { 'Enabled': '', 'Disabled': 'true', 'No GFM Table': 'no-table' };
  if (gfmMap[params['Github Flavored Markdown']]) {
    headers['X-No-Gfm'] = gfmMap[params['Github Flavored Markdown']];
  }

  if (params['Stream Mode'] === 'true') {
    headers['Accept'] = 'text/event-stream';
  }

  if (params['Customize Browser Locale'] === 'true' && params['localeValue']) {
    headers['X-Locale'] = params['localeValue'];
  }

  if (params['Respect robots.txt'] === 'true') {
    headers['X-Robots-Txt'] = params['robotsTxtValue'] || 'true';
  }

  const headingMap = { 'Underline Style': 'setext', 'Hash Style': 'atx' };
  const headingVal = headingMap[params['Heading Style']];
  if (headingVal) headers['X-Md-Heading-Style'] = headingVal;

  if (params['Horizontal Rule Style'] === 'true' && params['hrStyleValue']) {
    headers['X-Md-Hr'] = params['hrStyleValue'];
  }

  if (params['Bullet Point Style'] && params['Bullet Point Style'] !== '*') {
    headers['X-Md-Bullet-List-Marker'] = params['Bullet Point Style'];
  }

  if (params['Emphasis Style'] && params['Emphasis Style'] !== '_') {
    headers['X-Md-Em-Delimiter'] = params['Emphasis Style'];
  }

  if (params['Strong Emphasis Style'] && params['Strong Emphasis Style'] !== '**') {
    headers['X-Md-Strong-Delimiter'] = params['Strong Emphasis Style'];
  }

  const linkStyleMap = { 'Inline': 'inlined', 'Reference': 'referenced', 'Plain Text': 'discarded' };
  if (params['Link Style'] && params['Link Style'] !== 'Inline') {
    headers['X-Md-Link-Style'] = linkStyleMap[params['Link Style']];
  }

  if (params['Extract Only (CSS Selector)'] === 'true' && params['targetSelectorValue']) {
    headers['X-Target-Selector'] = params['targetSelectorValue'];
  }

  if (params['Wait For (CSS Selector)'] === 'true' && params['waitForSelectorValue']) {
    headers['X-Wait-For-Selector'] = params['waitForSelectorValue'];
  }

  if (params['Exclude (CSS Selector)'] === 'true' && params['removeSelectorValue']) {
    headers['X-Remove-Selector'] = params['removeSelectorValue'];
  }

  const timingMap = {
    'Default': '', 'HTML Only': 'html', 'Visible Content': 'visible-content',
    'DOM Stable': 'mutation-idle', 'Resources Loaded': 'resource-idle',
    'Media Loaded': 'media-idle', 'Network Idle': 'network-idle',
  };
  if (timingMap[params['Page Ready Timing']]) {
    headers['X-Respond-Timing'] = timingMap[params['Page Ready Timing']];
  }

  if (params['Custom User-Agent'] === 'true' && params['userAgentValue']) {
    headers['X-User-Agent'] = params['userAgentValue'];
  }

  if (params['Custom Referer'] === 'true' && params['refererValue']) {
    headers['X-Referer'] = params['refererValue'];
  }

  if (params['Include iframe Content'] === 'true') {
    headers['X-With-Iframe'] = 'true';
  }

  if (params['Include Shadow DOM'] === 'true') {
    headers['X-With-Shadow-Dom'] = 'true';
  }

  if (params['Use Final URL as Base'] === 'true') {
    headers['X-Base'] = 'final';
  }

  if (params['Local PDF/HTML file']) {
    const query = new URLSearchParams();
    query.set('html', params['Local PDF/HTML file']);
  }

  if (params['Run JavaScript Before Extraction'] === 'true' && params['injectScriptValue']) {
    const query = new URLSearchParams();
    query.set('injectPageScript', params['injectScriptValue']);
  }

  return { server, headers };
}

async function closeLoadingTab() {
  const stored = await chrome.storage.session.get('loadingTabId');
  if (stored.loadingTabId) {
    try { await chrome.tabs.remove(stored.loadingTabId); } catch {}
    await chrome.storage.session.remove('loadingTabId');
  }
}

let readPageLocked = false;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.readPageRequest) return;

  const req = changes.readPageRequest?.newValue;
  if (!req || readPageLocked) return;

  (async () => {
    readPageLocked = true;
    try {
      await chrome.storage.local.remove('readPageRequest');

      chrome.action.setBadgeText({ text: '...' });
      chrome.action.setBadgeBackgroundColor({ color: '#4fc3f7' });

      const loadingUrl = chrome.runtime.getURL('src/loading/loading.html');
      const loadingTheme = (req.theme || 'light') === 'dark' ? 'dark' : '';
      const [ltab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const loadingTab = await chrome.tabs.create({
        url: loadingUrl + (loadingTheme ? `#${loadingTheme}` : ''),
        active: true,
        index: ltab ? ltab.index + 1 : undefined,
      });
      await chrome.storage.session.set({ loadingTabId: loadingTab.id });

      const { server, headers } = buildApiRequest(req.params);
      const apiUrl = `${server}/${req.url}`;
      const resp = await fetch(apiUrl, { method: 'GET', headers });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || errorData?.detail || `API error: ${resp.status} ${resp.statusText}`
        );
      }

      const contentType = resp.headers.get('content-type') || '';
      let content;

      if (contentType.includes('application/json')) {
        const json = await resp.json();
        content = typeof json.data === 'string' ? json.data : JSON.stringify(json.data, null, 2);
      } else if (contentType.includes('text/event-stream')) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let chunks = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks += decoder.decode(value);
        }
        content = chunks;
      } else if (contentType.includes('image/')) {
        const blob = await resp.blob();
        const ext = contentType.split('/')[1].split(';')[0];
        content = await blobToBase64(blob);
        content = `data:image/${ext};base64,${content}`;
      } else {
        content = await resp.text();
      }

      const theme = req.theme || 'light';
      const mode = req.displayMode || 'new';

      await closeLoadingTab();

      if (content.startsWith('data:image/')) {
        if (mode === 'current') {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          await chrome.tabs.update(tab.id, { url: content });
        } else {
          await chrome.tabs.create({ url: content, active: true });
        }
      } else {
        await chrome.storage.session.set({ resultPage: { text: content, theme } });
        const resultUrl = chrome.runtime.getURL('src/result/result.html');
        if (mode === 'current') {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          await chrome.tabs.update(tab.id, { url: resultUrl });
        } else {
          await chrome.tabs.create({ url: resultUrl, active: true });
        }
      }
    } catch (err) {
      await closeLoadingTab();
      console.error('Jina Reader error:', err);
    } finally {
      chrome.action.setBadgeText({ text: '' });
      readPageLocked = false;
    }
  })();
});
