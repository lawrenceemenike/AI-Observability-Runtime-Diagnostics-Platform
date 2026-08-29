import React, { useState } from 'react';
import { Info, HelpCircle } from 'lucide-react';

interface CircularGaugeProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  timeframe?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  percentage = 89,
  label = "RAG Retrieval Hit Rate",
  sublabel = "Relevant Context Coverage",
  timeframe = "Rolling 24h Window"
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [showTooltip, setShowTooltip] = useState(false);
  const clamped = Math.min(100, Math.max(0, percentage));
  
  // Circumference for semi-circle of radius 38 (arc length = pi * r ≈ 119.38)
  const arcLength = 119.38;
  const strokeOffset = arcLength * (1 - clamped / 100);

  return (
    <div className="relative flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md h-full">
      {/* Header with Title and Timeframe Badge */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              {label}
            </span>
            <div className="relative">
              <button 
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <HelpCircle className="h-3 w-3" />
              </button>
              {showTooltip && (
                <div className="absolute left-0 top-5 z-20 w-48 rounded-xl bg-slate-900 p-2.5 text-[10px] text-white shadow-xl">
                  Percentage of agent queries where vector retrieval returned relevant context chunks with similarity score &ge; 0.85 over the selected window.
                </div>
              )}
            </div>
          </div>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/60">
            {selectedTimeframe}
          </span>
        </div>

        <p className="text-[10px] text-slate-400 mt-0.5">
          Cosine Similarity &ge; 0.85 Threshold
        </p>
      </div>
      
      {/* Semi-Circle SVG Gauge (Compact height to align with top 3 traces) */}
      <div className="relative my-0.5 flex h-20 w-full items-center justify-center">
        <svg className="h-full w-36 overflow-visible" viewBox="0 0 100 52">
          {/* Background Track */}
          <path
            d="M 12 48 A 38 38 0 0 1 88 48"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Active Solar Orange Arc */}
          <path
            d="M 12 48 A 38 38 0 0 1 88 48"
            fill="none"
            stroke="#FF7A1A"
            strokeWidth="9"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 text-center">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {clamped}%
          </span>
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
            {clamped >= 85 ? '● Optimal Coverage' : '○ Moderate Context'}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
        <span className="text-slate-400 font-medium">Top-k Precision</span>
        <span className="font-bold text-slate-700">k=2 chunks / query</span>
      </div>
    </div>
  );
};
