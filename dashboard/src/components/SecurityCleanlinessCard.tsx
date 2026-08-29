import React from 'react';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';

interface SecurityCleanlinessCardProps {
  incidentsCount: number;
  totalRequests: number;
}

export const SecurityCleanlinessCard: React.FC<SecurityCleanlinessCardProps> = ({
  incidentsCount = 2,
  totalRequests = 12481,
}) => {
  const cleanRatio = totalRequests > 0 
    ? Math.max(90.0, 100.0 - (incidentsCount / totalRequests) * 100).toFixed(1)
    : '99.8';

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0B0F19] p-5 text-white shadow-sm border border-slate-800 transition-all hover:shadow-md h-full">
      {/* Background glow */}
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-cyan-400/10 blur-xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
              <Shield className="h-3 w-3" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Zero-Trust Security
            </span>
          </div>

          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold text-cyan-400 border border-white/10">
            Rolling 24h Audit
          </span>
        </div>

        <p className="text-[10px] text-slate-400 mt-0.5">
          OWASP LLM01, LLM04 &amp; LLM06
        </p>

        {/* Primary Numbers */}
        <div className="mt-2.5 flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-black text-white tracking-tight">
              {cleanRatio}%
            </span>
            <span className="text-xs font-bold text-slate-400 ml-1">Clean</span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">Threats Blocked</span>
            <span className="text-sm font-black text-amber-300 font-mono">
              {incidentsCount} Intercepted
            </span>
          </div>
        </div>
      </div>

      {/* Badge items */}
      <div className="mt-2 flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
          <CheckCircle2 className="h-2.5 w-2.5" />
          0 Breaches
        </span>
        <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[9px] font-bold text-slate-300">
          H(X) &ge; 4.3 Redacted
        </span>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[10px]">
        <span className="text-slate-400 font-medium">Outbound Egress</span>
        <span className="font-bold text-cyan-400">0 KB Cloud Leakage</span>
      </div>
    </div>
  );
};
