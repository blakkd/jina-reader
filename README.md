## Jina Reader

A Chromium extension for extracting webpage content via the [Jina Reader API](https://jina.ai).

Three configuration levels: Simple, Advanced, and Expert, from basic extraction (same as if you visited `r.jina.ai/<URL>`) to fine-grained control (browser engine, selectors, proxy, cookies, headers, and more).

<img width="400" height="598" alt="Screenshot" src="https://github.com/user-attachments/assets/6aa709cf-ee21-4a00-8e66-e15f50211a73" />

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

### Thanks

<a href="https://bottlecapai.com/"><img width="276" height="155" alt="cap_header" src="https://github.com/user-attachments/assets/af9087ea-bf97-4b3a-bfd3-00e731852a05" /></a>

_This repo is a tribute to [bottlecapai/ThinkingCap-Qwen3.6-27B](https://huggingface.co/bottlecapai/ThinkingCap-Qwen3.6-27B) and was entirely vibecoded using [ThinkingCap-Qwen3.6-27B-Q4_K_M.gguf](https://huggingface.co/bottlecapai/ThinkingCap-Qwen3.6-27B-GGUF/blob/main/ThinkingCap-Qwen3.6-27B-Q4_K_M.gguf) with [opencode](https://github.com/anomalyco/opencode), at some point using the [chrome DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp)._

_Of course, and before anything else, thanks to **Qwen** for their already exceptional Qwen3.6-27B model, to **opencode** and finally to **[Jina AI](https://jina.ai)** ❤️_
