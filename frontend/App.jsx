import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Database,
  Zap,
  BookOpen,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ChevronRight,
  Activity,
} from 'lucide-react';
import OverviewView from './components/OverviewView.jsx';
import CdnView from './components/CdnView.jsx';
import PlaygroundView from './components/PlaygroundView.jsx';
import DocsView from './components/DocsView.jsx';

export default function App() {
  const initialTab =
    window.location.pathname.startsWith('/cdn') ||
    window.location.pathname.startsWith('/uploader')
      ? 'cdn'
      : 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [copiedBase, setCopiedBase] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => {
        if (d?.publicUrl) setBaseUrl(d.publicUrl);
      })
      .catch(() => null);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  };

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(baseUrl);
    setCopiedBase(true);
    showToast('Project URL copied to clipboard');
    setTimeout(() => setCopiedBase(false), 1600);
  };

  const navItems = [
    { id: 'overview', label: 'Project Overview', sub: 'Telemetry & Logs', icon: LayoutGrid },
    { id: 'cdn', label: 'Storage', sub: 'buzelstorage', icon: Database },
    { id: 'playground', label: 'Edge Functions', sub: 'Interactive Tester', icon: Zap },
    { id: 'docs', label: 'API Docs', sub: 'REST Reference', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-[#ededed] flex flex-col">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] shadow-2xl text-xs font-mono">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#3ecf8e]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <header className="h-12 bg-[#171717] border-b border-[#2e2e2e] px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded bg-[#3ecf8e]/15 border border-[#3ecf8e]/40 flex items-center justify-center text-[#3ecf8e]">
            <Zap className="w-3.5 h-3.5 fill-[#3ecf8e]" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono truncate">
            <span className="text-[#898989] hidden sm:inline">buzel-org</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#898989] hidden sm:inline" />
            <span className="text-white font-semibold">buzel-cloud</span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono uppercase bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 rounded">
              Production
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121212] border border-[#2e2e2e] text-[11px] font-mono text-[#898989]">
            <Activity className="w-3 h-3 text-[#3ecf8e]" />
            <span>Status:</span>
            <span className="text-[#3ecf8e]">Operational</span>
          </div>

          <div className="flex items-center gap-2 bg-[#121212] border border-[#2e2e2e] rounded px-2.5 py-1">
            <Terminal className="w-3 h-3 text-[#3ecf8e] flex-shrink-0" />
            <span className="text-[11px] font-mono text-[#ededed] truncate max-w-[140px] sm:max-w-[240px]">
              {baseUrl}
            </span>
            <button
              onClick={copyBaseUrl}
              className="text-[#898989] hover:text-white transition"
              title="Copy Project URL"
            >
              {copiedBase ? (
                <Check className="w-3.5 h-3.5 text-[#3ecf8e]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-56 bg-[#171717] border-b md:border-b-0 md:border-r border-[#2e2e2e] flex-shrink-0">
          <div className="p-3">
            <p className="px-2.5 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#898989] hidden md:block">
              Project Studio
            </p>
            <nav className="flex md:flex-col gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition whitespace-nowrap ${
                      active
                        ? 'bg-[#242424] text-white border border-[#363636]'
                        : 'text-[#898989] hover:text-[#ededed] hover:bg-[#1c1c1c] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#3ecf8e]' : 'text-[#898989]'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-none">{item.label}</p>
                      <p className="text-[10px] font-mono text-[#898989] mt-1 hidden md:block">
                        {item.sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 sb-grid-bg p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && <OverviewView onNavigate={setActiveTab} />}
            {activeTab === 'cdn' && <CdnView showToast={showToast} />}
            {activeTab === 'playground' && <PlaygroundView showToast={showToast} />}
            {activeTab === 'docs' && <DocsView baseUrl={baseUrl} showToast={showToast} />}
          </div>
        </main>
      </div>
    </div>
  );
}
