import React from 'react';
import { Brain, ArrowUpRight } from 'lucide-react';
import { AgentMemoryTelemetry } from '../types/telemetry';

interface MemoryCardProps {
  memoryData?: Partial<AgentMemoryTelemetry>;
  onNavigateToMemory: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memoryData = {
    working_memory_tokens: 1240,
    max_context_window: 8192,
    context_saturation_pct: 15.1,
    evicted_turns_count: 0,
    episodic_facts_count: 5,
    memory_utilization_rate: 75.0,
    active_conflicts_count: 0
  },
  onNavigateToMemory
}) => {
  const isHighSaturation = (memoryData?.context_saturation_pct ?? 15.1) > 75;
  const utilRate = memoryData?.memory_utilization_rate ?? 75.0;
  const conflictsCount = memoryData?.active_conflicts_count ?? 0;

  return (
    <div className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Brain className="h-4 w-4"/>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">Agent Memory &amp; Cognitive State</span>
            <p className="text-[10px] text-slate-400">Context Window &amp; Episodic Store</p>
          </div>
        </div>
        <button 
          onClick={onNavigateToMemory}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-[#0B0F19] hover:text-white transition"
          title="Open Memory Studio"
        >
          <ArrowUpRight className="h-3.5 w-3.5"/>
        </button>
      </div>

      <div className="my-3 grid grid-cols-2 gap-2 border-y border-slate-50 py-2.5">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Context Saturation</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-xl font-black ${isHighSaturation ? 'text-rose-600' : 'text-slate-900'}`}>
              {memoryData.context_saturation_pct ?? 15.1}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({memoryData.working_memory_tokens ?? 1240} tok)
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-semibold text-slate-400 block">Episodic Facts</span>
          <div className="flex items-baseline justify-end gap-1 mt-0.5">
            <span className="text-xl font-black text-cyan-600">{memoryData.episodic_facts_count ?? 5}</span>
            <span className="text-[10px] text-slate-400">stored</span>
          </div>
        </div>
      </div>

      {/* Memory Health & Cognitive Dynamics Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px]">
        <span className="font-semibold text-slate-500">
          Memory Utilization: <strong className="text-emerald-600 font-bold">{Math.round(utilRate)}% Cited</strong>
        </span>
        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full border ${
          conflictsCount > 0 
            ? 'text-rose-600 bg-rose-50 border-rose-200' 
            : 'text-slate-600 bg-slate-50 border-slate-200'
        }`}>
          {conflictsCount} {conflictsCount === 1 ? 'Conflict' : 'Conflicts'}
        </span>
      </div>
    </div>
  );
};
