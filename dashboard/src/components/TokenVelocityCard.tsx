import React from 'react';
import { Zap } from 'lucide-react';

interface TokenVelocityCardProps {
  tokensPerSecond: number;
  ttftMs: number;
}

export const TokenVelocityCard: React.FC<TokenVelocityCardProps> = ({
  tokensPerSecond = 48.5,
  ttftMs = 112.5,
}) => {
  const displayVel = tokensPerSecond > 0 ? tokensPerSecond.toFixed(1) : '48.5';
  
  const SLA_BUDGET_MS = 350;
  const ttftNum = Number(ttftMs) > 0 ? Number(ttftMs) : 112.5;
  const isBudgetBreached = ttftNum > SLA_BUDGET_MS;
  
  const displayTtft = ttftNum >= 1000 
    ? `${(ttftNum / 1000).toFixed(2)}s` 
    : `${ttftNum.toFixed(0)}ms`;

  const ttftTextColor = isBudgetBreached ? 'text-rose-600' : 'text-emerald-600';
  const statusLabel = isBudgetBreached ? '● SLA Breach' : '● Within Budget';
  const statusColor = isBudgetBreached ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold';

  const progressPercent = Math.min(100, (ttftNum / SLA_BUDGET_MS) * 100);
  const progressBarClass = isBudgetBreached
    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
    : 'bg-gradient-to-r from-cyan-500 to-emerald-500';

  return (
    <div className="relative flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <Zap className="h-3 w-3" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Token Velocity &amp; TTFT
            </span>
          </div>

          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-700 border border-cyan-100">
            Live 60s Stream
          </span>
        </div>

        <p className="text-[10px] text-slate-400 mt-0.5">
          Generation Throughput vs SLA Budget
        </p>

        {/* Primary Numbers */}
        <div className="mt-2.5 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {displayVel}
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1">tok/s</span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">Avg TTFT</span>
            <span className={`text-sm font-black font-mono ${ttftTextColor}`}>
              {displayTtft}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Target Status */}
      <div className="mt-2 space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>TTFT Budget SLA: &lt; 350ms</span>
          <span className={statusColor}>{statusLabel}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div 
            className={`h-full rounded-full ${progressBarClass} transition-all duration-700`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
        <span className="text-slate-400 font-medium">Inference Engine</span>
        <span className="font-bold text-cyan-700">Ollama Gemma SLM</span>
      </div>
    </div>
  );
};
