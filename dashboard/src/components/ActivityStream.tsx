import React from 'react';
import { TraceRecord } from '../types/telemetry';
import { ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ActivityStreamProps {
  traces: TraceRecord[];
  totalRequests?: number;
  onSelectTrace: (traceId: string) => void;
  onViewAll: () => void;
}

export const ActivityStream: React.FC<ActivityStreamProps> = ({ 
  traces, 
  totalRequests = 12481, 
  onSelectTrace, 
  onViewAll 
}) => {
  // Determine color and initials for trace
  const getTraceBadge = (name: string, isError: boolean) => {
    if (isError) return { color: 'bg-rose-500', initial: '!' };
    if (name.includes('Market')) return { color: 'bg-emerald-500', initial: 'M' };
    if (name.includes('Gemma') || name.includes('SLM') || name.includes('Synthesis')) return { color: 'bg-cyan-600', initial: 'G' };
    if (name.includes('Regulatory') || name.includes('Vector')) return { color: 'bg-amber-500', initial: 'R' };
    if (name.includes('Calculator') || name.includes('Finance')) return { color: 'bg-emerald-600', initial: 'F' };
    return { color: 'bg-[#0B0F19]', initial: 'T' };
  };

  const formatLatency = (ms: number) => {
    const sign = ms >= 0 ? '+' : '';
    if (Math.abs(ms) >= 1000) {
      return `${sign}${(ms / 1000).toFixed(2)}s`;
    }
    return `${sign}${ms.toFixed(1)}ms`;
  };

  const getLatencyColor = (ms: number, isError: boolean) => {
    if (isError || ms >= 5000) return 'text-rose-600';
    if (ms >= 2000) return 'text-amber-500';
    return 'text-emerald-600';
  };

  const defaultMockTraces: TraceRecord[] = [
    {
      trace_id: 'tr-8f2a91',
      root_query: 'Enterprise research pipeline',
      workflow_name: 'MarketResearchAgent',
      total_duration_ms: 42.0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      counterfactual_savings_usd: 0,
      spans: [],
      has_error: false,
      security_flagged: false,
      status: '200 OK',
      timestamp: new Date().toISOString()
    },
    {
      trace_id: 'tr-8f2a92',
      root_query: 'Local SLM synthesis',
      workflow_name: 'LocalGemmaInference',
      total_duration_ms: 310.2,
      input_tokens: 1420,
      output_tokens: 384,
      total_tokens: 1804,
      estimated_cost_usd: 0,
      counterfactual_savings_usd: 0,
      spans: [],
      has_error: false,
      security_flagged: false,
      status: '200 OK',
      timestamp: new Date().toISOString()
    },
    {
      trace_id: 'tr-8f2a93',
      root_query: 'Vector search compliance',
      workflow_name: 'RegulatoryVectorDB',
      total_duration_ms: 12.4,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      counterfactual_savings_usd: 0,
      spans: [],
      has_error: false,
      security_flagged: false,
      status: '200 OK',
      timestamp: new Date().toISOString()
    },
    {
      trace_id: 'tr-8f2a94',
      root_query: 'Calculator ROI model',
      workflow_name: 'ToolCalculatorError',
      total_duration_ms: 890.0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      counterfactual_savings_usd: 0,
      spans: [],
      has_error: true,
      security_flagged: false,
      status: '500 ERR',
      timestamp: new Date().toISOString()
    },
  ];

  const displayTraces = traces.length > 0 ? traces.slice(0, 3) : defaultMockTraces.slice(0, 3);

  return (
    <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100 h-full transition-all hover:shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Latest Live Traces</h3>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <button
            id="btn-view-all-traces"
            onClick={onViewAll}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-800 transition flex items-center gap-1"
          >
            <span>View All ({totalRequests.toLocaleString()})</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {displayTraces.map((trace) => {
            const badge = getTraceBadge(trace.workflow_name, trace.has_error);
            const isError = trace.has_error || trace.status.includes('500') || trace.status.includes('FAIL');
            const latencyStr = formatLatency(trace.total_duration_ms);
            const latencyColor = getLatencyColor(trace.total_duration_ms, isError);
            const statusLabel = isError ? '500 ERR' : '200 OK';

            return (
              <div
                key={trace.trace_id}
                id={`trace-item-${trace.trace_id}`}
                onClick={() => onSelectTrace(trace.trace_id)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-2.5 transition-all hover:bg-slate-100 hover:scale-[1.01] hover:shadow-sm border border-transparent hover:border-cyan-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl ${badge.color} flex items-center justify-center text-xs font-black text-white shadow-sm transition-transform group-hover:scale-105`}>
                    {badge.initial}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-cyan-600 transition truncate max-w-[180px] sm:max-w-xs">
                      {trace.workflow_name}
                    </h5>
                    <span className="text-[10px] font-mono text-slate-400">
                      {trace.trace_id}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-black ${latencyColor}`}>
                    {latencyStr}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {isError ? (
                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                    <p className={`text-[10px] font-bold ${isError ? 'text-rose-600' : 'text-slate-500'}`}>
                      {statusLabel}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-2.5 text-center">
        <span className="text-[10px] text-slate-400 font-medium">
          Click any trace to inspect full Flamegraph &amp; SLM Causal Analysis
        </span>
      </div>
    </div>
  );
};
