# ⚡ Buzel Cloud Studio — Telegram Storage CDN & Multi-Tool REST API

Production-grade **Express.js (ESM)** REST API & **Supabase Studio-inspired React Dashboard** featuring zero-disk Telegram Cloud Storage CDN (`@buzelstorage`), TikTok HD Downloader, YouTube/SoundCloud MP3 Transcoder, Google Gemini Multi-Turn AI Chat, and On-Demand Cloudflare Turnstile Solver.

🌐 **Live Studio Dashboard:** [https://buzzel.duckdns.org](https://buzzel.duckdns.org)

---

## ✨ Features

- **☁️ Telegram Cloud Storage CDN (`/upload`, `/f/:id`)**
  - Streams uploaded files (up to 20 MB) directly to Telegram Cloud (`@buzelstorage`) with **0 MB local VPS disk usage**.
  - Generates clean short object keys (`/f/k9Xm2Pq7.png`) with `Cache-Control: public, max-age=31536000, immutable` and `file_path` caching.
- **📊 Supabase-Styled Studio UI (`/`, `/cdn`)**
  - **Project Overview**: Real-time system telemetry (RAM, CPU, Uptime), route latency metrics, and live HTTP request logs.
  - **Storage Explorer**: Bucket table with search, MIME filtering, and an interactive right-hand Object Inspector & media previewer.
  - **Edge Functions Tester**: Split-pane interactive playground for every endpoint.
  - **API Reference**: Two-column documentation with `cURL` & `JavaScript` snippets.
- **🎬 TikTok Downloader (`/tiktok`)**: Extracts HD watermark-free video, photo slides, author info, and MP3 audio.
- **🎵 Music Play MP3 (`/play`)**: Searches YouTube (with SoundCloud fallback) and transcodes audio to MP3 via `yt-dlp` + `ffmpeg-static`.
- **🤖 Gemini AI Chat (`/ai`, `/gemini`)**: Multi-turn conversational AI with `sessionId` continuation.
- **🤖 Bota AI Chat (`/bota`)**: Anonymous guest chat via the Bota.chat frame API — zero API key, in-memory session continuation with `chatId`, web-search tool support.
- **🛡️ Cloudflare Turnstile Solver (`/turnstile`)**: On-demand headless Chrome + Xvfb solver with automatic zero-idle cleanup.

---

## 🚀 Quick Start

```bash
git clone https://github.com/fasoft9-star/buzel-cloud-api.git
cd buzel-cloud-api
npm install
cp .env.example .env
npm run build
npm start
```

---

## 📌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload file (`multipart/form-data` field `file`) to Telegram CDN |
| `GET` | `/f/:id` | Stream/view CDN file (`?dl=1` for attachment download) |
| `GET` | `/cdn/files` | List stored CDN objects and total storage metrics |
| `DELETE` | `/cdn/files/:id` | Delete object from CDN index and Telegram channel |
| `GET / POST` | `/tiktok` | Download TikTok video or photo slide (`?url=`) |
| `GET / POST` | `/play` | Search and convert song to MP3 (`?q=`) |
| `GET / POST` | `/ai` | Chat with Google Gemini (`prompt`, optional `sessionId`) |
| `GET / POST` | `/bota` | Chat with Bota.chat AI (anonymous guest; `message`, optional `model`, `web_search`, `chatId`) |
| `GET / POST` | `/turnstile` | Solve Cloudflare Turnstile (`?url=&sitekey=`) |
| `GET` | `/api/metrics` | Real-time server telemetry & request logs |
