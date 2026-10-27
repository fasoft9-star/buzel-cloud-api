import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Zap,
  BookOpen,
  ExternalLink,
  Check,
  Copy,
  Menu,
  X,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import OverviewView from './components/OverviewView.jsx';
import CdnView from './components/CdnView.jsx';
import PlaygroundView from './components/PlaygroundView.jsx';
import DocsView from './components/DocsView.jsx';
import Footer from './components/Footer.jsx';

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Project Overview',
    shortLabel: 'Overview',
    icon: Activity,
    group: 'PROJECT',
  },
  {
    id: 'cdn',
    label: 'Storage (CDN)',
    shortLabel: 'Storage',
    icon: Database,
    group: 'PLATFORM',
    badge: '0 MB Disk',
  },
  {
    id: 'playground',
    label: 'Edge Functions',
    shortLabel: 'Playground',
    icon: Zap,
    group: 'PLATFORM',
    badge: '11 Live',
  },
  {
    id: 'docs',
    label: 'API Documentation',
    shortLabel: 'API Docs',
    icon: BookOpen,
    group: 'DEVELOPERS',
  },
];

function getInitialThemeMode() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem('buzel-theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
  } catch {
    // ignore storage errors
  }
  return 'system';
}

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverInfo, setServerInfo] = useState(null);
  const [cdnStats, setCdnStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [copiedHost, setCopiedHost] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://buzzel.duckdns.org';

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedTheme);
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('buzel-theme', mode);
    } catch {
      // ignore storage errors
    }
    const label =
      mode === 'system'
        ? `System Default (${systemTheme === 'dark' ? 'Dark' : 'Light'})`
        : mode === 'dark'
        ? 'Dark Mode'
        : 'Light Mode';
    showToast(`Theme set to ${label}`);
  };

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => setServerInfo(d))
      .catch(() => {});
  }, []);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyOrigin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(baseUrl);
    }
    setCopiedHost(true);
    showToast(`Copied ${baseUrl}`);
    setTimeout(() => setCopiedHost(false), 1800);
  };

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#121212] text-[#ededed] flex flex-col selection:bg-[#3ecf8e]/30 selection:text-[#3ecf8e]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-[#1c1c1c] border border-[#2e2e2e] shadow-2xl text-xs font-medium text-white">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#3ecf8e] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Supabase Studio Top Bar */}
      <header className="sticky top-0 z-40 h-12 bg-[#171717]/95 backdrop-blur-md border-b border-[#2e2e2e] px-3 sm:px-5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-md text-[#8f8f8f] hover:text-white hover:bg-[#232323] transition"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Brand Logo */}
          <button
            onClick={() => handleNavigate('overview')}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="w-6 h-6 rounded-md bg-[#3ecf8e]/15 border border-[#3ecf8e]/40 flex items-center justify-center shadow-sm group-hover:bg-[#3ecf8e]/25 transition">
              <Zap className="w-3.5 h-3.5 text-[#3ecf8e] fill-[#3ecf8e]" />
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-white">
              buzel-org
            </span>
          </button>

          <span className="text-[#3e3e3e] text-sm select-none">/</span>

          {/* Project Pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-[#ededed] truncate">
              buzel-cloud
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/25">
              PRODUCTION
            </span>
          </div>

          <span className="hidden md:inline text-[#3e3e3e] text-sm select-none">/</span>

          <span className="hidden md:inline text-xs font-mono text-[#8f8f8f]">
            {activeNav.label}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1c1c] border border-[#2e2e2e] text-[11px] font-mono text-[#a1a1a1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
            <span>{serverInfo?.node || 'Node v20'}</span>
          </div>

          <button
            onClick={copyOrigin}
            title="Copy Base API URL"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] hover:border-[#3e3e3e] text-[11px] font-mono text-[#ededed] transition"
          >
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              {baseUrl.replace(/^https?:\/\//, '')}
            </span>
            {copiedHost ? (
              <Check className="w-3 h-3 text-[#3ecf8e] shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-[#8f8f8f] shrink-0" />
            )}
          </button>

          <a
            href="/api/status"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3ecf8e] hover:bg-[#34b27b] text-[#0f1713] font-semibold text-xs transition"
          >
            <Radio className="w-3 h-3" />
            Status JSON
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main Studio Shell */}
      <div className="flex-1 flex relative">
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between bg-[#171717] border-r border-[#2e2e2e] select-none">
          <div className="p-3 space-y-5">
            {['PROJECT', 'PLATFORM', 'DEVELOPERS'].map((group) => {
              const items = NAV_ITEMS.filter((item) => item.group === group);
              return (
                <div key={group}>
                  <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#6e6e6e]">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition ${
                            active
                              ? 'bg-[#242424] text-white border border-[#363636] shadow-sm'
                              : 'text-[#9e9e9e] hover:text-[#ededed] hover:bg-[#1f1f1f] border border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon
                              className={`w-4 h-4 ${
                                active ? 'text-[#3ecf8e]' : 'text-[#7e7e7e]'
                              }`}
                            />
                            {item.label}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                active
                                  ? 'bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30'
                                  : 'bg-[#1f1f1f] text-[#8f8f8f] border border-[#2e2e2e]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar Bottom Card */}
          <div className="p-3 border-t border-[#2e2e2e] bg-[#141414]">
            <div className="p-2.5 rounded-lg bg-[#1c1c1c] border border-[#2e2e2e] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3ecf8e]" />
                  Telegram Cloud
                </span>
                <span className="text-[10px] font-mono text-[#3ecf8e]">ACTIVE</span>
              </div>
              <p className="text-[11px] text-[#8f8f8f] leading-relaxed">
                Channel <code className="text-[#ededed]">@buzelstorage</code> terhubung (
                {cdnStats.totalFiles || 0} objek). Semua upload memakai 0 MB disk lokal.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-12 z-30 bg-black/70 backdrop-blur-sm">
            <div className="w-64 h-full bg-[#171717] border-r border-[#2e2e2e] p-3 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition ${
                        active
                          ? 'bg-[#242424] text-white border border-[#363636]'
                          : 'text-[#9e9e9e] hover:text-white hover:bg-[#1f1f1f]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            active ? 'text-[#3ecf8e]' : 'text-[#7e7e7e]'
                          }`}
                        />
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#3ecf8e] border border-[#2e2e2e]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area + Supabase Footer */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Horizontal Tab Switcher */}
          <div className="lg:hidden flex items-center gap-1 px-3 py-2 bg-[#171717] border-b border-[#2e2e2e] overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30'
                      : 'text-[#8f8f8f] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {activeTab === 'overview' && (
              <OverviewView onNavigate={handleNavigate} />
            )}
            {activeTab === 'cdn' && (
              <CdnView
                showToast={showToast}
                onStatsUpdate={(s) => setCdnStats(s)}
              />
            )}
            {activeTab === 'playground' && (
              <PlaygroundView showToast={showToast} />
            )}
            {activeTab === 'docs' && (
              <DocsView baseUrl={baseUrl} showToast={showToast} />
            )}
          </main>

          {/* Supabase-inspired Multi-Column Footer with Theme Switcher */}
          <Footer
            baseUrl={baseUrl}
            onNavigate={handleNavigate}
            onCopyBase={copyOrigin}
            themeMode={themeMode}
            resolvedTheme={resolvedTheme}
            onThemeChange={handleThemeChange}
          />
        </div>
      </div>
    </div>
  );
}
