## Jina Reader

Chrome extension for extracting webpage content via the [Jina Reader API](https://jina.ai).

Three configuration levels: Simple, Advanced, and Expert, from basic extraction (same as if you visited `r.jina.ai/<URL>`) to fine-grained control (browser engine, selectors, proxy, cookies, headers, and more).

![Simple level](docs/screenshots/simple.png)

![Advanced level](docs/screenshots/advanced.png)

![Expert level](docs/screenshots/expert.png)

### Installation

Get the extension files either by cloning the repository:

```bash
git clone https://github.com/blakkd/jina-reader-extension
cd jina-reader-extension
```

Or by downloading the latest release archive and extracting it.

Then:

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked** and select the `jina-reader-extension` directory
4. The Jina Reader icon will appear in your toolbar

### API Key

Optional. The extension works without one, but an API key provides higher rate limits. Get one at [jina.ai](https://jina.ai).
