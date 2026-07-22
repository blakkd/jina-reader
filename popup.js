// Popup controller for Jina Reader extension

const PARAM_FILES = {
  simple: 'docs/simple_parameters.json',
  advanced: 'docs/advanced_parameters.json',
  expert: 'docs/expert_parameters.json',
};

let currentLevel = 'advanced';
let paramDefs = [];

// Mapping from friendly parameter name → API header/query param
function buildApiRequest(params) {
  const headers = {};
  const query = {};

  // Server selection
  const server = params['EU Residency'] === 'true'
    ? 'https://eu-r-beta.jina.ai'
    : 'https://r.jina.ai';

  // API Key
  if (params['Add API Key for Higher Rate Limit'] === 'true' && params['apiKey']) {
    headers['Authorization'] = `Bearer ${params['apiKey']}`;
  }

  // Browser Engine
  const engineMap = {
    'Default': '',
    'Speed First': 'curl',
    'Best Quality': 'browser',
    'Experimental': 'cf-browser-rendering',
  };
  const engineVal = engineMap[params['Browser Engine (Quality/Speed)']];
  if (engineVal) headers['X-Engine'] = engineVal;

  // Content Format
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

  // JSON Response
  if (params['JSON Response'] === 'true') {
    headers['Accept'] = 'application/json';
  }

  // User wants ReaderLM-v2
  if (params['Use ReaderLM-v2'] === 'true') {
    headers['X-Respond-With'] = headers['X-Respond-With'] ? `${headers['X-Respond-With']},readerlm-v2` : 'readerlm-v2';
  }

  // Timeout
  if (params['Timeout (seconds)'] === 'true' && params['timeoutValue']) {
    headers['X-Timeout'] = params['timeoutValue'];
  }

  // Token Budget
  if (params['Token Budget'] === 'true' && params['tokenBudgetValue']) {
    headers['X-Token-Budget'] = params['tokenBudgetValue'];
  }

  // Max Tokens
  if (params['Max Tokens'] === 'true' && params['maxTokensValue']) {
    headers['X-Max-Tokens'] = params['maxTokensValue'];
  }

  // Remove All Images
  if (params['Remove All Images'] === 'true') {
    headers['X-Retain-Images'] = 'none';
  }

  // OpenAI Citation Format
  if (params['OpenAI Citation Format'] === 'true') {
    headers['X-Retain-Links'] = 'gpt-oss';
  }

  // Links Summary Section
  const linksSummaryMap = {
    'None': '',
    'Dedup': 'true',
    'All': 'true',
  };
  if (linksSummaryMap[params['Links Summary Section']]) {
    headers['X-With-links-Summary'] = 'true';
  }

  // Images Summary Section
  const imgSummaryMap = {
    'None': '',
    'Dedup': 'true',
    'All': 'true',
  };
  if (imgSummaryMap[params['Images Summary Section']]) {
    headers['X-With-Images-Summary'] = 'true';
  }

  // Forward Cookie
  if (params['Forward Cookie'] === 'true' && params['cookieValue']) {
    headers['X-Set-Cookie'] = params['cookieValue'];
  }

  // Image Caption
  if (params['Image Caption'] === 'true') {
    headers['X-With-Generated-Alt'] = 'true';
  }

  // Proxy
  if (params['Use a Proxy Server'] === 'true' && params['proxyValue']) {
    headers['X-Proxy-Url'] = params['proxyValue'];
  }

  // Country-Specific Proxy
  if (params['Use a Country-Specific Proxy Server'] === 'true' && params['proxyCountryValue']) {
    headers['X-Proxy'] = params['proxyCountryValue'];
  }

  // Bypass Cached Content (always enabled)
  headers['X-No-Cache'] = 'true';

  // Cache Tolerance
  if (params['Cache Tolerance (seconds)'] === 'true' && params['cacheToleranceValue']) {
    headers['X-Cache-Tolerance'] = params['cacheToleranceValue'];
  }

  // Preserve Base64 Images
  if (params['Preserve Base64 Images'] === 'true') {
    headers['X-Keep-Img-Data-Url'] = 'true';
  }

  // Do Not Cache or Track
  if (params['Do Not Cache or Track'] === 'true') {
    headers['DNT'] = '1';
  }

  // Github Flavored Markdown
  const gfmMap = {
    'Enabled': '',
    'Disabled': 'true',
    'No GFM Table': 'no-table',
  };
  if (gfmMap[params['Github Flavored Markdown']]) {
    headers['X-No-Gfm'] = gfmMap[params['Github Flavored Markdown']];
  }

  // Stream Mode
  if (params['Stream Mode'] === 'true') {
    headers['Accept'] = 'text/event-stream';
  }

  // Browser Locale
  if (params['Customize Browser Locale'] === 'true' && params['localeValue']) {
    headers['X-Locale'] = params['localeValue'];
  }

  // robots.txt
  if (params['Respect robots.txt'] === 'true') {
    const robotsVal = params['robotsTxtValue'] || 'true';
    headers['X-Robots-Txt'] = robotsVal;
  }

  // Heading Style
  const headingMap = {
    'Underline Style': 'setext',
    'Hash Style': 'atx',
  };
  const headingVal = headingMap[params['Heading Style']];
  if (headingVal) headers['X-Md-Heading-Style'] = headingVal;

  // Horizontal Rule Style
  if (params['Horizontal Rule Style'] === 'true' && params['hrStyleValue']) {
    headers['X-Md-Hr'] = params['hrStyleValue'];
  }

  // Bullet Point Style
  // Default is * so only set if changed
  if (params['Bullet Point Style'] && params['Bullet Point Style'] !== '*') {
    headers['X-Md-Bullet-List-Marker'] = params['Bullet Point Style'];
  }

  // Emphasis Style
  if (params['Emphasis Style'] && params['Emphasis Style'] !== '_') {
    headers['X-Md-Em-Delimiter'] = params['Emphasis Style'];
  }

  // Strong Emphasis Style
  if (params['Strong Emphasis Style'] && params['Strong Emphasis Style'] !== '**') {
    headers['X-Md-Strong-Delimiter'] = params['Strong Emphasis Style'];
  }

  // Link Style
  const linkStyleMap = {
    'Inline': 'inlined',
    'Reference': 'referenced',
    'Plain Text': 'discarded',
  };
  if (params['Link Style'] && params['Link Style'] !== 'Inline') {
    headers['X-Md-Link-Style'] = linkStyleMap[params['Link Style']];
  }

  // Expert-only params

  // Extract Only (CSS Selector)
  if (params['Extract Only (CSS Selector)'] === 'true' && params['targetSelectorValue']) {
    headers['X-Target-Selector'] = params['targetSelectorValue'];
  }

  // Wait For (CSS Selector)
  if (params['Wait For (CSS Selector)'] === 'true' && params['waitForSelectorValue']) {
    headers['X-Wait-For-Selector'] = params['waitForSelectorValue'];
  }

  // Exclude (CSS Selector)
  if (params['Exclude (CSS Selector)'] === 'true' && params['removeSelectorValue']) {
    headers['X-Remove-Selector'] = params['removeSelectorValue'];
  }

  // Browser Viewport Size
  if (params['Browser Viewport Size'] === 'true' && params['viewportValue']) {
    // This is a non-standard param, we pass it if the API accepts it
    // For now skip since it's not in the OpenAPI spec
  }

  // Page Ready Timing
  const timingMap = {
    'Default': '',
    'HTML Only': 'html',
    'Visible Content': 'visible-content',
    'DOM Stable': 'mutation-idle',
    'Resources Loaded': 'resource-idle',
    'Media Loaded': 'media-idle',
    'Network Idle': 'network-idle',
  };
  if (timingMap[params['Page Ready Timing']]) {
    headers['X-Respond-Timing'] = timingMap[params['Page Ready Timing']];
  }

  // Custom User-Agent
  if (params['Custom User-Agent'] === 'true' && params['userAgentValue']) {
    headers['X-User-Agent'] = params['userAgentValue'];
  }

  // Custom Referer
  if (params['Custom Referer'] === 'true' && params['refererValue']) {
    headers['X-Referer'] = params['refererValue'];
  }

  // Include iframe Content
  if (params['Include iframe Content'] === 'true') {
    headers['X-With-Iframe'] = 'true';
  }

  // Include Shadow DOM
  if (params['Include Shadow DOM'] === 'true') {
    headers['X-With-Shadow-Dom'] = 'true';
  }

  // Use Final URL as Base
  if (params['Use Final URL as Base'] === 'true') {
    headers['X-Base'] = 'final';
  }

  // Local PDF/HTML file (passed as query param)
  if (params['Local PDF/HTML file']) {
    query['html'] = params['Local PDF/HTML file'];
  }

  // Run JavaScript Before Extraction
  if (params['Run JavaScript Before Extraction'] === 'true' && params['injectScriptValue']) {
    query['injectPageScript'] = params['injectScriptValue'];
  }

  return { server, headers };
}

// Render parameter fields
function renderParams(defs) {
  const container = document.getElementById('parameters');
  container.innerHTML = '';

  defs.forEach((def) => {
    const item = document.createElement('div');
    item.className = 'param-item';
    item.dataset.name = def.name;

    const header = document.createElement('div');
    header.className = 'param-header';

    const label = document.createElement('span');
    label.className = 'param-label';
    label.textContent = def.name;

    if (def.fieldType === 'toggle') {
      const toggle = document.createElement('label');
      toggle.className = 'toggle';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.param = def.name;
      input.checked = def.value === 'true';
      input.addEventListener('change', (e) => {
        handleParamChange(def.name, e.target.checked ? 'true' : 'false', def);
      });

      const slider = document.createElement('span');
      slider.className = 'toggle-slider';

      toggle.appendChild(input);
      toggle.appendChild(slider);
      header.appendChild(label);
      header.appendChild(toggle);
    } else if (def.fieldType === 'select') {
      const select = document.createElement('select');
      select.className = 'param-select';
      select.dataset.param = def.name;

      (def.options || []).forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.label;
        option.textContent = opt.label;
        if (opt.description) option.title = opt.description;
        if (opt.label === def.value) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        handleParamChange(def.name, e.target.value, def);
      });

      header.appendChild(label);
      header.appendChild(select);
    } else if (def.fieldType === 'input') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'param-select';
      input.style.flex = '1';
      input.style.maxWidth = '180px';
      input.dataset.param = def.name;
      input.value = def.value || '';
      input.placeholder = 'Enter value';

      input.addEventListener('input', (e) => {
        handleParamChange(def.name, e.target.value, def);
      });

      header.appendChild(label);
      header.appendChild(input);
    }

    item.appendChild(header);

    // Description
    if (def.description) {
      const desc = document.createElement('div');
      desc.className = 'param-desc';
      desc.textContent = def.description;
      item.appendChild(desc);
    }

    // Extra input for toggle params
    if (def.fieldType === 'toggle') {
      const extra = createExtraInput(def);
      if (extra) {
        extra.classList.toggle('visible', def.value === 'true');
        item.appendChild(extra);
      }
    }

    container.appendChild(item);
  });
}

function createExtraInput(def) {
  const extra = document.createElement('div');
  extra.className = 'param-extra';
  extra.dataset.param = def.name;

  const inputMap = {
    'Add API Key for Higher Rate Limit': { type: 'text', placeholder: 'jina_xxxx...', key: 'apiKey' },
    'Timeout (seconds)': { type: 'number', placeholder: '60', key: 'timeoutValue' },
    'Token Budget': { type: 'number', placeholder: '10000', key: 'tokenBudgetValue' },
    'Max Tokens': { type: 'number', placeholder: '50000', key: 'maxTokensValue' },
    'Forward Cookie': { type: 'text', placeholder: 'key=value; key2=value2', key: 'cookieValue' },
    'Use a Proxy Server': { type: 'text', placeholder: 'http://user:pass@host:port', key: 'proxyValue' },
    'Use a Country-Specific Proxy Server': { type: 'text', placeholder: 'US, auto, none', key: 'proxyCountryValue' },
    'Cache Tolerance (seconds)': { type: 'number', placeholder: '3600', key: 'cacheToleranceValue' },
    'Customize Browser Locale': { type: 'text', placeholder: 'en-US', key: 'localeValue' },
    'Respect robots.txt': { type: 'text', placeholder: 'Googlebot (optional)', key: 'robotsTxtValue' },
    'Horizontal Rule Style': { type: 'text', placeholder: '***', key: 'hrStyleValue' },
    'Extract Only (CSS Selector)': { type: 'text', placeholder: 'article, .main-content', key: 'targetSelectorValue' },
    'Wait For (CSS Selector)': { type: 'text', placeholder: '.content-loaded', key: 'waitForSelectorValue' },
    'Exclude (CSS Selector)': { type: 'text', placeholder: 'nav, footer, #ads', key: 'removeSelectorValue' },
    'Browser Viewport Size': { type: 'text', placeholder: '1280,720', key: 'viewportValue' },
    'Custom User-Agent': { type: 'text', placeholder: 'Mozilla/5.0 ...', key: 'userAgentValue' },
    'Custom Referer': { type: 'text', placeholder: 'https://example.com', key: 'refererValue' },
    'Run JavaScript Before Extraction': { type: 'textarea', placeholder: 'document.querySelector("body").style.fontSize = "16px";', key: 'injectScriptValue' },
    'Local PDF/HTML file': { type: 'text', placeholder: '<html>...</html>', key: null },
  };

  const config = inputMap[def.name];
  if (!config) return null;

  let input;
  if (config.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
  } else {
    input = document.createElement('input');
    input.type = config.type;
  }

  input.placeholder = config.placeholder;
  input.dataset.key = config.key || def.name;

  input.value = '';
  input.addEventListener('input', (e) => {
    handleParamChange(config.key || def.name, e.target.value, def);
  });

  extra.appendChild(input);
  return extra;
}

function isSharedParam(name) {
  return name === 'Add API Key for Higher Rate Limit' || name === 'apiKey';
}

function paramKey(name) {
  return isSharedParam(name) ? `param_${name}` : `param_${currentLevel}_${name}`;
}

async function handleParamChange(name, value, def) {
  // Save to storage (level-specific, except API key which is shared)
  await chrome.storage.local.set({ [paramKey(name)]: value });

  // Toggle extra visibility
  if (def.fieldType === 'toggle') {
    const item = document.querySelector(`.param-item[data-name="${def.name}"]`);
    const extra = item?.querySelector('.param-extra');
    if (extra) {
      extra.classList.toggle('visible', value === 'true');

      // Restore stored value into the extra input
      const key = extra.dataset.param;
      const storedKey = extra.querySelector('input, textarea')?.dataset.key;
      if (storedKey) {
        const key = paramKey(storedKey);
        const stored = await chrome.storage.local.get(key);
        const inputEl = extra.querySelector('input, textarea');
        if (inputEl && stored[key] !== undefined) {
          inputEl.value = stored[key];
        }
      }
    }
  }
}

// Switch level
async function switchLevel(level) {
  currentLevel = level;
  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });

  await chrome.storage.local.set({ level });
  await loadParams(level);
}

async function loadParams(level) {
  try {
    const resp = await fetch(PARAM_FILES[level]);
    const data = await resp.json();
    paramDefs = data.parameters;

    // Restore all stored values (both param toggles/selects and extra inputs)
    const allStored = await chrome.storage.local.get(null);

    paramDefs.forEach((def) => {
      const storedKey = paramKey(def.name);
      if (allStored[storedKey] !== undefined) {
        def.value = allStored[storedKey];
      }
    });

    renderParams(paramDefs);

    // Restore extra input values
    document.querySelectorAll('.param-extra input, .param-extra textarea').forEach((el) => {
      const key = el.dataset.key;
      if (key) {
        const storedKey = paramKey(key);
        if (allStored[storedKey] !== undefined) {
          el.value = allStored[storedKey];
        }
      }
    });
  } catch (err) {
    console.error('Failed to load parameters:', err);
  }
}

// Read page handler
async function readPage() {
  const btn = document.getElementById('readBtn');
  const errorBox = document.getElementById('errorBox');
  const urlInput = document.getElementById('targetUrl');
  const displayMode = document.getElementById('displayMode').value;

  // Hide previous errors
  errorBox.hidden = true;

  // Get target URL
  let url = urlInput.value.trim();
  if (!url) {
    // Try to get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      url = tab.url;
      urlInput.value = url;
    }
  }

  if (!url) {
    showError('No URL available. Enter a URL or navigate to a page first.');
    return;
  }

  // Disable button and show loader
  btn.disabled = true;
  btn.querySelector('.btn-text').hidden = true;
  btn.querySelector('.btn-loader').hidden = false;

  try {
    // Collect all parameter values
    const paramStore = await chrome.storage.local.get(
      paramDefs.map((p) => paramKey(p.name))
    );

    const params = {};
    paramDefs.forEach((def) => {
      const storedKey = paramKey(def.name);
      params[def.name] = paramStore[storedKey] ?? def.value;
    });

    // Also collect extra input values
    document.querySelectorAll('.param-extra input, .param-extra textarea').forEach((el) => {
      const key = el.dataset.key;
      if (key) {
        const storedKey = paramKey(key);
        const storedVal = paramStore[storedKey];
        params[key] = storedVal ?? el.value;
      }
    });

    // Build API request
    const { server, headers } = buildApiRequest(params);

    // Make the request
    const apiUrl = `${server}/${url}`;
    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

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
      content = json.data || '';
    } else if (contentType.includes('text/event-stream')) {
      // For SSE, collect all events
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let chunks = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks += decoder.decode(value);
      }
      content = chunks;
    } else {
      content = await resp.text();
    }

    // Display result
    await displayResult(content, displayMode);
  } catch (err) {
    showError(err.message || 'An unknown error occurred.');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').hidden = false;
    btn.querySelector('.btn-loader').hidden = true;
  }
}

async function displayResult(content, mode) {
  const resultHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
    line-height: 1.7;
    color: #1a1a1a;
    font-size: 15px;
  }
  h1 { font-size: 24px; margin-bottom: 16px; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { font-size: 13px; }
  a { color: #2563eb; }
  img { max-width: 100%; }
  .jina-banner {
    background: #2563eb;
    color: white;
    padding: 8px 16px;
    font-size: 12px;
    text-align: center;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  .jina-banner a { color: white; }
</style>
</head>
<body>
<div class="jina-banner">Extracted by <a href="https://jina.ai" target="_blank">Jina Reader</a></div>
${content}
</body>
</html>`;

  const blob = new Blob([resultHtml], { type: 'text/html' });
  const dataUrl = URL.createObjectURL(blob);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (mode === 'current') {
    await chrome.tabs.update(tab.id, { url: dataUrl });
  } else {
    await chrome.tabs.create({ url: dataUrl, active: true });
  }

  // Close popup after action
  window.close();
}

function showError(msg) {
  const errorBox = document.getElementById('errorBox');
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Restore level from storage
  const stored = await chrome.storage.local.get('level');
  const level = stored.level || 'advanced';

  // Show current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      document.getElementById('targetUrl').value = tab.url;
    }
  } catch {}

  // Restore display mode
  const displayStored = await chrome.storage.local.get('displayMode');
  if (displayStored.displayMode) {
    document.getElementById('displayMode').value = displayStored.displayMode;
  }

  // Bind events
  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.level === level);
    btn.addEventListener('click', () => switchLevel(btn.dataset.level));
  });

  document.getElementById('readBtn').addEventListener('click', readPage);

  document.getElementById('displayMode').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ displayMode: e.target.value });
  });

  // Load params
  await loadParams(level);
});
