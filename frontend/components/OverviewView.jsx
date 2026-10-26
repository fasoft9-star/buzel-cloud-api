import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Zap,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Terminal,
  Server,
  HardDrive,
} from 'lucide-react';
import { formatBytes } from './CdnView.jsx';

function formatUptime(sec = 0) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function OverviewView({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.success) setMetrics(data);
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const timer = setInterval(loadMetrics, 5000);
    return () => clearInterval(timer);
  }, []);

  const sys = metrics?.system || {};
  const traffic = metrics?.traffic || {};
  const storage = metrics?.storage || {};
  const logs = metrics?.recentLogs || [];
  const epStats = traffic.endpoints || {};

  const routeCatalog = [
    { key: '/upload', method: 'POST', path: '/upload', desc: 'Telegram Cloud Object Uploader' },
    { key: '/f', method: 'GET', path: '/f/:id', desc: 'CDN Media Stream Delivery' },
    { key: '/tiktok', method: 'GET', path: '/tiktok', desc: 'TikTok HD Video & Slide Extractor' },
    { key: '/play', method: 'GET', path: '/play', desc: 'YouTube & SoundCloud MP3 Transcoder' },
    { key: '/ai', method: 'POST', path: '/ai', desc: 'Google Gemini Multi-Turn Chat' },
    { key: '/turnstile', method: 'GET', path: '/turnstile', desc: 'Cloudflare Turnstile Token Solver' },
  ];

  const ramPct = sys.ramTotalMb ? Math.round((sys.ramUsedMb / sys.ramTotalMb) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="bg-[#171717] border border-[#2e2e2e] rounded-md p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
              ACTIVE_HEALTHY
            </span>
            <span className="text-xs font-mono text-[#898989]">
              Node {sys.nodeVersion || 'v22.x'} • {sys.platform || 'Linux x64'}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            buzel-cloud — Edge REST API & Telegram Storage Gateway
          </h1>
          <p className="text-xs text-[#898989]">
            Production instance serving WhatsApp Bot plugins, Telegram CDN bucket (@buzelstorage), and headless browser solvers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('cdn')}
            className="px-3 py-1.5 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#0f0f0f] font-semibold text-xs inline-flex items-center gap-1.5 transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Open Storage Bucket</span>
          </button>
          <button
            onClick={() => onNavigate('playground')}
            className="px-3 py-1.5 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-white font-medium text-xs inline-flex items-center gap-1.5 transition"
          >
            <Zap className="w-3.5 h-3.5 text-[#3ecf8e]" />
            <span>Test Edge Functions</span>
          </button>
          <button
            onClick={loadMetrics}
            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-[#898989] hover:text-white transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3ecf8e]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#171717] border border-[#2e2e2e] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between text-[#898989]">
            <span className="text-[11px] font-mono uppercase tracking-wider">API Requests</span>
            <Activity className="w-4 h-4 text-[#3ecf8e]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{traffic.totalRequests || 0}</p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#2e2e2e]">
            <span className="text-[#3ecf8e]">{traffic.successRequests || 0} 2xx OK</span>
            <span className="text-[#898989]">{traffic.errorRequests || 0} errors</span>
          </div>
        </div>

        <div className="bg-[#171717] border border-[#2e2e2e] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between text-[#898989]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Avg Latency</span>
            <Clock className="w-4 h-4 text-[#3ecf8e]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {traffic.avgLatencyMs || 0} <span className="text-xs font-normal text-[#898989]">ms</span>
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#2e2e2e]">
            <span className="text-[#898989]">Uptime</span>
            <span className="text-white">{formatUptime(metrics?.uptimeSeconds || 0)}</span>
          </div>
        </div>

        <div className="bg-[#171717] border border-[#2e2e2e] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between text-[#898989]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Cloud Storage</span>
            <HardDrive className="w-4 h-4 text-[#3ecf8e]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {formatBytes(storage.totalSize || 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#2e2e2e]">
            <span className="text-[#898989]">{storage.totalFiles || 0} objects</span>
            <span className="text-[#3ecf8e]">0 MB local disk</span>
          </div>
        </div>

        <div className="bg-[#171717] border border-[#2e2e2e] rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between text-[#898989]">
            <span className="text-[11px] font-mono uppercase tracking-wider">VPS Memory & CPU</span>
            <Cpu className="w-4 h-4 text-[#3ecf8e]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {sys.apiRssMb || 19} <span className="text-xs font-normal text-[#898989]">MB API RSS</span>
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#2e2e2e]">
            <span className="text-[#898989]">
              Sys: {sys.ramUsedMb || 0}/{sys.ramTotalMb || 0} MB ({ramPct}%)
            </span>
            <span className="text-[#3ecf8e]">CPU {sys.cpuLoadPercent || 0}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-[#3ecf8e]" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                Edge Endpoints & Telemetry
              </h3>
            </div>
            <button
              onClick={() => onNavigate('docs')}
              className="text-[11px] font-mono text-[#3ecf8e] hover:underline flex items-center gap-1"
            >
              <span>API Reference</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121212] border-b border-[#2e2e2e] text-[10px] font-mono uppercase text-[#898989]">
                  <th className="py-2 px-3.5">Route</th>
                  <th className="py-2 px-3.5">Service</th>
                  <th className="py-2 px-3.5 text-right">Calls</th>
                  <th className="py-2 px-3.5 text-right">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2e2e] text-xs">
                {routeCatalog.map((r) => {
                  const st = epStats[r.key] || { count: 0, avgMs: 0 };
                  return (
                    <tr key={r.key} className="hover:bg-[#1c1c1c] transition">
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        <span className="px-1.5 py-0.5 mr-2 rounded bg-[#3ecf8e]/15 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[10px]">
                          {r.method}
                        </span>
                        <span className="text-white font-medium">{r.path}</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-[#898989] text-xs">{r.desc}</td>
                      <td className="py-2.5 px-3.5 font-mono text-right text-white">{st.count}</td>
                      <td className="py-2.5 px-3.5 font-mono text-right text-[#3ecf8e]">
                        {st.avgMs ? `${st.avgMs} ms` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" />
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                Live API Request Logs
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#898989]">Auto-refresh 5s</span>
          </div>

          <div className="divide-y divide-[#2e2e2e] max-h-[310px] overflow-y-auto font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-[#898989]">
                Waiting for incoming HTTP traffic...
              </div>
            ) : (
              logs.map((log) => {
                const isOk = log.status >= 200 && log.status < 400;
                const timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID');
                return (
                  <div
                    key={log.id}
                    className="px-3.5 py-2 flex items-center justify-between gap-2 hover:bg-[#1c1c1c]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          isOk
                            ? 'bg-[#3ecf8e]/15 text-[#3ecf8e]'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="text-[#898989]">{log.method}</span>
                      <span className="text-white truncate max-w-[170px]" title={log.path}>
                        {log.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-[#898989]">
                      <span className="text-[#ededed]">{log.durationMs}ms</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
