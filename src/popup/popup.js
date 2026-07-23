// Popup controller for Jina Reader extension

const PARAM_FILES = {
  simple: '../params/simple.json',
  advanced: '../params/advanced.json',
  expert: '../params/expert.json',
};

let currentLevel = 'advanced';
let paramDefs = [];

// Defaults for ALL parameters across every level, so switching to a lower
// level never inherits values from a higher level.
const ALL_DEFAULTS = {
  'Add API Key for Higher Rate Limit': 'false',
  'Browser Engine (Quality/Speed)': 'Default',
  'Content Format': 'Default',
  'JSON Response': 'false',
  'Timeout (seconds)': 'false',
  'Token Budget': 'false',
  'Max Tokens': 'false',
  'Use ReaderLM-v2': 'false',
  'Extract Only (CSS Selector)': 'false',
  'Wait For (CSS Selector)': 'false',
  'Exclude (CSS Selector)': 'false',
  'Remove All Images': 'false',
  'OpenAI Citation Format': 'false',
  'Links Summary Section': 'None',
  'Images Summary Section': 'None',
  'Browser Viewport Size': 'false',
  'Forward Cookie': 'false',
  'Image Caption': 'false',
  'Use a Proxy Server': 'false',
  'Use a Country-Specific Proxy Server': 'false',
  'Bypass Cached Content': 'true',
  'Cache Tolerance (seconds)': 'false',
  'Page Ready Timing': 'Default',
  'Custom User-Agent': 'false',
  'Custom Referer': 'false',
  'Preserve Base64 Images': 'false',
  'Do Not Cache or Track': 'false',
  'Github Flavored Markdown': 'Enabled',
  'Stream Mode': 'false',
  'Customize Browser Locale': 'false',
  'Respect robots.txt': 'false',
  'Include iframe Content': 'false',
  'Include Shadow DOM': 'false',
  'Use Final URL as Base': 'false',
  'Local PDF/HTML file': '',
  'Run JavaScript Before Extraction': 'false',
  'Heading Style': 'Hash Style',
  'Horizontal Rule Style': 'false',
  'Bullet Point Style': '*',
  'Emphasis Style': '_',
  'Strong Emphasis Style': '**',
  'Link Style': 'Inline',
  'EU Residency': 'false',
};

// Mapping from friendly parameter name → API header/query param
function buildApiRequest(params) {
  const headers = {};
  const query = {};

  // Start with defaults for EVERY parameter, then override with what the
  // current level exposes. This prevents higher-level settings from leaking
  // into lower levels.
  const merged = { ...ALL_DEFAULTS, ...params };

  // Server selection
  const server = merged['EU Residency'] === 'true'
    ? 'https://eu-r-beta.jina.ai'
    : 'https://r.jina.ai';

  // API Key
  if (merged['Add API Key for Higher Rate Limit'] === 'true' && merged['apiKey']) {
    headers['Authorization'] = `Bearer ${merged['apiKey']}`;
  }

  // Browser Engine
  const engineMap = {
    'Default': '',
    'Speed First': 'curl',
    'Best Quality': 'browser',
    'Experimental': 'cf-browser-rendering',
  };
  const engineVal = engineMap[merged['Browser Engine (Quality/Speed)']];
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
  const formatVal = formatMap[merged['Content Format']];
  if (formatVal) headers['X-Respond-With'] = formatVal;

  // JSON Response
  if (merged['JSON Response'] === 'true') {
    headers['Accept'] = 'application/json';
  }

  // User wants ReaderLM-v2
  if (merged['Use ReaderLM-v2'] === 'true') {
    headers['X-Respond-With'] = headers['X-Respond-With'] ? `${headers['X-Respond-With']},readerlm-v2` : 'readerlm-v2';
  }

  // Timeout
  if (merged['Timeout (seconds)'] === 'true' && merged['timeoutValue']) {
    headers['X-Timeout'] = merged['timeoutValue'];
  }

  // Token Budget
  if (merged['Token Budget'] === 'true' && merged['tokenBudgetValue']) {
    headers['X-Token-Budget'] = merged['tokenBudgetValue'];
  }

  // Max Tokens
  if (merged['Max Tokens'] === 'true' && merged['maxTokensValue']) {
    const maxTokensNum = parseInt(merged['maxTokensValue'], 10);
    if (isNaN(maxTokensNum) || maxTokensNum < 500) {
      throw new Error('Max Tokens must be at least 500.');
    }
    headers['X-Max-Tokens'] = merged['maxTokensValue'];
  }

  // Remove All Images
  if (merged['Remove All Images'] === 'true') {
    headers['X-Retain-Images'] = 'none';
  }

  // OpenAI Citation Format
  if (merged['OpenAI Citation Format'] === 'true') {
    headers['X-Retain-Links'] = 'gpt-oss';
  }

  // Links Summary Section
  const linksSummaryMap = {
    'None': '',
    'Dedup': 'true',
    'All': 'true',
  };
  if (linksSummaryMap[merged['Links Summary Section']]) {
    headers['X-With-links-Summary'] = 'true';
  }

  // Images Summary Section
  const imgSummaryMap = {
    'None': '',
    'Dedup': 'true',
    'All': 'true',
  };
  if (imgSummaryMap[merged['Images Summary Section']]) {
    headers['X-With-Images-Summary'] = 'true';
  }

  // Forward Cookie
  if (merged['Forward Cookie'] === 'true' && merged['cookieValue']) {
    headers['X-Set-Cookie'] = merged['cookieValue'];
  }

  // Image Caption
  if (merged['Image Caption'] === 'true') {
    headers['X-With-Generated-Alt'] = 'true';
  }

  // Proxy
  if (merged['Use a Proxy Server'] === 'true' && merged['proxyValue']) {
    headers['X-Proxy-Url'] = merged['proxyValue'];
  }

  // Country-Specific Proxy
  if (merged['Use a Country-Specific Proxy Server'] === 'true' && merged['proxyCountryValue']) {
    headers['X-Proxy'] = merged['proxyCountryValue'];
  }

  // Bypass Cached Content (defaults to true for Simple level)
  if (merged['Bypass Cached Content'] !== 'false') {
    headers['X-No-Cache'] = 'true';
  }

  // Cache Tolerance
  if (merged['Cache Tolerance (seconds)'] === 'true' && merged['cacheToleranceValue']) {
    headers['X-Cache-Tolerance'] = merged['cacheToleranceValue'];
  }

  // Preserve Base64 Images
  if (merged['Preserve Base64 Images'] === 'true') {
    headers['X-Keep-Img-Data-Url'] = 'true';
  }

  // Do Not Cache or Track
  if (merged['Do Not Cache or Track'] === 'true') {
    headers['DNT'] = '1';
  }

  // Github Flavored Markdown
  const gfmMap = {
    'Enabled': '',
    'Disabled': 'true',
    'No GFM Table': 'no-table',
  };
  if (gfmMap[merged['Github Flavored Markdown']]) {
    headers['X-No-Gfm'] = gfmMap[merged['Github Flavored Markdown']];
  }

  // Stream Mode
  if (merged['Stream Mode'] === 'true') {
    headers['Accept'] = 'text/event-stream';
  }

  // Browser Locale
  if (merged['Customize Browser Locale'] === 'true' && merged['localeValue']) {
    headers['X-Locale'] = merged['localeValue'];
  }

  // robots.txt
  if (merged['Respect robots.txt'] === 'true') {
    const robotsVal = merged['robotsTxtValue'] || 'true';
    headers['X-Robots-Txt'] = robotsVal;
  }

  // Heading Style
  const headingMap = {
    'Underline Style': 'setext',
    'Hash Style': 'atx',
  };
  const headingVal = headingMap[merged['Heading Style']];
  if (headingVal) headers['X-Md-Heading-Style'] = headingVal;

  // Horizontal Rule Style
  if (merged['Horizontal Rule Style'] === 'true' && merged['hrStyleValue']) {
    headers['X-Md-Hr'] = merged['hrStyleValue'];
  }

  // Bullet Point Style
  // Default is * so only set if changed
  if (merged['Bullet Point Style'] && merged['Bullet Point Style'] !== '*') {
    headers['X-Md-Bullet-List-Marker'] = merged['Bullet Point Style'];
  }

  // Emphasis Style
  if (merged['Emphasis Style'] && merged['Emphasis Style'] !== '_') {
    headers['X-Md-Em-Delimiter'] = merged['Emphasis Style'];
  }

  // Strong Emphasis Style
  if (merged['Strong Emphasis Style'] && merged['Strong Emphasis Style'] !== '**') {
    headers['X-Md-Strong-Delimiter'] = merged['Strong Emphasis Style'];
  }

  // Link Style
  const linkStyleMap = {
    'Inline': 'inlined',
    'Reference': 'referenced',
    'Plain Text': 'discarded',
  };
  if (merged['Link Style'] && merged['Link Style'] !== 'Inline') {
    headers['X-Md-Link-Style'] = linkStyleMap[merged['Link Style']];
  }

  // Expert-only params

  // Extract Only (CSS Selector)
  if (merged['Extract Only (CSS Selector)'] === 'true' && merged['targetSelectorValue']) {
    headers['X-Target-Selector'] = merged['targetSelectorValue'];
  }

  // Wait For (CSS Selector)
  if (merged['Wait For (CSS Selector)'] === 'true' && merged['waitForSelectorValue']) {
    headers['X-Wait-For-Selector'] = merged['waitForSelectorValue'];
  }

  // Exclude (CSS Selector)
  if (merged['Exclude (CSS Selector)'] === 'true' && merged['removeSelectorValue']) {
    headers['X-Remove-Selector'] = merged['removeSelectorValue'];
  }

  // Browser Viewport Size
  if (merged['Browser Viewport Size'] === 'true' && merged['viewportValue']) {
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
  if (timingMap[merged['Page Ready Timing']]) {
    headers['X-Respond-Timing'] = timingMap[merged['Page Ready Timing']];
  }

  // Custom User-Agent
  if (merged['Custom User-Agent'] === 'true' && merged['userAgentValue']) {
    headers['X-User-Agent'] = merged['userAgentValue'];
  }

  // Custom Referer
  if (merged['Custom Referer'] === 'true' && merged['refererValue']) {
    headers['X-Referer'] = merged['refererValue'];
  }

  // Include iframe Content
  if (merged['Include iframe Content'] === 'true') {
    headers['X-With-Iframe'] = 'true';
  }

  // Include Shadow DOM
  if (merged['Include Shadow DOM'] === 'true') {
    headers['X-With-Shadow-Dom'] = 'true';
  }

  // Use Final URL as Base
  if (merged['Use Final URL as Base'] === 'true') {
    headers['X-Base'] = 'final';
  }

  // Local PDF/HTML file (passed as query param)
  if (merged['Local PDF/HTML file']) {
    query['html'] = merged['Local PDF/HTML file'];
  }

  // Run JavaScript Before Extraction
  if (merged['Run JavaScript Before Extraction'] === 'true' && merged['injectScriptValue']) {
    query['injectPageScript'] = merged['injectScriptValue'];
  }

  return { server, headers };
}

// Render parameter fields
function renderParams(defs) {
  const container = document.getElementById('parameters');
  container.innerHTML = '';
  const level = currentLevel;

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

  // Reset button for current level
  const resetBtn = document.createElement('button');
  resetBtn.className = 'reset-btn';
  resetBtn.textContent = `Reset ${level.charAt(0).toUpperCase() + level.slice(1)} Defaults`;
  resetBtn.addEventListener('click', () => resetLevelParams(level));
  container.appendChild(resetBtn);
}

function createExtraInput(def) {
  const extra = document.createElement('div');
  extra.className = 'param-extra';
  extra.dataset.param = def.name;

  const inputMap = {
    'Add API Key for Higher Rate Limit': { type: 'password', placeholder: 'jina_xxxx...', key: 'apiKey' },
    'Timeout (seconds)': { type: 'number', placeholder: '60', key: 'timeoutValue' },
    'Token Budget': { type: 'number', placeholder: '10000', key: 'tokenBudgetValue' },
    'Max Tokens': { type: 'number', placeholder: '50000', key: 'maxTokensValue', min: 500 },
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

  // Don't set input.min — let the value go below min so our JS can
  // clamp it and show the error. Browser-native min blocks the step
  // silently, preventing any event from firing.

  let errorSpan = null;

  const showError = (autoDismiss = true) => {
    if (!errorSpan) return;
    const val = parseInt(input.value, 10);
    const isValid = isNaN(val) || !input.value || val >= config.min;
    errorSpan.classList.toggle('show', !isValid);
    if (!isValid) {
      // Auto-correct to minimum
      if (input.value !== String(config.min)) {
        input.value = config.min;
      }
      if (autoDismiss) {
        clearTimeout(errorSpan._timer);
        errorSpan._timer = setTimeout(() => { errorSpan.classList.remove('show'); }, 2500);
      }
    }
  };

  if (config.min != null) {
    errorSpan = document.createElement('span');
    errorSpan.className = 'min-value-error';
    errorSpan.textContent = `Minimum value is ${config.min}.`;
    errorSpan._validate = () => showError(false);
    extra.appendChild(errorSpan);
  }

  if (config.type === 'password') {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'key-toggle';
    toggle.textContent = '👁';
    toggle.title = 'Show/Hide key';
    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    input.addEventListener('input', (e) => {
      handleParamChange(config.key || def.name, e.target.value, null);
      showError();
    });

    wrap.appendChild(input);
    wrap.appendChild(toggle);
    extra.appendChild(wrap);

    return extra;
  }

  input.addEventListener('input', (e) => {
    handleParamChange(config.key || def.name, e.target.value, null);
    showError();
  });

  extra.appendChild(input);

  // Run initial validation synchronously to set correct error state
  showError(false);

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
  if (def && def.fieldType === 'toggle') {
    const item = document.querySelector(`.param-item[data-name="${def.name}"]`);
    const extra = item?.querySelector('.param-extra');
    if (extra) {
      extra.classList.toggle('visible', value === 'true');

      // Restore stored value into the extra input
      const param = extra.dataset.param;
      const storedKey = extra.querySelector('input, textarea')?.dataset.key;
      if (storedKey) {
        const storageKey = paramKey(storedKey);
        const stored = await chrome.storage.local.get(storageKey);
        const inputEl = extra.querySelector('input, textarea');
        if (inputEl && stored[storageKey] !== undefined) {
          inputEl.value = stored[storageKey];
        }
      }
    }
  }
}

// Reset level params to defaults
async function resetLevelParams(level) {
  const keysToRemove = paramDefs
    .filter((p) => !isSharedParam(p.name))
    .map((p) => paramKey(p.name));

  // Also remove extra input keys for this level
  document.querySelectorAll('.param-extra input, .param-extra textarea').forEach((el) => {
    const key = el.dataset.key;
    if (key && !isSharedParam(key)) {
      keysToRemove.push(paramKey(key));
    }
  });

  await chrome.storage.local.remove(keysToRemove);
  await loadParams(level);
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
  currentLevel = level;
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
          el.dispatchEvent(new InputEvent('input'));
        }
      }
    });

    // Re-validate min-value fields without auto-dismiss timer
    document.querySelectorAll('.min-value-error').forEach((span) => {
      if (span._validate) span._validate();
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
      content = typeof json.data === 'string' ? json.data : JSON.stringify(json.data, null, 2);
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
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1a1a1a';
  const bg = isDark ? '#09090b' : '#fff';
  const preBg = isDark ? '#18181b' : '#f5f5f5';
  const linkColor = isDark ? '#60a5fa' : '#2563eb';
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
    color: ${textColor};
    background: ${bg};
    font-size: 15px;
    white-space: pre-wrap;
  }
  h1 { font-size: 24px; margin-bottom: 16px; }
  pre { background: ${preBg}; padding: 12px; border-radius: 6px; overflow-x: auto; }
  code { font-size: 13px; }
  a { color: ${linkColor}; }
  img { max-width: 100%; }
</style>
</head>
<body>
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

// ── Theme helpers ──
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

async function initTheme() {
  const stored = await chrome.storage.local.get('theme');
  if (stored.theme) {
    applyTheme(stored.theme);
    return;
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Apply theme first to avoid flash
  await initTheme();

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

  document.getElementById('themeToggle').addEventListener('click', async () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    await chrome.storage.local.set({ theme: next });
  });

  // Load params
  await loadParams(level);
});
