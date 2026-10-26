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
} from 'lucide-react';

export default function PlaygroundView({ showToast }) {
  const [activeTool, setActiveTool] = useState('tiktok');

  const [ttUrl, setTtUrl] = useState('');
  const [ttLoading, setTtLoading] = useState(false);
  const [ttResult, setTtResult] = useState(null);
  const [ttMs, setTtMs] = useState(null);

  const [playQuery, setPlayQuery] = useState('');
  const [playLoading, setPlayLoading] = useState(false);
  const [playResult, setPlayResult] = useState(null);
  const [playMs, setPlayMs] = useState(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSessionId, setAiSessionId] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'assistant',
      text: 'Gemini Edge Function ready. Send a prompt below to test multi-turn conversation.',
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const [tsUrl, setTsUrl] = useState('https://2captcha.com/demo/cloudflare-turnstile');
  const [tsSitekey, setTsSitekey] = useState('0x4AAAAAAADnPIDROrmt1Wwj');
  const [tsLoading, setTsLoading] = useState(false);
  const [tsResult, setTsResult] = useState(null);
  const [tsMs, setTsMs] = useState(null);
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

  const copyJson = async (obj) => {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    showToast('Response JSON copied');
    setTimeout(() => setCopiedJson(false), 1500);
  };

  const functions = [
    { id: 'tiktok', name: 'tiktok-downloader', method: 'GET', path: '/tiktok' },
    { id: 'play', name: 'music-play-mp3', method: 'GET', path: '/play' },
    { id: 'ai', name: 'gemini-chat-session', method: 'POST', path: '/ai' },
    { id: 'turnstile', name: 'cf-turnstile-solver', method: 'GET', path: '/turnstile' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-3 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
        <div className="px-3.5 py-2.5 bg-[#1c1c1c] border-b border-[#2e2e2e] text-[11px] font-mono uppercase tracking-wider text-[#898989]">
          Edge Functions (4)
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
      </div>
    </div>
  );
}
