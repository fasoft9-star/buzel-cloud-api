import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function DocsView({ baseUrl, showToast }) {
  const [lang, setLang] = useState('curl');
  const [copiedIdx, setCopiedIdx] = useState(null);

  const endpoints = [
    {
      method: 'POST',
      path: '/upload',
      title: 'Upload Object to Bucket',
      desc: 'Uploads a binary file (up to 20 MB) into the Telegram-backed buzelstorage bucket.',
      params: [{ name: 'file', type: 'File (multipart/form-data)', req: true }],
      curl: `curl -X POST "${baseUrl}/upload" \\\n  -F "file=@./image.png"`,
      js: `const form = new FormData();\nform.append('file', fileInput.files[0]);\n\nconst res = await fetch('${baseUrl}/upload', {\n  method: 'POST',\n  body: form,\n});\nconst data = await res.json();`,
    },
    {
      method: 'GET',
      path: '/f/:id',
      title: 'Retrieve Public Object',
      desc: 'Streams the stored object with immutable cache headers. Append ?dl=1 to force attachment download.',
      params: [
        { name: 'id', type: 'string (path)', req: true },
        { name: 'dl', type: 'string ("1" optional)', req: false },
      ],
      curl: `curl -L "${baseUrl}/f/k9Xm2Pq7.png"`,
      js: `const objectUrl = '${baseUrl}/f/k9Xm2Pq7.png';\nwindow.open(objectUrl, '_blank');`,
    },
    {
      method: 'GET / POST',
      path: '/tiktok',
      title: 'TikTok Media Extractor',
      desc: 'Extracts HD watermark-free video streams, photo carousels, author profile, and MP3 audio.',
      params: [{ name: 'url', type: 'string (TikTok URL)', req: true }],
      curl: `curl "${baseUrl}/tiktok?url=https://vt.tiktok.com/ZS..."`,
      js: `const res = await fetch('${baseUrl}/tiktok?url=' + encodeURIComponent(tiktokUrl));\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/ig',
      title: 'Instagram Reels, Video & Carousel Downloader',
      desc: 'Extracts Instagram photo, video, carousel, and reels metadata & direct media URLs.',
      params: [{ name: 'url', type: 'string (Instagram URL or shortcode)', req: true }],
      curl: `curl "${baseUrl}/ig?url=https://www.instagram.com/reel/..."`,
      js: `const res = await fetch('${baseUrl}/ig?url=' + encodeURIComponent(igUrl));\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/pinterest',
      title: 'Pinterest API (Search, Pin Video/Image Downloader, Stalk & Lens)',
      desc: 'Hits Pinterest v3 Android API with OAuth HMAC-SHA256 signature to search pins, download 720p videos & original images, stalk user profiles/boards, and run visual Lens search.',
      params: [
        { name: 'q', type: 'string (Query, Pin URL/ID, or @username)', req: true },
        { name: 'action', type: 'string (search | download | stalk | lens — auto-detected if omitted)', req: false },
        { name: 'limit', type: 'number (default: 12)', req: false },
      ],
      curl: `curl "${baseUrl}/pinterest?q=cyberpunk%20anime&action=search&limit=6"`,
      js: `const res = await fetch('${baseUrl}/pinterest?q=cyberpunk+anime&action=search');\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/ytmusic',
      title: 'YouTube Music API (Track, Stream, Search, Lyrics & Charts)',
      desc: 'Full YouTube Music Innertube wrapper supporting track stream, lyrics, search, download (MP3/M4A), albums, artists, playlists, charts, and explore.',
      params: [
        { name: 'q', type: 'string (Query, videoId, browseId, or URL)', req: true },
        { name: 'action', type: 'string (track | search | download | lyrics | queue | album | artist | playlist | charts | explore)', req: false },
        { name: 'format', type: 'string (m4a | mp3, for action=download)', req: false },
      ],
      curl: `curl "${baseUrl}/ytmusic?q=Hindia%20Evaluasi&action=track"`,
      js: `const res = await fetch('${baseUrl}/ytmusic?q=Hindia+Evaluasi&action=track');\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/play',
      title: 'Audio Search & MP3 Transcoder',
      desc: 'Searches YouTube (with SoundCloud fallback), converts audio to MP3, and returns a cached stream URL.',
      params: [{ name: 'q', type: 'string (Search query)', req: true }],
      curl: `curl "${baseUrl}/play?q=Hindia%20Evaluasi"`,
      js: `const res = await fetch('${baseUrl}/play?q=Hindia+Evaluasi');\nconst { audioUrl, title } = await res.json();`,
    },
    {
      method: 'POST',
      path: '/ai',
      title: 'Gemini AI Conversation',
      desc: 'Executes a prompt against Google Gemini with persistent multi-turn sessionId support.',
      params: [
        { name: 'prompt', type: 'string', req: true },
        { name: 'sessionId', type: 'string', req: false },
      ],
      curl: `curl -X POST "${baseUrl}/ai" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt":"Explain edge computing"}'`,
      js: `const res = await fetch('${baseUrl}/ai', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ prompt: 'Hello', sessionId }),\n});\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/bota',
      title: 'Bota.chat AI Agent (Web Search & Session)',
      desc: 'Executes a conversational prompt with optional live web search and multi-turn chatId continuation.',
      params: [
        { name: 'message', type: 'string (or prompt / q)', req: true },
        { name: 'webSearch', type: 'boolean (optional)', req: false },
        { name: 'chatId', type: 'string (optional)', req: false },
      ],
      curl: `curl -X POST "${baseUrl}/bota" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message":"Berita teknologi hari ini","webSearch":true}'`,
      js: `const res = await fetch('${baseUrl}/bota', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ message: 'Halo!', webSearch: true, chatId }),\n});\nconst data = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/bratvid',
      title: 'Animated 60FPS Brat Video & GIF Maker',
      desc: 'Renders 1000x1000 60FPS animated Brat pop-in videos (MP4 or GIF) with Apple emojis, metallic sheen, and theme/blur customization.',
      params: [
        { name: 'text', type: 'string (or q / prompt)', req: true },
        { name: 'theme', type: 'string ("white" | "green" | "black")', req: false },
        { name: 'blur', type: 'number (0 - 3)', req: false },
        { name: 'format', type: 'string ("mp4" | "gif")', req: false },
      ],
      curl: `curl "${baseUrl}/bratvid?text=YANG%20INI%20ANAK%20BAIK%F0%9F%98%AD%F0%9F%A4%A9&theme=white&format=mp4"`,
      js: `const res = await fetch('${baseUrl}/bratvid', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ text: 'YANG INI ANAK BAIK😭🤩', theme: 'white', blur: 0, format: 'mp4' }),\n});\nconst { url } = await res.json();`,
    },
    {
      method: 'GET / POST',
      path: '/turnstile',
      title: 'Cloudflare Turnstile Solver',
      desc: 'Launches an isolated headless browser instance to solve Cloudflare Turnstile and return cf-turnstile-response.',
      params: [
        { name: 'url', type: 'string (Page URL)', req: true },
        { name: 'sitekey', type: 'string (Turnstile sitekey)', req: true },
      ],
      curl: `curl "${baseUrl}/turnstile?url=https://example.com&sitekey=0x4AAAAAA..."`,
      js: `const res = await fetch('${baseUrl}/turnstile?url=...&sitekey=...');\nconst { token } = await res.json();`,
    },
  ];

  const handleCopy = async (text, idx) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast('Snippet copied to clipboard');
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden divide-y divide-[#2e2e2e]">
      <div className="px-4 py-3 bg-[#1c1c1c] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
            REST API Reference
          </h3>
        </div>
        <div className="flex bg-[#121212] border border-[#2e2e2e] rounded p-0.5 text-xs font-mono">
          <button
            onClick={() => setLang('curl')}
            className={`px-2.5 py-1 rounded ${
              lang === 'curl' ? 'bg-[#242424] text-[#3ecf8e]' : 'text-[#898989] hover:text-white'
            }`}
          >
            cURL
          </button>
          <button
            onClick={() => setLang('js')}
            className={`px-2.5 py-1 rounded ${
              lang === 'js' ? 'bg-[#242424] text-[#3ecf8e]' : 'text-[#898989] hover:text-white'
            }`}
          >
            JavaScript
          </button>
        </div>
      </div>

      {endpoints.map((ep, idx) => {
        const code = lang === 'curl' ? ep.curl : ep.js;
        return (
          <div key={idx} className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-6 p-5 space-y-3 border-b lg:border-b-0 lg:border-r border-[#2e2e2e]">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 font-mono text-[10px]">
                  {ep.method}
                </span>
                <code className="font-mono text-xs font-semibold text-white">{ep.path}</code>
              </div>
              <h4 className="text-sm font-semibold text-white">{ep.title}</h4>
              <p className="text-xs text-[#898989] leading-relaxed">{ep.desc}</p>

              <div className="pt-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#898989] mb-1.5">
                  Parameters
                </p>
                <div className="border border-[#2e2e2e] rounded divide-y divide-[#2e2e2e] bg-[#121212]">
                  {ep.params.map((p, i) => (
                    <div key={i} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                      <span className="text-white">
                        {p.name}{' '}
                        {p.req && <span className="text-red-400 text-[10px]">*required</span>}
                      </span>
                      <span className="text-[#898989] text-[11px]">{p.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#121212] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#898989]">
                    {lang === 'curl' ? 'Bash / cURL' : 'JavaScript (Fetch)'}
                  </span>
                  <button
                    onClick={() => handleCopy(code, idx)}
                    className="text-[11px] font-mono text-[#898989] hover:text-white flex items-center gap-1"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-3.5 h-3.5 text-[#3ecf8e]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-xs font-mono text-[#3ecf8e] overflow-x-auto leading-relaxed">
                  {code}
                </pre>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
