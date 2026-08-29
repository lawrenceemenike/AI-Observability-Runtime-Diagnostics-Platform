import React, { useState, useEffect } from 'react';
import { 
  X, Cpu, Clock, Layers, AlertTriangle, CheckCircle2, Sparkles, 
  Terminal, Activity, ArrowRight, Database, FileText, ShieldCheck, 
  ShieldAlert, Hash, Copy, Check, ChevronDown, ChevronUp, Code, Award
} from 'lucide-react';
import { TraceRecord, TelemetrySpan, AnomalyAnalysisResponse, ChunkTelemetry, AgentTraceEvaluation } from '../types/telemetry';
import { fetchTraceById, analyzeTraceAnomaly, fetchTraceEvaluation } from '../services/api';
import { AgentEvalScorecard } from './AgentEvalScorecard';

interface TraceWaterfallModalProps {
  traceId: string | null;
  onClose: () => void;
}

export const TraceWaterfallModal: React.FC<TraceWaterfallModalProps> = ({ traceId, onClose }) => {
  const [trace, setTrace] = useState<TraceRecord | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<TelemetrySpan | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AnomalyAnalysisResponse | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'chunks' | 'eval' | 'json'>('chunks');
  const [mainModalTab, setMainModalTab] = useState<'flamegraph' | 'evaluation'>('flamegraph');
  const [evaluation, setEvaluation] = useState<AgentTraceEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    if (!traceId) {
      setTrace(null);
      setSelectedSpan(null);
      setDiagnosis(null);
      setEvaluation(null);
      return;
    }

    setLoading(true);
    fetchTraceById(traceId)
      .then((data) => {
        setTrace(data);
        if (data.spans && data.spans.length > 0) {
          setSelectedSpan(data.spans[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Also fetch evaluation for this trace
    setEvalLoading(true);
    fetchTraceEvaluation(traceId)
      .then((ev) => setEvaluation(ev))
      .catch((err) => console.error('Evaluation fetch error:', err))
      .finally(() => setEvalLoading(false));
  }, [traceId]);

  const handleRunDiagnosis = async () => {
    if (!trace) return;
    setAnalyzing(true);
    try {
      const res = await analyzeTraceAnomaly(trace.trace_id, trace.has_error ? 'Execution error detected' : 'Diagnostic review');
      setDiagnosis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(id);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  if (!traceId) return null;

  const totalDuration = trace?.total_duration_ms || 100;

  const getKindColor = (kind: string) => {
    switch (kind) {
      case 'orchestrator': return 'bg-[#0B0F19] text-white';
      case 'agent': return 'bg-emerald-500 text-white';
      case 'llm': return 'bg-cyan-600 text-white';
      case 'tool': return 'bg-emerald-600 text-white';
      case 'retriever': return 'bg-amber-500 text-white';
      case 'security': return 'bg-rose-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getKindBarColor = (kind: string, isError: boolean) => {
    if (isError) return 'bg-rose-500';
    switch (kind) {
      case 'orchestrator': return 'bg-[#0B0F19]';
      case 'agent': return 'bg-emerald-500';
      case 'llm': return 'bg-cyan-600';
      case 'tool': return 'bg-emerald-600';
      case 'retriever': return 'bg-amber-500';
      case 'security': return 'bg-rose-500';
      default: return 'bg-slate-700';
    }
  };

  // Inspect if current selected span has chunk telemetry
  const isRetrieverSpan = selectedSpan?.kind === 'retriever' || 
    selectedSpan?.name.toLowerCase().includes('retriever') ||
    !!selectedSpan?.attributes?.['gen_ai.retrieval.chunks'];

  const retrievedChunks: ChunkTelemetry[] = selectedSpan?.attributes?.['gen_ai.retrieval.chunks'] || [];
  const totalChunkTokens = selectedSpan?.attributes?.['gen_ai.retrieval.total_tokens'] || 
    retrievedChunks.reduce((acc, c) => acc + (c.token_count || 0), 0);
  const retrievalStrategy = selectedSpan?.attributes?.['gen_ai.retrieval.strategy'] || 'Hybrid Dense (Cosine) + Sparse (BM25)';
  const rerankerModel = selectedSpan?.attributes?.['gen_ai.retrieval.reranker'] || 'cross-encoder/ms-marco-MiniLM-L-6-v2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        id="trace-waterfall-modal"
        className="relative flex flex-col max-h-[92vh] w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B0F19] text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  Trace Waterfall &amp; Flamegraph
                </h3>
                <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                  {traceId}
                </span>
                {trace?.has_error ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    Failed
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    OK 200
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xl">
                {trace?.root_query || 'Enterprise multi-agent pipeline'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-slm-diag"
              onClick={handleRunDiagnosis}
              disabled={analyzing || !trace}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF7A1A] to-[#FF5500] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{analyzing ? 'Gemma SLM Diagnosing...' : 'Gemma Root-Cause Attribution'}</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-2">
          <button
            onClick={() => setMainModalTab('flamegraph')}
            className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition ${
              mainModalTab === 'flamegraph'
                ? 'bg-[#0B0F19] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Flamegraph &amp; Span Inspector</span>
          </button>

          <button
            onClick={() => setMainModalTab('evaluation')}
            className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition ${
              mainModalTab === 'evaluation'
                ? 'bg-[#0B0F19] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-400" />
            <span>Agent Trajectory &amp; Evaluation</span>
            {evaluation && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-700 px-2 py-0.5 text-[10px] font-mono font-bold">
                {Math.round(evaluation.faithfulness_score * 100)}% Grounded
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B0F19] border-t-transparent" />
            </div>
          ) : !trace ? (
            <div className="text-center py-12 text-slate-400">Trace data unavailable</div>
          ) : mainModalTab === 'evaluation' ? (
            <AgentEvalScorecard 
              evaluation={evaluation} 
              loading={evalLoading}
              onRefresh={() => {
                if (!traceId) return;
                setEvalLoading(true);
                fetchTraceEvaluation(traceId, true)
                  .then(ev => setEvaluation(ev))
                  .finally(() => setEvalLoading(false));
              }}
            />
          ) : (
            <>
              {/* SLM Root-Cause Attribution Callout (if analyzed) */}
              {diagnosis && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-950 p-5 text-white shadow-lg border border-slate-700/80 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-300" />
                      <h4 className="font-bold text-sm text-white">Local Gemma SLM Causal Attribution</h4>
                    </div>
                    <span className="rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                      {(diagnosis.confidence_score * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 backdrop-blur-md border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Root Cause</span>
                      <p className="text-xs font-semibold text-white mt-1">{diagnosis.root_cause}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 backdrop-blur-md border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Affected Layer</span>
                      <p className="text-xs font-semibold text-amber-300 mt-1">{diagnosis.affected_layer}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 backdrop-blur-md border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remediation Action</span>
                      <p className="text-xs font-semibold text-emerald-300 mt-1">{diagnosis.recommended_remediation}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-300 font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800">
                    {diagnosis.raw_llm_response}
                  </div>
                </div>
              )}

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Latency</span>
                  <p className="text-lg font-black text-slate-900">{trace.total_duration_ms.toFixed(1)}ms</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Tokens</span>
                  <p className="text-lg font-black text-cyan-600">{trace.total_tokens.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Span Hierarchy</span>
                  <p className="text-lg font-black text-slate-900">{trace.spans.length} Spans</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Counterfactual Saved</span>
                  <p className="text-lg font-black text-emerald-600">${trace.counterfactual_savings_usd.toFixed(4)}</p>
                </div>
              </div>

              {/* Waterfall Flamegraph Timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-700">Execution Waterfall &amp; Timeline</span>
                  <span className="text-[10px] font-mono text-slate-400">Scale: 0ms → {totalDuration.toFixed(0)}ms</span>
                </div>

                <div className="space-y-2">
                  {trace.spans.map((span) => {
                    const isErr = span.status === 'ERROR';
                    const isSelected = selectedSpan?.span_id === span.span_id;
                    const durationPct = Math.max(8, Math.min(100, (span.duration_ms / totalDuration) * 100));
                    const isChild = !!span.parent_span_id;

                    return (
                      <div
                        key={span.span_id}
                        onClick={() => setSelectedSpan(span)}
                        className={`group flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all ${
                          isSelected ? 'bg-cyan-50/80 ring-2 ring-cyan-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex items-center gap-2 ${isChild ? 'pl-6' : ''} w-1/3 shrink-0`}>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${getKindColor(span.kind)}`}>
                            {span.kind}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate" title={span.name}>
                            {span.name}
                          </span>
                        </div>

                        {/* Proportional Waterfall Bar */}
                        <div className="w-1/2 px-2">
                          <div className="relative h-5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getKindBarColor(span.kind, isErr)} transition-all duration-500 flex items-center justify-end px-2`}
                              style={{ width: `${durationPct}%` }}
                            >
                              <span className="text-[9px] font-bold text-white whitespace-nowrap">
                                {span.duration_ms.toFixed(1)}ms
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-20 text-right shrink-0">
                          <span className={`text-[10px] font-bold ${isErr ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {span.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Span Inspector Panel */}
              {selectedSpan && (
                <div className="rounded-2xl bg-[#0F172A] p-5 text-white shadow-md border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                        {isRetrieverSpan ? <Database className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Span Inspector:</span>
                          <span className="text-cyan-300 font-mono">{selectedSpan.name}</span>
                        </h4>
                      </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-2">
                      {isRetrieverSpan && retrievedChunks.length > 0 && (
                        <div className="flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
                          <button
                            onClick={() => setActiveInspectorTab('chunks')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                              activeInspectorTab === 'chunks'
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Database className="h-3 w-3" />
                            <span>Chunk Intelligence Matrix ({retrievedChunks.length})</span>
                          </button>
                          <button
                            onClick={() => setActiveInspectorTab('json')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                              activeInspectorTab === 'json'
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Code className="h-3 w-3" />
                            <span>Raw OTel JSON</span>
                          </button>
                        </div>
                      )}
                      <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                        ID: {selectedSpan.span_id}
                      </span>
                    </div>
                  </div>

                  {/* Top Metadata Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kind</span>
                      <p className="font-bold text-white uppercase">{selectedSpan.kind}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
                      <p className="font-bold text-emerald-400">{selectedSpan.duration_ms.toFixed(2)}ms</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <p className={`font-bold ${selectedSpan.status === 'ERROR' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedSpan.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Parent Span</span>
                      <p className="font-mono text-slate-300 truncate">{selectedSpan.parent_span_id || 'None (Root)'}</p>
                    </div>
                  </div>

                  {/* RETRIEVER CHUNKING & RETRIEVAL INTELLIGENCE VIEW */}
                  {isRetrieverSpan && activeInspectorTab === 'chunks' && retrievedChunks.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {/* Top Retrieval Summary Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 rounded-xl bg-slate-800/60 p-3 border border-slate-700/60 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Retrieved</span>
                          <span className="font-black text-white text-sm">k = {retrievedChunks.length} chunks</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Cumulative Tokens</span>
                          <span className="font-black text-cyan-300 text-sm">{totalChunkTokens} tokens</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Chunking Strategy</span>
                          <span className="font-semibold text-slate-200 text-xs">Semantic Recursive (512 / 50 overlap)</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Re-Ranker Model</span>
                          <span className="font-mono text-[11px] text-cyan-300 truncate block" title={rerankerModel}>
                            {rerankerModel.split('/').pop()}
                          </span>
                        </div>
                      </div>

                      {/* Granular Chunk Cards */}
                      <div className="space-y-3">
                        {retrievedChunks.map((chunk, cIdx) => {
                          const isHighSim = chunk.cosine_similarity >= 0.85;
                          const isHighEntropySecret = chunk.shannon_entropy >= 4.9;

                          return (
                            <div 
                              key={chunk.chunk_id || cIdx}
                              className="rounded-xl bg-slate-800/80 p-4 border border-slate-700 shadow-sm transition hover:border-cyan-500/50"
                            >
                              {/* Chunk Card Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                                    {chunk.chunk_id}
                                  </span>
                                  <div className="flex items-center gap-1 text-slate-300 text-xs font-medium">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="font-semibold">{chunk.source_document}</span>
                                    <span className="text-slate-500 font-mono">[{chunk.chunk_index}]</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                                    {chunk.token_count} tokens
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {chunk.character_count} chars
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(chunk.content, chunk.chunk_id)}
                                    title="Copy chunk content"
                                    className="flex items-center gap-1 rounded bg-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-600 hover:text-white transition"
                                  >
                                    {copiedChunkId === chunk.chunk_id ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Metric & Security Badges Row */}
                              <div className="my-2.5 flex flex-wrap items-center gap-2">
                                {/* Cosine Similarity */}
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                  isHighSim 
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                }`}>
                                  <Hash className="h-3 w-3" />
                                  <span>{chunk.cosine_similarity.toFixed(2)} Cosine Sim</span>
                                </span>

                                {/* BM25 Score */}
                                {chunk.bm25_score !== undefined && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-950/80 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-800">
                                    <span>BM25: {chunk.bm25_score.toFixed(1)}</span>
                                  </span>
                                )}

                                {/* Rank Shift */}
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-0.5 text-[11px] font-bold text-slate-300 border border-slate-700">
                                  <span>Rank: #{chunk.initial_rank} → #{chunk.reranked_rank}</span>
                                </span>

                                {/* Shannon Entropy */}
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                  isHighEntropySecret
                                    ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                    : 'bg-slate-900/60 text-slate-300 border-slate-700'
                                }`}>
                                  <span>H(X) = {chunk.shannon_entropy.toFixed(2)}</span>
                                  {isHighEntropySecret ? (
                                    <span className="ml-1 text-[9px] font-bold text-rose-400 uppercase tracking-tight">High Entropy</span>
                                  ) : (
                                    <span className="ml-1 text-[9px] font-medium text-slate-400 uppercase tracking-tight">Prose</span>
                                  )}
                                </span>

                                {/* Ingress Injection Scan */}
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                  chunk.is_injection_clean 
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                                    : 'bg-rose-950/80 text-rose-300 border-rose-800'
                                }`}>
                                  {chunk.is_injection_clean ? (
                                    <>
                                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                                      <span>OWASP Clean Ingress</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldAlert className="h-3 w-3 text-rose-400" />
                                      <span>Injection Flagged</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {/* Text Payload Snippet */}
                              <div className="relative rounded-lg bg-black/40 p-3 font-mono text-xs text-slate-300 border border-slate-800/80 leading-relaxed">
                                <span className="absolute -top-2 right-2 rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                                  Chunk Content
                                </span>
                                {chunk.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Default Raw Attributes JSON View */
                    <div className="mt-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        OpenTelemetry Semantic Attributes &amp; Payloads
                      </span>
                      <pre className="max-h-56 overflow-y-auto rounded-xl bg-black/40 p-3.5 font-mono text-[11px] text-cyan-200 border border-slate-800 leading-relaxed">
                        {JSON.stringify(selectedSpan.attributes, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error Log */}
                  {selectedSpan.error_message && (
                    <div className="mt-3 rounded-xl bg-rose-950/60 border border-rose-800/60 p-3">
                      <span className="text-[10px] font-bold uppercase text-rose-300">Error Exception</span>
                      <p className="text-xs font-mono text-rose-200 mt-1">{selectedSpan.error_message}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-[#F8FAFC] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
