import React from 'react';
import { 
  Award, CheckCircle2, AlertTriangle, XCircle, Sparkles, 
  RotateCcw, Compass, Wrench, ShieldCheck, Target, Clock, ArrowRight
} from 'lucide-react';
import { AgentTraceEvaluation } from '../types/telemetry';

interface AgentEvalScorecardProps {
  evaluation: AgentTraceEvaluation | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export const AgentEvalScorecard: React.FC<AgentEvalScorecardProps> = ({
  evaluation,
  loading = false,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Grading agent execution trajectory &amp; grounding faithfulness...</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
        <Award className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">No evaluation data available for this trace.</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0B0F19] px-4 py-2 text-xs font-bold text-white shadow-sm border border-slate-700/60 hover:bg-[#1E293B] transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Run LLM Judge Evaluation</span>
          </button>
        )}
      </div>
    );
  }

  const trajPct = Math.round(evaluation.trajectory_efficiency_score * 100);
  const toolPct = Math.round(evaluation.tool_precision_score * 100);
  const faithPct = Math.round(evaluation.faithfulness_score * 100);
  const goalPct = Math.round(evaluation.goal_completion_score * 100);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 4 Core Score Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Trajectory Efficiency */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-cyan-500" />
              <span>Trajectory Efficiency</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(trajPct)}`}>
              {trajPct}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-black text-slate-900">
              {evaluation.total_steps_executed} / {evaluation.optimal_steps_baseline} Steps
            </div>
            <p className="text-[10px] text-slate-400">
              {evaluation.redundant_loops_detected === 0 ? 'Optimal path convergence' : `${evaluation.redundant_loops_detected} redundant step loop(s)`}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className={`h-full rounded-full ${trajPct >= 80 ? 'bg-cyan-500' : 'bg-amber-500'}`} 
              style={{ width: `${Math.min(100, trajPct)}%` }} 
            />
          </div>
        </div>

        {/* 2. Tool-Call Precision */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-cyan-500" />
              <span>Tool Call Precision</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(toolPct)}`}>
              {toolPct}%
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-black text-slate-900">
              {evaluation.successful_tool_calls} / {evaluation.total_tools_called} Valid
            </div>
            <p className="text-[10px] text-slate-400">
              {evaluation.total_tools_called === 0 ? 'No external tools called' : 'Zero schema argument errors'}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className={`h-full rounded-full ${toolPct >= 90 ? 'bg-cyan-500' : 'bg-rose-500'}`} 
              style={{ width: `${Math.min(100, toolPct)}%` }} 
            />
          </div>
        </div>

        {/* 3. Grounding Faithfulness */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>Grounding Faithfulness</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(faithPct)}`}>
              {evaluation.faithfulness_score.toFixed(2)} / 1.0
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-black text-amber-600">
              {faithPct}% Grounded
            </div>
            <p className="text-[10px] text-slate-400">
              Vector chunk provenance verified
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full rounded-full bg-amber-500" 
              style={{ width: `${Math.min(100, faithPct)}%` }} 
            />
          </div>
        </div>

        {/* 4. Goal Completion */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <span>Goal Completion</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(goalPct)}`}>
              {evaluation.goal_completion_score.toFixed(2)} / 1.0
            </span>
          </div>
          <div className="my-2">
            <div className="text-xl font-black text-emerald-600">
              {goalPct}% Solved
            </div>
            <p className="text-[10px] text-slate-400">
              User query constraints satisfied
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500" 
              style={{ width: `${Math.min(100, goalPct)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Judge Reasoning Box */}
      <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm border border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Gemma LLM-as-a-Judge Evaluation Causal Justification
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <Clock className="h-3 w-3" />
            <span>{evaluation.evaluation_duration_ms}ms judge latency</span>
          </div>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
          "{evaluation.judge_reasoning}"
        </p>
      </div>

      {/* Tool Invocations Ledger */}
      {evaluation.tool_evaluations && evaluation.tool_evaluations.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-slate-500" />
              <span>Tool Call Reliability &amp; Redundancy Matrix ({evaluation.tool_evaluations.length})</span>
            </h5>
            <span className="text-[10px] text-slate-400">Zero-Mock Trace Provenance</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {evaluation.tool_evaluations.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    t.status === 'VALID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    t.status === 'REDUNDANT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {t.status === 'VALID' && <CheckCircle2 className="h-3 w-3" />}
                    {t.status === 'REDUNDANT' && <RotateCcw className="h-3 w-3" />}
                    {t.status === 'ERRORED' && <XCircle className="h-3 w-3" />}
                    <span>{t.status}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">{t.tool_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 text-[11px]">{t.reason}</span>
                  <span className="font-mono text-[11px] font-bold text-slate-400">{t.duration_ms.toFixed(1)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
