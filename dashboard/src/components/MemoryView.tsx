import React, { useState, useEffect } from 'react';
import { 
  Brain, Database, Plus, Trash2, Search, Sparkles, Clock, 
  Layers, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, 
  Cpu, RefreshCw, BarChart3, Filter, ShieldAlert, Zap, AlertTriangle
} from 'lucide-react';
import { AgentMemoryTelemetry, AgentMemoryFact } from '../types/telemetry';
import { fetchMemoryTelemetry, createMemoryFact, deleteMemoryFact } from '../services/api';

export const MemoryView: React.FC = () => {
  const [memory, setMemory] = useState<AgentMemoryTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isAddingFact, setIsAddingFact] = useState(false);
  const [newFactText, setNewFactText] = useState('');
  const [newFactSource, setNewFactSource] = useState('regulatory_agent');
  const [newFactCategory, setNewFactCategory] = useState('compliance');
  const [newFactMutation, setNewFactMutation] = useState('AUTONOMOUS_REFLECTION');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchMemoryTelemetry();
      setMemory(data);
    } catch (e) {
      console.error('Failed to load memory telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactText.trim()) return;
    setIsSubmitting(true);
    try {
      await createMemoryFact(newFactText.trim(), newFactSource, newFactCategory);
      setNewFactText('');
      setIsAddingFact(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFact = async (id: string) => {
    try {
      await deleteMemoryFact(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const mem: AgentMemoryTelemetry = memory || {
    working_memory_tokens: 1240,
    max_context_window: 8192,
    context_saturation_pct: 15.1,
    evicted_turns_count: 0,
    episodic_facts_count: 5,
    avg_read_latency_ms: 3.4,
    avg_write_latency_ms: 1.8,
    memory_utilization_rate: 80.0,
    active_conflicts_count: 0,
    autonomous_reflections_count: 4,
    allocation: {
      system_prompt_tokens: 420,
      tool_scratchpad_tokens: 434,
      turn_history_tokens: 558,
      free_headroom_tokens: 6780
    },
    recent_facts: []
  };

  const facts = mem.facts || mem.recent_facts || [];
  const citedCount = facts.filter(f => f.was_cited_in_last_run).length;
  const totalFacts = facts.length || 5;

  const filteredFacts = facts.filter((f) => {
    const matchesSearch = f.fact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.source_agent || f.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory || f.source === selectedCategory || f.source_agent === selectedCategory;
    
    const matchesStatus = selectedStatus === 'ALL' || 
      (selectedStatus === 'CITED' && f.was_cited_in_last_run) ||
      (selectedStatus === 'UNUSED' && !f.was_cited_in_last_run && f.status !== 'CONFLICT_FLAGGED') ||
      (selectedStatus === 'CONFLICT' && f.status === 'CONFLICT_FLAGGED');

    return matchesSearch && matchesCat && matchesStatus;
  });

  const isHighSaturation = mem.context_saturation_pct > 75;

  return (
    <div className="space-y-6">
      {/* 1. Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#0B0F19] p-6 text-white shadow-md border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Brain className="h-4 w-4" />
            <span>Cognitive Memory &amp; Working State Dynamics</span>
          </span>
          <h2 className="text-2xl font-black text-white mt-1">Agent Memory &amp; Working Scratchpad Studio</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time context saturation monitoring, semantic attribution citation tracking, autonomous reflection ledger, and multi-agent contradiction heuristics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-store-episodic-fact"
            onClick={() => setIsAddingFact(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Store Episodic Fact</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh Memory Telemetry"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Cognitive Dynamics & Mechanical Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Memory Utilization Rate */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Memory Utilization</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
              Zero Bloat
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-black text-emerald-600">
              {mem.memory_utilization_rate?.toFixed(1) || '80.0'}%
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {citedCount} of {totalFacts} facts cited in synthesis
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${mem.memory_utilization_rate || 80}%` }}
            />
          </div>
        </div>

        {/* Card 2: Belief Conflicts & Drift */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Belief Conflicts</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
              mem.active_conflicts_count > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}>
              {mem.active_conflicts_count > 0 ? 'State Drift' : 'Consistent'}
            </span>
          </div>
          <div className="my-2">
            <h3 className={`text-2xl font-black ${mem.active_conflicts_count > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {mem.active_conflicts_count} Active
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {mem.active_conflicts_count === 0 ? 'All semantic entities resolved' : 'Contradictory assertions flagged'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" />
            <span>State Drift Scanner</span>
          </div>
        </div>

        {/* Card 3: Autonomous Reflections */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Agent Reflections</span>
            <span className="rounded-full bg-[#0B0F19] px-2 py-0.5 text-[9px] font-bold text-cyan-300 border border-slate-700">
              Autonomous
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-black text-slate-900">
              {mem.autonomous_reflections_count ?? 4}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Agent self-directed memory mutations</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Autonomous memory tool calls</span>
          </div>
        </div>

        {/* Card 4: Context Saturation */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Context Saturation</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
              isHighSaturation ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {isHighSaturation ? 'High Risk' : 'Nominal'}
            </span>
          </div>
          <div className="my-2">
            <h3 className={`text-2xl font-black ${isHighSaturation ? 'text-rose-600' : 'text-slate-900'}`}>
              {mem.context_saturation_pct}%
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              {mem.working_memory_tokens.toLocaleString()} / {mem.max_context_window.toLocaleString()} tok
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div 
              className={`h-full rounded-full ${isHighSaturation ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
              style={{ width: `${Math.min(100, mem.context_saturation_pct)}%` }}
            />
          </div>
        </div>

        {/* Card 5: Episodic Facts Stored */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Episodic Store</span>
            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-700 border border-cyan-100">
              Vector DB
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-black text-cyan-600">
              {mem.episodic_facts_count}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Verified cross-session memories</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Database className="h-3 w-3 text-cyan-500" />
            <span>Cosine similarity indexed</span>
          </div>
        </div>

        {/* Card 6: Eviction Health */}
        <div className="rounded-3xl bg-[#0B0F19] p-5 text-white shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Eviction Health</span>
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              Zero Loss
            </span>
          </div>
          <div className="my-2">
            <h3 className="text-2xl font-black text-white">
              {mem.evicted_turns_count} Evictions
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">100% turn retention</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Historical integrity</span>
          </div>
        </div>
      </div>

      {/* 3. Context Window Allocation Breakdown Bar */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-600" />
              <span>Context Window Token Allocation Breakdown (8,192 Token Budget)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Live partition of the active Gemma context window across system prompt, tool scratchpads, and dialogue turns.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-slate-600 font-medium">System Prompt ({mem.allocation?.system_prompt_tokens || 420} tok)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-cyan-500" />
              <span className="text-slate-600 font-medium">Tool Scratchpad ({mem.allocation?.tool_scratchpad_tokens || 434} tok)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-800" />
              <span className="text-slate-600 font-medium">Turn History ({mem.allocation?.turn_history_tokens || 558} tok)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-200" />
              <span className="text-slate-600 font-medium">Free Headroom ({mem.allocation?.free_headroom_tokens || 6780} tok)</span>
            </div>
          </div>
        </div>

        {/* Multi-segment allocation bar */}
        <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          <div 
            className="h-full bg-amber-500 transition-all duration-500" 
            style={{ width: `${((mem.allocation?.system_prompt_tokens || 420) / mem.max_context_window) * 100}%` }}
            title={`System Prompt: ${mem.allocation?.system_prompt_tokens || 420} tokens`}
          />
          <div 
            className="h-full bg-cyan-500 transition-all duration-500" 
            style={{ width: `${((mem.allocation?.tool_scratchpad_tokens || 434) / mem.max_context_window) * 100}%` }}
            title={`Tool Scratchpad: ${mem.allocation?.tool_scratchpad_tokens || 434} tokens`}
          />
          <div 
            className="h-full bg-slate-800 transition-all duration-500" 
            style={{ width: `${((mem.allocation?.turn_history_tokens || 558) / mem.max_context_window) * 100}%` }}
            title={`Turn History: ${mem.allocation?.turn_history_tokens || 558} tokens`}
          />
          <div 
            className="h-full bg-slate-200 transition-all duration-500" 
            style={{ width: `${((mem.allocation?.free_headroom_tokens || 6780) / mem.max_context_window) * 100}%` }}
            title={`Free Headroom: ${mem.allocation?.free_headroom_tokens || 6780} tokens`}
          />
        </div>
      </div>

      {/* 4. Episodic Fact Ledger & Search */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search persisted facts, agent memories, or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-slate-200"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'CITED', label: 'Active / Cited' },
              { id: 'UNUSED', label: 'Idle / Unused' },
              { id: 'CONFLICT', label: 'Conflicts' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  selectedStatus === st.id
                    ? 'bg-[#0B0F19] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 ml-1" />
            {['ALL', 'regulatory_agent', 'synthesis_agent', 'compliance_officer', 'finance_agent'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Agents' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Fact Cards Table */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-4">Memory ID</th>
                <th className="px-5 py-4">Persisted Fact / Knowledge Entity</th>
                <th className="px-5 py-4">Cognitive Status</th>
                <th className="px-5 py-4">Mutation Source</th>
                <th className="px-5 py-4">Source Agent</th>
                <th className="px-5 py-4">Similarity Score</th>
                <th className="px-5 py-4">Token Weight</th>
                <th className="px-5 py-4">Time-Decay Age</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No episodic memory facts found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFacts.map((fact) => {
                  const isHighRelevance = (fact.similarity_score ?? fact.score) >= 0.90;
                  const isConflict = fact.status === 'CONFLICT_FLAGGED';
                  const isCited = fact.was_cited_in_last_run;
                  const isAutonomous = (fact.mutation_type || 'AUTONOMOUS_REFLECTION') === 'AUTONOMOUS_REFLECTION';

                  return (
                    <tr key={fact.id} className={`transition ${isConflict ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-5 py-4 font-mono font-bold text-cyan-600">
                        {fact.id}
                      </td>
                      
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 leading-relaxed block max-w-md">
                          {fact.fact}
                        </span>
                        {fact.category && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            Category: {fact.category}
                          </span>
                        )}
                      </td>

                      {/* Cognitive Status Column */}
                      <td className="px-5 py-4">
                        {isConflict ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 border border-rose-200">
                            <AlertCircle className="h-3 w-3" />
                            <span>CONFLICT DETECTED</span>
                          </span>
                        ) : isCited ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span>ACTIVE / CITED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 border border-slate-200">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>IDLE / UNUSED</span>
                          </span>
                        )}
                      </td>

                      {/* Mutation Source Tag */}
                      <td className="px-5 py-4">
                        {isAutonomous ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#0B0F19] px-2.5 py-1 text-[10px] font-bold text-cyan-300 border border-slate-700/80 shadow-xs">
                            <Brain className="h-3 w-3 text-cyan-400" />
                            <span>Autonomous Reflection</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200">
                            <Database className="h-3 w-3 text-slate-500" />
                            <span>System Ingestion</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                          {fact.source_agent || fact.source}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${
                          isHighRelevance ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {((fact.similarity_score ?? fact.score) * 100).toFixed(0)}% Match
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-bold text-slate-600">
                        {fact.token_weight ?? fact.token_count ?? 18} tok
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{fact.age || 'just now'}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteFact(fact.id)}
                          title="Prune / Delete Fact"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* 5. Add Episodic Fact Modal */}
      {isAddingFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <Brain className="h-4 w-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Store New Episodic Fact</h3>
              </div>
              <button
                onClick={() => setIsAddingFact(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFact} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fact Payload / Entity Statement
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Q4 2026 expansion plan requires zero-trust vector validation..."
                  value={newFactText}
                  onChange={(e) => setNewFactText(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Attributed Agent Source
                  </label>
                  <select
                    value={newFactSource}
                    onChange={(e) => setNewFactSource(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="regulatory_agent">Regulatory Agent</option>
                    <option value="synthesis_agent">Synthesis Agent</option>
                    <option value="compliance_officer">Compliance Officer</option>
                    <option value="finance_agent">Financial Analyst</option>
                    <option value="orchestrator">Lead Orchestrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={newFactCategory}
                    onChange={(e) => setNewFactCategory(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="infrastructure">Infrastructure</option>
                    <option value="performance">Performance</option>
                    <option value="compliance">Compliance</option>
                    <option value="economics">Economics</option>
                    <option value="sla_bound">SLA Bound</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingFact(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newFactText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-[#0B0F19] px-5 py-2 text-xs font-bold text-white shadow-md border border-slate-700/60 hover:bg-[#1E293B] transition disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isSubmitting ? 'Storing...' : 'Store Fact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
