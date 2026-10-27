import React, { useState } from 'react';
import {
  Play,
  Loader2,
  Download,
  Send,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Music,
  Globe,
} from 'lucide-react';

export default function PlaygroundView({ showToast }) {
  const [activeTool, setActiveTool] = useState('tiktok');

  const [ttUrl, setTtUrl] = useState('');
  const [ttLoading, setTtLoading] = useState(false);
  const [ttResult, setTtResult] = useState(null);
  const [ttMs, setTtMs] = useState(null);

  const [igUrl, setIgUrl] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const [igResult, setIgResult] = useState(null);
  const [igMs, setIgMs] = useState(null);

  const [pinQuery, setPinQuery] = useState('cyberpunk anime');
  const [pinAction, setPinAction] = useState('search');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinResult, setPinResult] = useState(null);
  const [pinMs, setPinMs] = useState(null);

  const [playQuery, setPlayQuery] = useState('');
  const [playLoading, setPlayLoading] = useState(false);
  const [playResult, setPlayResult] = useState(null);
  const [playMs, setPlayMs] = useState(null);

  const [ytmQuery, setYtmQuery] = useState('Hindia Evaluasi');
  const [ytmAction, setYtmAction] = useState('track');
  const [ytmLoading, setYtmLoading] = useState(false);
  const [ytmResult, setYtmResult] = useState(null);
  const [ytmMs, setYtmMs] = useState(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSessionId, setAiSessionId] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      text: 'Gemini Edge Function ready. Send a prompt below to test multi-turn conversation.',
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const [botaPrompt, setBotaPrompt] = useState('');
  const [botaChatId, setBotaChatId] = useState('');
  const [botaWebSearch, setBotaWebSearch] = useState(false);
  const [botaMessages, setBotaMessages] = useState([
    {
      role: 'assistant',
      text: 'Bota.chat AI ready. Supports multi-turn chatId and live Web Search.',
      sources: [],
    },
  ]);
  const [botaLoading, setBotaLoading] = useState(false);

  const [tsUrl, setTsUrl] = useState('https://2captcha.com/demo/cloudflare-turnstile');
  const [tsSitekey, setTsSitekey] = useState('0x4AAAAAAADnPIDROrmt1Wwj');
  const [tsLoading, setTsLoading] = useState(false);
  const [tsResult, setTsResult] = useState(null);
  const [tsMs, setTsMs] = useState(null);

  const [bratText, setBratText] = useState('YANG INI ANAK BAIK😭🤩');
  const [bratTheme, setBratTheme] = useState('white');
  const [bratBlur, setBratBlur] = useState(0);
  const [bratFormat, setBratFormat] = useState('mp4');
  const [bratLoading, setBratLoading] = useState(false);
  const [bratResult, setBratResult] = useState(null);
  const [bratMs, setBratMs] = useState(null);

  const [copiedJson, setCopiedJson] = useState(false);

  const runTiktok = async (e) => {
    e.preventDefault();
    if (!ttUrl.trim()) return showToast('Parameter "url" is required', 'error');
    setTtLoading(true);
    setTtResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`/tiktok?url=${encodeURIComponent(ttUrl.trim())}`);
      const data = await res.json();
      setTtMs(Math.round(performance.now() - t0));
      setTtResult(data);
      if (!data.success) showToast(data.error || 'Invocation failed', 'error');
    } catch {
      showToast('Failed to invoke /tiktok', 'error');
    } finally {
      setTtLoading(false);
    }
  };

  const runPlay = async (e) => {
    e.preventDefault();
    if (!playQuery.trim()) return showToast('Parameter "q" is required', 'error');
    setPlayLoading(true);
    setPlayResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`/play?q=${encodeURIComponent(playQuery.trim())}`);
      const data = await res.json();
      setPlayMs(Math.round(performance.now() - t0));
      setPlayResult(data);
      if (!data.success) showToast(data.error || 'Invocation failed', 'error');
    } catch {
      showToast('Failed to invoke /play', 'error');
    } finally {
      setPlayLoading(false);
    }
  };

  const runAi = async (e) => {
    e.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiPrompt('');
    setAiMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setAiLoading(true);
    try {
      const res = await fetch('/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId: aiSessionId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.sessionId) setAiSessionId(data.sessionId);
        setAiMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Error: ${data.error || 'Request failed'}` },
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network error connecting to /ai' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const runBota = async (e) => {
    e.preventDefault();
    const message = botaPrompt.trim();
    if (!message || botaLoading) return;
    setBotaPrompt('');
    setBotaMessages((prev) => [...prev, { role: 'user', text: message }]);
    setBotaLoading(true);
    try {
      const res = await fetch('/bota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chatId: botaChatId || undefined,
          webSearch: botaWebSearch,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.chatId) setBotaChatId(data.chatId);
        setBotaMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.response || data.message || '',
            sources: data.sources || [],
          },
        ]);
      } else {
        setBotaMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Error: ${data.error || 'Request failed'}`, sources: [] },
        ]);
      }
    } catch {
      setBotaMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Network error connecting to /bota', sources: [] },
      ]);
    } finally {
      setBotaLoading(false);
    }
  };

  const runTurnstile = async (e) => {
    e.preventDefault();
    if (!tsUrl.trim() || !tsSitekey.trim()) {
      return showToast('Parameters "url" and "sitekey" are required', 'error');
    }
    setTsLoading(true);
    setTsResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(
        `/turnstile?url=${encodeURIComponent(tsUrl.trim())}&sitekey=${encodeURIComponent(tsSitekey.trim())}`
      );
      const data = await res.json();
      setTsMs(Math.round(performance.now() - t0));
      setTsResult(data);
      if (data.success) showToast('Turnstile token generated');
      else showToast(data.error || 'Turnstile failed', 'error');
    } catch {
      showToast('Failed to invoke /turnstile', 'error');
    } finally {
      setTsLoading(false);
    }
  };

  const runBrat = async (e) => {
    e.preventDefault();
    if (!bratText.trim()) return showToast('Parameter "text" is required', 'error');
    setBratLoading(true);
    setBratResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch('/bratvid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: bratText.trim(),
          theme: bratTheme,
          blur: Number(bratBlur),
          format: bratFormat,
        }),
      });
      const data = await res.json();
      setBratMs(Math.round(performance.now() - t0));
      setBratResult(data);
      if (data.success) showToast(`Rendered ${data.format.toUpperCase()} successfully`);
      else showToast(data.error || 'Brat render failed', 'error');
    } catch {
      showToast('Failed to invoke /bratvid', 'error');
    } finally {
      setBratLoading(false);
    }
  };

  const copyJson = async (obj) => {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    showToast('Response JSON copied');
    setTimeout(() => setCopiedJson(false), 1500);
  };

  const runIg = async (e) => {
    e.preventDefault();
    if (!igUrl.trim()) return showToast('Parameter "url" is required', 'error');
    setIgLoading(true);
    setIgResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`/ig?url=${encodeURIComponent(igUrl.trim())}`);
      const data = await res.json();
      setIgMs(Math.round(performance.now() - t0));
      setIgResult(data);
      if (!data.success) showToast(data.error || 'Invocation failed', 'error');
    } catch {
      showToast('Failed to invoke /ig', 'error');
    } finally {
      setIgLoading(false);
    }
  };

  const runPinterest = async (e) => {
    e.preventDefault();
    if (!pinQuery.trim()) return showToast('Parameter "q" is required', 'error');
    setPinLoading(true);
    setPinResult(null);
    const t0 = performance.now();
    try {
      const params = new URLSearchParams({ action: pinAction, q: pinQuery.trim() });
      const res = await fetch(`/pinterest?${params.toString()}`);
      const data = await res.json();
      setPinMs(Math.round(performance.now() - t0));
      setPinResult(data);
      if (!data.success) showToast(data.error || 'Invocation failed', 'error');
    } catch {
      showToast('Failed to invoke /pinterest', 'error');
    } finally {
      setPinLoading(false);
    }
  };

  const runYtMusic = async (e) => {
    e.preventDefault();
    if (ytmAction !== 'charts' && ytmAction !== 'explore' && !ytmQuery.trim()) {
      return showToast('Parameter "q" is required', 'error');
    }
    setYtmLoading(true);
    setYtmResult(null);
    const t0 = performance.now();
    try {
      const params = new URLSearchParams({ action: ytmAction });
      if (ytmQuery.trim()) params.set('q', ytmQuery.trim());
      const res = await fetch(`/ytmusic?${params.toString()}`);
      const data = await res.json();
      setYtmMs(Math.round(performance.now() - t0));
      setYtmResult(data);
      if (!data.success) showToast(data.error || 'Invocation failed', 'error');
    } catch {
      showToast('Failed to invoke /ytmusic', 'error');
    } finally {
      setYtmLoading(false);
    }
  };

  const functions = [
    { id: 'tiktok', name: 'tiktok-downloader', method: 'GET', path: '/tiktok' },
    { id: 'ig', name: 'instagram-downloader', method: 'GET', path: '/ig' },
    { id: 'pinterest', name: 'pinterest-api', method: 'GET', path: '/pinterest' },
    { id: 'ytmusic', name: 'youtube-music-api', method: 'GET', path: '/ytmusic' },
    { id: 'play', name: 'music-play-mp3', method: 'GET', path: '/play' },
    { id: 'brat', name: 'brat-video-maker', method: 'POST', path: '/bratvid' },
    { id: 'ai', name: 'gemini-chat-session', method: 'POST', path: '/ai' },
    { id: 'bota', name: 'bota-ai-agent', method: 'POST', path: '/bota' },
    { id: 'turnstile', name: 'cf-turnstile-solver', method: 'GET', path: '/turnstile' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-3 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
        <div className="px-3.5 py-2.5 bg-[#1c1c1c] border-b border-[#2e2e2e] text-[11px] font-mono uppercase tracking-wider text-[#898989]">
          Edge Functions ({functions.length})
        </div>
        <div className="divide-y divide-[#2e2e2e]">
          {functions.map((fn) => {
            const active = activeTool === fn.id;
            return (
              <button
                key={fn.id}
                onClick={() => setActiveTool(fn.id)}
                className={`w-full px-3.5 py-3 text-left transition flex items-center justify-between ${
                  active ? 'bg-[#3ecf8e]/10' : 'hover:bg-[#1c1c1c]'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-xs font-mono font-medium truncate ${
                      active ? 'text-[#3ecf8e]' : 'text-white'
                    }`}
                  >
                    {fn.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#898989] mt-0.5">{fn.path}</p>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#121212] border border-[#2e2e2e] rounded text-[#ededed]">
                  {fn.method}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-9 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
        {activeTool === 'tiktok' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/tiktok</span>
                <span className="text-[#898989]">— No-Watermark Video & Slide Extractor</span>
              </div>
              {ttMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{ttMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runTiktok} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://vt.tiktok.com/..."
                  value={ttUrl}
                  onChange={(e) => setTtUrl(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#898989] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={ttLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  {ttLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Invoke Function</span>
                </button>
              </form>

              {ttResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {ttResult.success && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        {ttResult.author?.avatar && (
                          <img
                            src={ttResult.author.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full border border-[#2e2e2e]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {ttResult.author?.nickname || ttResult.author?.username}
                          </p>
                          <p className="text-[11px] text-[#898989] truncate">{ttResult.title}</p>
                        </div>
                      </div>

                      {ttResult.videoUrl && !ttResult.images?.length && (
                        <video
                          src={ttResult.videoUrl}
                          controls
                          className="w-full max-h-64 rounded bg-black border border-[#2e2e2e]"
                        />
                      )}

                      <div className="flex flex-wrap gap-2">
                        {ttResult.videoUrl && (
                          <a
                            href={ttResult.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded bg-[#3ecf8e] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Video MP4
                          </a>
                        )}
                        {ttResult.musicUrl && (
                          <a
                            href={ttResult.musicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white text-xs inline-flex items-center gap-1.5"
                          >
                            <Music className="w-3.5 h-3.5" /> Audio MP3
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-[#898989] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" /> Response Payload
                      </span>
                      <button
                        onClick={() => copyJson(ttResult)}
                        className="text-[11px] font-mono text-[#898989] hover:text-white flex items-center gap-1"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(ttResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'ig' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/ig</span>
                <span className="text-[#898989]">— Instagram Reels, Video & Carousel Downloader</span>
              </div>
              {igMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{igMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runIg} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://www.instagram.com/reel/... or shortcode"
                  value={igUrl}
                  onChange={(e) => setIgUrl(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#898989] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={igLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  {igLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Invoke Function</span>
                </button>
              </form>

              {igResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {igResult.success && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            @{igResult.owner?.username || 'instagram'}
                          </p>
                          <p className="text-[11px] text-[#898989] line-clamp-2">{igResult.caption}</p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
                          {igResult.type}
                        </span>
                      </div>

                      {igResult.media?.[0]?.type === 'video' ? (
                        <video
                          src={igResult.media[0].url}
                          controls
                          className="w-full max-h-64 rounded bg-black border border-[#2e2e2e]"
                        />
                      ) : igResult.media?.[0]?.url ? (
                        <img
                          src={igResult.media[0].url}
                          alt=""
                          className="w-full max-h-64 object-contain rounded bg-black border border-[#2e2e2e]"
                        />
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        {(igResult.media || []).map((m, idx) => (
                          <a
                            key={idx}
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded bg-[#3ecf8e] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Media #{idx + 1} ({m.type})
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-[#898989] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" /> Response Payload
                      </span>
                      <button
                        onClick={() => copyJson(igResult)}
                        className="text-[11px] font-mono text-[#898989] hover:text-white flex items-center gap-1"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(igResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'pinterest' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/pinterest</span>
                <span className="text-[#898989]">— Search Pins, Download HD Video/Image, Stalk & Lens</span>
              </div>
              {pinMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{pinMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runPinterest} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={pinAction}
                  onChange={(e) => setPinAction(e.target.value)}
                  className="bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="search">search (Search Pins)</option>
                  <option value="download">download (Pin URL / ID)</option>
                  <option value="stalk">stalk (Username Profile)</option>
                  <option value="lens">lens (Visual Search)</option>
                </select>
                <input
                  type="text"
                  placeholder={
                    pinAction === 'download'
                      ? 'https://pin.it/... or https://www.pinterest.com/pin/...'
                      : pinAction === 'stalk'
                      ? 'Pinterest username (e.g. pinterest)'
                      : 'Search query or Pin URL (e.g. cyberpunk anime)'
                  }
                  value={pinQuery}
                  onChange={(e) => setPinQuery(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#898989] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Invoke Function</span>
                </button>
              </form>

              {pinResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {pinResult.success && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3 max-h-96 overflow-y-auto">
                      {pinResult.media && (
                        <div className="space-y-2.5">
                          <p className="text-xs font-semibold text-white">
                            {pinResult.title || 'Pinterest Pin'}
                          </p>
                          {pinResult.media.video?.mp4 ? (
                            <video
                              src={pinResult.media.video.mp4}
                              controls
                              className="w-full max-h-60 rounded border border-[#2e2e2e] bg-black"
                            />
                          ) : (
                            pinResult.media.image?.original && (
                              <img
                                src={pinResult.media.image.original}
                                alt=""
                                className="w-full max-h-60 object-contain rounded border border-[#2e2e2e]"
                              />
                            )
                          )}
                        </div>
                      )}

                      {Array.isArray(pinResult.results) && pinResult.results.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {pinResult.results.slice(0, 9).map((item) => {
                            const imgUrl =
                              item.images?.original ||
                              item.images?.large ||
                              item.image ||
                              item.images?.thumbnail;
                            return (
                              <a
                                key={item.id}
                                href={imgUrl || item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group relative rounded overflow-hidden border border-[#2e2e2e]"
                              >
                                {imgUrl && (
                                  <img
                                    src={imgUrl}
                                    alt={item.title || ''}
                                    className="w-full h-24 object-cover group-hover:scale-105 transition"
                                  />
                                )}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {pinResult.user && (
                        <div className="flex items-center gap-3">
                          {pinResult.user.avatar && (
                            <img
                              src={pinResult.user.avatar}
                              alt=""
                              className="w-12 h-12 rounded-full border border-[#2e2e2e]"
                            />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {pinResult.user.fullName || pinResult.user.username}
                            </p>
                            <p className="text-[11px] font-mono text-[#898989]">
                              @{pinResult.user.username} • {pinResult.user.stats?.followers || 0} followers • {pinResult.user.stats?.pins || 0} pins
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-[#898989] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" /> Response Payload
                      </span>
                      <button
                        onClick={() => copyJson(pinResult)}
                        className="text-[11px] font-mono text-[#898989] hover:text-white flex items-center gap-1"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(pinResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'ytmusic' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/ytmusic</span>
                <span className="text-[#898989]">— YouTube Music Track, Stream, Search & Lyrics</span>
              </div>
              {ytmMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{ytmMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runYtMusic} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={ytmAction}
                  onChange={(e) => setYtmAction(e.target.value)}
                  className="bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="track">track (Stream + Lyrics)</option>
                  <option value="download">download (Hosted Audio)</option>
                  <option value="search">search (Songs/Albums/Artists)</option>
                  <option value="lyrics">lyrics (Lyrics Only)</option>
                  <option value="queue">queue (Radio Queue)</option>
                  <option value="charts">charts (Top Artists)</option>
                  <option value="explore">explore (Categories)</option>
                </select>
                <input
                  type="text"
                  placeholder={
                    ytmAction === 'charts' || ytmAction === 'explore'
                      ? 'Optional country / query'
                      : 'Song title, artist, or YouTube Music URL (e.g. Hindia Evaluasi)'
                  }
                  value={ytmQuery}
                  onChange={(e) => setYtmQuery(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#898989] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={ytmLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  {ytmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Invoke Function</span>
                </button>
              </form>

              {ytmResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {ytmResult.success && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3">
                      {(ytmResult.title || ytmResult.topResult?.title) && (
                        <div className="flex items-center gap-3">
                          {(ytmResult.thumbnail || ytmResult.topResult?.thumbnail) && (
                            <img
                              src={ytmResult.thumbnail || ytmResult.topResult?.thumbnail}
                              alt=""
                              className="w-14 h-14 rounded object-cover border border-[#2e2e2e]"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {ytmResult.title || ytmResult.topResult?.title}
                            </p>
                            <p className="text-[11px] font-mono text-[#898989] mt-0.5">
                              {ytmResult.author || ytmResult.artist || ytmResult.topResult?.subtitle || ''}{' '}
                              {ytmResult.duration ? `• ${ytmResult.duration}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {(ytmResult.audioUrl || ytmResult.audio?.url) && (
                        <audio
                          src={ytmResult.audioUrl || ytmResult.audio?.url}
                          controls
                          className="w-full"
                        />
                      )}

                      {ytmResult.lyrics && (
                        <div className="p-2.5 rounded bg-[#171717] border border-[#2e2e2e] max-h-40 overflow-y-auto">
                          <p className="text-[10px] font-mono uppercase text-[#3ecf8e] mb-1">Lyrics</p>
                          <pre className="text-[11px] font-sans whitespace-pre-wrap text-[#ededed]">
                            {ytmResult.lyrics}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono text-[#898989] flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" /> Response Payload
                      </span>
                      <button
                        onClick={() => copyJson(ytmResult)}
                        className="text-[11px] font-mono text-[#898989] hover:text-white flex items-center gap-1"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(ytmResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'play' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/play</span>
                <span className="text-[#898989]">— YouTube & SoundCloud Audio Extractor</span>
              </div>
              {playMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{playMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runPlay} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Query title or artist (e.g. Hindia Evaluasi)"
                  value={playQuery}
                  onChange={(e) => setPlayQuery(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white placeholder-[#898989] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={playLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  {playLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Invoke Function</span>
                </button>
              </form>

              {playResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {playResult.success && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3">
                      <div className="flex items-center gap-3">
                        {playResult.thumbnail && (
                          <img
                            src={playResult.thumbnail}
                            alt=""
                            className="w-14 h-14 rounded object-cover border border-[#2e2e2e]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{playResult.title}</p>
                          <p className="text-[11px] font-mono text-[#898989] mt-0.5">
                            {playResult.channel} • {playResult.durationFormatted || `${playResult.duration}s`}
                          </p>
                        </div>
                      </div>
                      {playResult.audioUrl && (
                        <audio src={playResult.audioUrl} controls className="w-full" />
                      )}
                      {playResult.audioUrl && (
                        <a
                          href={playResult.audioUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded bg-[#3ecf8e] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download MP3
                        </a>
                      )}
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(playResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'ai' && (
          <div className="flex flex-col h-[480px]">
            <div className="px-4 py-2.5 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  POST
                </span>
                <span className="text-white font-semibold">/ai</span>
                <span className="text-[#898989]">
                  session: <strong className="text-[#3ecf8e]">{aiSessionId || 'auto'}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setAiSessionId('');
                  setAiMessages([{ role: 'assistant', text: 'Session cleared.' }]);
                }}
                className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#242424] border border-[#2e2e2e] text-[11px] font-mono text-[#ededed] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#121212]">
              {aiMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded px-3.5 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#3ecf8e] text-[#0f0f0f] font-medium'
                        : 'bg-[#1c1c1c] border border-[#2e2e2e] text-[#ededed]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="text-xs font-mono text-[#3ecf8e] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing /ai...
                </div>
              )}
            </div>

            <form
              onSubmit={runAi}
              className="p-3 bg-[#171717] border-t border-[#2e2e2e] flex gap-2"
            >
              <input
                type="text"
                placeholder="Enter prompt payload..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs text-white placeholder-[#898989] focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        )}

        {activeTool === 'bota' && (
          <div className="flex flex-col h-[480px]">
            <div className="px-4 py-2.5 bg-[#1c1c1c] border-b border-[#2e2e2e] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  POST
                </span>
                <span className="text-white font-semibold">/bota</span>
                <span className="text-[#898989]">
                  chatId: <strong className="text-[#3ecf8e]">{botaChatId || 'auto'}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBotaWebSearch((v) => !v)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition ${
                    botaWebSearch
                      ? 'bg-[#3ecf8e]/15 border-[#3ecf8e]/40 text-[#3ecf8e]'
                      : 'bg-[#121212] border-[#2e2e2e] text-[#898989]'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Web Search: {botaWebSearch ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  onClick={() => {
                    setBotaChatId('');
                    setBotaMessages([
                      { role: 'assistant', text: 'Bota session cleared.', sources: [] },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#242424] border border-[#2e2e2e] text-[11px] font-mono text-[#ededed] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#121212]">
              {botaMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded px-3.5 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#3ecf8e] text-[#0f0f0f] font-medium'
                        : 'bg-[#1c1c1c] border border-[#2e2e2e] text-[#ededed]'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.sources?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                      {m.sources.slice(0, 4).map((s, si) => (
                        <a
                          key={si}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-[#171717] border border-[#2e2e2e] text-[10px] font-mono text-[#3ecf8e] hover:underline truncate max-w-[200px]"
                        >
                          {s.title || s.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {botaLoading && (
                <div className="text-xs font-mono text-[#3ecf8e] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing /bota...
                </div>
              )}
            </div>

            <form
              onSubmit={runBota}
              className="p-3 bg-[#171717] border-t border-[#2e2e2e] flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask Bota AI..."
                value={botaPrompt}
                onChange={(e) => setBotaPrompt(e.target.value)}
                className="flex-1 bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs text-white placeholder-[#898989] focus:outline-none"
              />
              <button
                type="submit"
                disabled={botaLoading}
                className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        )}

        {activeTool === 'turnstile' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  GET
                </span>
                <span className="text-white font-semibold">/turnstile</span>
                <span className="text-[#898989]">— Cloudflare Turnstile Token Solver</span>
              </div>
              {tsMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{tsMs} ms</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runTurnstile} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                    Target Page URL
                  </label>
                  <input
                    type="url"
                    value={tsUrl}
                    onChange={(e) => setTsUrl(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                    Sitekey
                  </label>
                  <input
                    type="text"
                    value={tsSitekey}
                    onChange={(e) => setTsSitekey(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={tsLoading}
                    className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    {tsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{tsLoading ? 'Solving Challenge (~12s)...' : 'Invoke Solver'}</span>
                  </button>
                </div>
              </form>

              {tsResult && (
                <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                  <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-60">
                    {JSON.stringify(tsResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTool === 'brat' && (
          <div>
            <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                  POST
                </span>
                <span className="text-white font-semibold">/bratvid</span>
                <span className="text-[#898989]">— Animated 60FPS Brat Video & GIF Maker</span>
              </div>
              {bratMs !== null && (
                <span className="text-[11px] font-mono text-[#3ecf8e]">{bratMs} ms • 200 OK</span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <form onSubmit={runBrat} className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                    Brat Text (Supports Apple Emojis)
                  </label>
                  <input
                    type="text"
                    value={bratText}
                    onChange={(e) => setBratText(e.target.value)}
                    placeholder="Ketik teks brat..."
                    className="w-full bg-[#121212] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                      Theme
                    </label>
                    <select
                      value={bratTheme}
                      onChange={(e) => setBratTheme(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="white">white (#ffffff)</option>
                      <option value="green">green (#8ace00)</option>
                      <option value="black">black (#000000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                      Blur (0 - 3)
                    </label>
                    <select
                      value={bratBlur}
                      onChange={(e) => setBratBlur(Number(e.target.value))}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value={0}>0 (Sharp)</option>
                      <option value={1}>1 (Light Blur)</option>
                      <option value={2}>2 (Classic Brat Blur)</option>
                      <option value={3}>3 (Heavy Blur)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase text-[#898989] block mb-1">
                      Format
                    </label>
                    <select
                      value={bratFormat}
                      onChange={(e) => setBratFormat(e.target.value)}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="mp4">mp4 (60 FPS H.264)</option>
                      <option value="gif">gif (Animated Loop)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bratLoading}
                  className="px-4 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] disabled:opacity-50 text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  {bratLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{bratLoading ? 'Rendering 60 FPS Frames...' : 'Render Brat Video'}</span>
                </button>
              </form>

              {bratResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#2e2e2e]">
                  {bratResult.success && bratResult.url && (
                    <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5 space-y-3">
                      {bratResult.format === 'gif' ? (
                        <img
                          src={bratResult.url}
                          alt="Brat GIF"
                          className="w-full max-h-64 object-contain rounded bg-black border border-[#2e2e2e]"
                        />
                      ) : (
                        <video
                          src={bratResult.url}
                          controls
                          autoPlay
                          loop
                          className="w-full max-h-64 rounded bg-black border border-[#2e2e2e]"
                        />
                      )}
                      <a
                        href={bratResult.url}
                        download={bratResult.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded bg-[#3ecf8e] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download {bratResult.format?.toUpperCase()}
                      </a>
                    </div>
                  )}

                  <div className="bg-[#121212] border border-[#2e2e2e] rounded p-3.5">
                    <pre className="text-[11px] font-mono text-[#3ecf8e] overflow-x-auto max-h-64">
                      {JSON.stringify(bratResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
