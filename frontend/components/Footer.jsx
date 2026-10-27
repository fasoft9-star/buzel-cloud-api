import React from 'react';
import {
  Zap,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Database,
  Cpu,
  ArrowUpRight,
  Globe,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';

export default function Footer({
  baseUrl = 'https://buzzel.duckdns.org',
  onNavigate,
  onCopyBase,
  themeMode = 'system',
  resolvedTheme = 'dark',
  onThemeChange,
}) {
  const themeOptions = [
    { id: 'system', label: 'System', icon: Monitor, title: `System Default (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})` },
    { id: 'dark', label: 'Dark', icon: Moon, title: 'Dark Mode' },
    { id: 'light', label: 'Light', icon: Sun, title: 'Light Mode' },
  ];

  return (
    <footer className="bg-[#121212] border-t border-[#2e2e2e] mt-16 text-xs text-[#898989]">
      {/* Supabase Top CTA Strip */}
      <div className="border-b border-[#2e2e2e] bg-[#161616]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Build in a weekend.{' '}
              <span className="text-[#3ecf8e]">Scale with zero disk limits.</span>
            </h3>
            <p className="text-xs text-[#898989]">
              Integrate Telegram Cloud Storage CDN, Media Downloaders, and AI Agents directly into your WhatsApp/Telegram bots or web apps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate && onNavigate('playground')}
              className="px-3.5 py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Launch Edge Playground</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('docs')}
              className="px-3.5 py-2 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
            >
              <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" />
              <span>Read API Docs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-10 border-b border-[#2e2e2e]">
          <div className="col-span-2 space-y-4 pr-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-[#3ecf8e]/15 border border-[#3ecf8e]/40 flex items-center justify-center text-[#3ecf8e]">
                <Zap className="w-3.5 h-3.5 fill-[#3ecf8e]" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight font-mono">
                buzel<span className="text-[#3ecf8e]">.cloud</span>
              </span>
            </div>

            <p className="text-xs text-[#898989] leading-relaxed">
              High-density Node.js ESM REST API & Telegram Cloud Storage gateway engineered for modern automation, media extraction, and AI workflows.
            </p>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#171717] border border-[#2e2e2e] text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse" />
              <span className="text-white">All systems operational</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/fasoft9-star/buzel-cloud-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#898989] hover:text-white inline-flex items-center gap-1 transition"
              >
                <span>GitHub Repo</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
              <span className="text-[#2e2e2e]">•</span>
              <a
                href="/api/status"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#898989] hover:text-white inline-flex items-center gap-1 transition"
              >
                <span>Status JSON</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
              <span className="text-[#2e2e2e]">•</span>
              <a
                href="/api/metrics"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#898989] hover:text-white inline-flex items-center gap-1 transition"
              >
                <span>Metrics</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
              Storage & Tools
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate && onNavigate('cdn')} className="hover:text-[#3ecf8e] transition">
                  Bucket Explorer
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('cdn')} className="hover:text-[#3ecf8e] transition">
                  POST /upload
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Brat 60FPS (/bratvid)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Turnstile (/turnstile)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
              Downloaders
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  TikTok HD (/tiktok)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Instagram Reels (/ig)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Pinterest API (/pinterest)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  YouTube Music (/ytmusic)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
              AI & Agents
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Gemini Chat (/ai)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Bota Agent (/bota)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('playground')} className="hover:text-[#3ecf8e] transition">
                  Web Search Grounding
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('docs')} className="hover:text-[#3ecf8e] transition">
                  Session Memory API
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
              Developers
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate && onNavigate('docs')} className="hover:text-[#3ecf8e] transition">
                  REST Reference
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate && onNavigate('overview')} className="hover:text-[#3ecf8e] transition">
                  Live Request Logs
                </button>
              </li>
              <li>
                <button onClick={onCopyBase} className="hover:text-[#3ecf8e] transition">
                  Copy Base URL
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/fasoft9-star/buzel-cloud-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#3ecf8e] inline-flex items-center gap-1 transition"
                >
                  <span>Source Code</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Supabase-style Theme Switcher on the Right */}
        <div className="pt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-[11px] font-mono text-[#898989]">
          <div className="space-y-2">
            <div>
              © {new Date().getFullYear()} Buzel Cloud Studio. Powered by Node.js ESM & Telegram Cloud.
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[#ededed]">
                <Database className="w-3 h-3 text-[#3ecf8e]" /> @buzelstorage
              </span>
              <span className="text-[#2e2e2e]">|</span>
              <span className="inline-flex items-center gap-1 text-[#ededed]">
                <ShieldCheck className="w-3 h-3 text-[#3ecf8e]" /> TLS 1.3 Let&apos;s Encrypt
              </span>
              <span className="text-[#2e2e2e]">|</span>
              <span className="inline-flex items-center gap-1 text-[#ededed]">
                <Globe className="w-3 h-3 text-[#3ecf8e]" /> {baseUrl.replace(/^https?:\/\//, '')}
              </span>
              <span className="text-[#2e2e2e]">|</span>
              <span className="inline-flex items-center gap-1 text-[#ededed]">
                <Cpu className="w-3 h-3 text-[#3ecf8e]" /> Proxmox LXC
              </span>
            </div>
          </div>

          {/* Right Side: Supabase Theme Switcher (System / Dark / Light) */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <span className="text-[11px] font-mono text-[#898989]">Theme:</span>
            <div
              role="group"
              aria-label="Theme Switcher"
              className="inline-flex items-center p-1 rounded-full bg-[#171717] border border-[#2e2e2e]"
            >
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.title}
                    onClick={() => onThemeChange && onThemeChange(opt.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition ${
                      active
                        ? 'bg-[#242424] text-white border border-[#3ecf8e]/40 shadow-sm'
                        : 'text-[#898989] hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active ? 'text-[#3ecf8e]' : ''
                      }`}
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
