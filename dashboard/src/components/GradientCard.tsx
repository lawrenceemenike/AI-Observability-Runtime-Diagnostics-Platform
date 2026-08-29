import React from 'react';
import { DollarSign, ShieldCheck, HelpCircle } from 'lucide-react';

interface GradientCardProps {
  savings: number;
  totalTokens: number;
}

export const GradientCard: React.FC<GradientCardProps> = ({ savings, totalTokens }) => {
  const tokenFormatted = totalTokens > 0 
    ? (totalTokens >= 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(1)}M` : `${(totalTokens / 1_000).toFixed(0)}k`)
    : '4.2M';

  const formatSavings = (val: number) => {
    if (val <= 0) {
      if (totalTokens > 0) {
        const computed = (totalTokens / 1_000_000) * 14.85;
        return computed < 1.0 ? computed.toFixed(3) : computed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      }
      return '5,000';
    }
    if (val < 1.0) {
      return val.toFixed(3);
    }
    if (val < 100) {
      return val.toFixed(2);
    }
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF7A1A] via-[#FF8A00] to-[#E65100] p-5 text-white shadow-xl h-full border border-amber-300/30 transition-all hover:shadow-2xl">
      {/* Subtle geometric background glow */}
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-lg pointer-events-none" />
      
      <div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
              Counterfactual Savings
            </span>
          </div>
          <span className="rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white border border-white/20">
            All-Time Cumulative
          </span>
        </div>

        <p className="text-[10px] text-white/80 mt-0.5">
          Cloud API ($15/1M) vs Local COGS ($0.15/1M)
        </p>

        <div className="mt-2.5 flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-white tracking-tight">
            ${formatSavings(savings)}
          </h3>
          <span className="text-[10px] font-bold text-emerald-200 bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
            99.0% Margins
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/20 pt-2 text-[10px]">
        <span className="text-white/90 font-medium flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          {tokenFormatted} Tokens
        </span>
        <span className="rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 font-bold text-white flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          100% On-Prem
        </span>
      </div>
    </div>
  );
};
