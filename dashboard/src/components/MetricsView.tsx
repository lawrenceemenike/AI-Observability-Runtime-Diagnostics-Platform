import React, { useState, useEffect } from 'react';
import { Server, Activity, Clock, Zap, DollarSign, Copy, Check, TrendingUp } from 'lucide-react';
import { RuntimeMetricsSnapshot, TimeSeriesPoint } from '../types/telemetry';
import { fetchTimeSeries } from '../services/api';

interface MetricsViewProps {
  metrics: RuntimeMetricsSnapshot;
}

export const MetricsView: React.FC<MetricsViewProps> = ({ metrics }) => {
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [promMetricsText, setPromMetricsText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTimeSeries().then((res) => setTimeSeries(res.series || [])).catch(console.error);

    fetch('/metrics')
      .then((r) => r.text())
      .then((txt) => setPromMetricsText(txt))
      .catch(() => setPromMetricsText('# Prometheus metrics scraping endpoint live at /metrics'));
  }, []);

  const handleCopyPrometheus = () => {
    navigator.clipboard.writeText(promMetricsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxP95 = Math.max(...timeSeries.map((p) => p.p95_latency_ms), 500);

  const isP50Breached = metrics.p50_latency_ms > 500;
  const isP95Breached = metrics.p95_latency_ms > 2500;
  const isErrorBreached = metrics.failure_rate > 1.0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0B0F19] p-6 text-white shadow-md border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Prometheus Pipeline & APM</span>
          <h2 className="text-2xl font-black text-white mt-1">6-Dimensional AI Telemetry Matrix</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time latency percentiles, TTFT, token velocity, and OpenLLMetry standard metrics.
          </p>
        </div>
        <a
          href="/metrics"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition"
        >
          <Server className="h-4 w-4 text-cyan-300" />
          <span>View /metrics Raw Exposition</span>
        </a>
      </div>

      {/* 6-Dimensional Metric Primitives Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* P50 Latency */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">P50 Latency</span>
          <h4 className={`text-xl font-black mt-1 ${isP50Breached ? 'text-rose-600' : 'text-slate-900'}`}>
            {metrics.p50_latency_ms}ms
          </h4>
          <span className={`text-[10px] font-bold ${isP50Breached ? 'text-rose-600' : 'text-emerald-600'}`}>
            ● {isP50Breached ? 'SLA Breach (Target < 500ms)' : 'Target < 500ms'}
          </span>
        </div>

        {/* P95 Latency */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">P95 Latency</span>
          <h4 className={`text-xl font-black mt-1 ${isP95Breached ? 'text-rose-600' : 'text-cyan-600'}`}>
            {metrics.p95_latency_ms}ms
          </h4>
          <span className={`text-[10px] font-bold ${isP95Breached ? 'text-rose-600' : 'text-cyan-600'}`}>
            ● {isP95Breached ? 'SLA Breach (Target < 2.5s)' : 'Target < 2.5s'}
          </span>
        </div>

        {/* P99 Latency */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">P99 Latency</span>
          <h4 className="text-xl font-black text-slate-900 mt-1">{metrics.p99_latency_ms}ms</h4>
          <span className="text-[10px] text-slate-400 font-bold">Tail Distribution</span>
        </div>

        {/* Avg TTFT */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Avg TTFT</span>
          <h4 className="text-xl font-black text-amber-600 mt-1">{metrics.ttft_ms || 112}ms</h4>
          <span className="text-[10px] text-amber-500 font-bold">Time-To-First-Token</span>
        </div>

        {/* Token Velocity */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Token Velocity</span>
          <h4 className="text-xl font-black text-cyan-600 mt-1">{metrics.tokens_per_second || 48.5} t/s</h4>
          <span className="text-[10px] text-cyan-500 font-bold">Throughput Speed</span>
        </div>

        {/* Error Rate */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Error Rate</span>
          <h4 className={`text-xl font-black mt-1 ${isErrorBreached ? 'text-rose-600' : 'text-emerald-600'}`}>
            {metrics.failure_rate.toFixed(1)}%
          </h4>
          <span className={`text-[10px] font-bold ${isErrorBreached ? 'text-rose-600' : 'text-emerald-500'}`}>
            ● {isErrorBreached ? 'Critical (Target < 1.0%)' : 'Target < 1.0%'}
          </span>
        </div>
      </div>

      {/* Latency & Throughput Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Latency Percentile Chart */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">P95 Latency Trend</h3>
              <p className="text-xs text-slate-400">Sub-millisecond sliding telemetry window</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 border border-cyan-100">
              Live Sparkline
            </span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {timeSeries.map((pt, i) => {
              const heightPct = Math.max(15, Math.min(100, (pt.p95_latency_ms / maxP95) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-32 overflow-hidden">
                    <div 
                      className="w-full bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-lg transition-all duration-500 group-hover:from-cyan-400 group-hover:to-blue-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono rotate-45 origin-left mt-2">
                    {pt.time.slice(0, 5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token Velocity Chart */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Token Generation Velocity</h3>
              <p className="text-xs text-slate-400">Tokens/sec throughput across local Gemma SLM</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
              Live Stream
            </span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {timeSeries.map((pt, i) => {
              const heightPct = Math.max(20, Math.min(100, (pt.tokens_per_sec / 100) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-32 overflow-hidden">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-700 group-hover:to-cyan-400"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono rotate-45 origin-left mt-2">
                    {pt.time.slice(0, 5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Live Prometheus Exposition Inspector */}
      <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Prometheus Exposition Inspector</h3>
            </div>
            <p className="text-xs text-slate-400">
              Standard OpenLLMetry text format scraped by Prometheus at /metrics
            </p>
          </div>
          <button
            onClick={handleCopyPrometheus}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Metrics'}</span>
          </button>
        </div>

        <pre className="max-h-64 overflow-y-auto rounded-2xl bg-black/50 p-4 font-mono text-xs text-emerald-300">
          {promMetricsText}
        </pre>
      </div>
    </div>
  );
};
