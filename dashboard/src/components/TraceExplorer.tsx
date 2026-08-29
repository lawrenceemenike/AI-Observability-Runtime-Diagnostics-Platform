import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle2, Eye } from 'lucide-react';
import { TraceRecord } from '../types/telemetry';

interface TraceExplorerProps {
  traces: TraceRecord[];
  totalInBuffer?: number;
  onSelectTrace: (traceId: string) => void;
}

export const TraceExplorer: React.FC<TraceExplorerProps> = ({ 
  traces, 
  totalInBuffer,
  onSelectTrace 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OK' | 'ERROR'>('ALL');

  const displayCount = totalInBuffer !== undefined ? totalInBuffer : traces.length;

  const filteredTraces = traces.filter((t) => {
    const matchesSearch = 
      t.trace_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.root_query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.workflow_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'OK') return matchesSearch && !t.has_error;
    if (statusFilter === 'ERROR') return matchesSearch && t.has_error;
    return matchesSearch;
  });

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(1)}ms`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0B0F19] p-6 text-white shadow-md border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">OpenTelemetry Traces</span>
          <h2 className="text-2xl font-black text-white mt-1">Distributed Trace &amp; Span Explorer</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sub-millisecond causal tracking across Orchestrator, Market, Finance, Regulatory and Gemma SLM nodes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-white/10 px-5 py-2.5 text-center backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Traces In Buffer</span>
            <p className="text-2xl font-black text-white">{displayCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Trace ID, query, or agent workflow..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'OK', 'ERROR'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-[#0B0F19] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Traces Table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-6 py-4">Trace ID</th>
              <th className="px-6 py-4">Workflow / Query</th>
              <th className="px-6 py-4">Spans</th>
              <th className="px-6 py-4">Tokens</th>
              <th className="px-6 py-4">Latency</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTraces.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  No traces found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredTraces.map((trace) => {
                const isError = trace.has_error || trace.status.includes('FAIL') || trace.status.includes('500');
                const latencyFormatted = formatLatency(trace.total_duration_ms);
                const latencyColor = isError || trace.total_duration_ms >= 5000 
                  ? 'text-rose-600' 
                  : trace.total_duration_ms >= 2000 
                  ? 'text-amber-500' 
                  : 'text-slate-900';

                return (
                  <tr 
                    key={trace.trace_id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => onSelectTrace(trace.trace_id)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-cyan-600">
                      {trace.trace_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{trace.workflow_name}</div>
                      <div className="text-slate-400 truncate max-w-xs">{trace.root_query}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {trace.spans?.length || 4}
                    </td>
                    <td className="px-6 py-4 font-bold text-cyan-700">
                      {trace.total_tokens > 0 ? trace.total_tokens.toLocaleString() : '—'}
                    </td>
                    <td className={`px-6 py-4 font-bold ${latencyColor}`}>
                      {latencyFormatted}
                    </td>
                    <td className="px-6 py-4">
                      {isError ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 font-bold text-rose-700">
                          <AlertCircle className="h-3 w-3" /> Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Success
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrace(trace.trace_id);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-[#0B0F19] hover:text-white transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
