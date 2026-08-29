import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { ActivityStream } from './components/ActivityStream';
import { CircularGauge } from './components/CircularGauge';
import { GradientCard } from './components/GradientCard';
import { TraceWaterfallModal } from './components/TraceWaterfallModal';
import { AgentRunnerModal } from './components/AgentRunnerModal';
import { TraceExplorer } from './components/TraceExplorer';
import { MetricsView } from './components/MetricsView';
import { SecurityView } from './components/SecurityView';
import { ChaosController } from './components/ChaosController';
import { GovernanceView } from './components/GovernanceView';
import { TokenVelocityCard } from './components/TokenVelocityCard';
import { SecurityCleanlinessCard } from './components/SecurityCleanlinessCard';
import { MemoryCard } from './components/MemoryCard';
import { MemoryView } from './components/MemoryView';
import { EvaluationView } from './components/EvaluationView';

import { RuntimeMetricsSnapshot, TraceRecord, AgentMemoryTelemetry } from './types/telemetry';
import { fetchMetrics, fetchTraces, fetchMemoryTelemetry, subscribeToTelemetryStream } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isRunnerOpen, setIsRunnerOpen] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<RuntimeMetricsSnapshot>({
    total_requests: 12481,
    success_rate: 98.7,
    failure_rate: 1.3,
    p50_latency_ms: 210.0,
    p95_latency_ms: 2410.0,
    p99_latency_ms: 3200.0,
    ttft_ms: 112.5,
    avg_tokens_per_req: 2842.0,
    tokens_per_second: 48.5,
    total_tokens_processed: 4200000,
    counterfactual_savings_usd: 5000.0,
    security_incidents_count: 2,
    active_models: { 'gemma:2b': 1 },
    rag_retrieval_hit_rate: 89.0,
    active_workers: 25
  });

  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [memoryData, setMemoryData] = useState<AgentMemoryTelemetry | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string>('24h');

  // Initial load via REST
  const refreshData = useCallback(async () => {
    try {
      const [m, t, mem] = await Promise.all([
        fetchMetrics(selectedTimeWindow),
        fetchTraces(1000),
        fetchMemoryTelemetry()
      ]);
      if (m) setMetrics(m);
      if (t) setTraces(t);
      if (mem) setMemoryData(mem);
    } catch (e) {
      console.error(e);
    }
  }, [selectedTimeWindow]);

  const handleTimeWindowChange = async (win: string) => {
    setSelectedTimeWindow(win);
    try {
      const updated = await fetchMetrics(win);
      if (updated) setMetrics(updated);
    } catch (e) {
      console.error('Failed to switch time window', win, e);
    }
  };

  useEffect(() => {
    refreshData();

    // Subscribe to SSE real-time stream
    const unsubscribe = subscribeToTelemetryStream(
      (data) => {
        setIsStreaming(true);
        if (data.metrics) setMetrics(data.metrics);
        if (data.traces && data.traces.length > 0) setTraces(data.traces);
      },
      () => {
        setIsStreaming(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [refreshData]);

  const handleTraceGenerated = (traceId: string) => {
    setSelectedTraceId(traceId);
    refreshData();
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6FA] text-slate-800 font-sans antialiased">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Content Canvas */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {/* Top Bar Header */}
        <Header 
          onOpenRunner={() => setIsRunnerOpen(true)}
          onSelectTrace={(tid) => setSelectedTraceId(tid)}
          onRefresh={refreshData}
          selectedTimeWindow={selectedTimeWindow}
          onTimeWindowChange={handleTimeWindowChange}
          isStreaming={isStreaming}
        />

        {/* View Routing */}
        <div className="mt-8 pb-12">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Row: Hero Card & Operational Status */}
              <MetricCards 
                metrics={metrics}
                onOpenRunner={() => setIsRunnerOpen(true)}
                onOpenChaos={() => setActiveTab('chaos')}
                isGenerating={isGenerating}
              />

              {/* Bottom Diagnostics Grid (2-row 12-column Databerry Grid) */}
              <div className="space-y-4">
                {/* Row 1: Activity Stream + RAG Retrieval Hit Rate + Counterfactual Savings */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Live Activity Stream (6 cols) */}
                  <div className="col-span-12 lg:col-span-6">
                    <ActivityStream
                      traces={traces}
                      totalRequests={metrics.total_requests}
                      onSelectTrace={(tid) => setSelectedTraceId(tid)}
                      onViewAll={() => setActiveTab('traces')}
                    />
                  </div>

                  {/* Top-Right Cards: RAG Retrieval & Counterfactual Savings (6 cols total -> 3 cols each) */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <CircularGauge
                      percentage={metrics.rag_retrieval_hit_rate || 89}
                      label="RAG Retrieval Hit Rate"
                      sublabel="Cosine Similarity ≥ 0.85"
                      timeframe="Rolling 24h Window"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <GradientCard
                      savings={metrics.counterfactual_savings_usd || 5000}
                      totalTokens={metrics.total_tokens_processed || 4200000}
                    />
                  </div>
                </div>

                {/* Row 2: Agent Memory & State + Token Velocity & TTFT + Zero-Trust Security (4 cols each) */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Bottom-Left: Agent Memory & Working State Tile */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                    <MemoryCard
                      memoryData={memoryData || {
                        working_memory_tokens: 1240,
                        max_context_window: 8192,
                        context_saturation_pct: 15.1,
                        evicted_turns_count: 0,
                        episodic_facts_count: 28
                      }}
                      onNavigateToMemory={() => setActiveTab('memory')}
                    />
                  </div>

                  {/* Bottom-Center: Token Velocity & TTFT Budget */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                    <TokenVelocityCard
                      tokensPerSecond={metrics.tokens_per_second || 48.5}
                      ttftMs={metrics.ttft_ms || 112.5}
                    />
                  </div>

                  {/* Bottom-Right: Zero-Trust Payload & Security Cleanliness */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                    <SecurityCleanlinessCard
                      incidentsCount={metrics.security_incidents_count || 2}
                      totalRequests={metrics.total_requests || 12481}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'traces' && (
            <TraceExplorer
              traces={traces}
              totalInBuffer={metrics.total_requests || traces.length}
              onSelectTrace={(tid) => setSelectedTraceId(tid)}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryView />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationView onSelectTrace={(tid) => setSelectedTraceId(tid)} />
          )}

          {activeTab === 'metrics' && (
            <MetricsView metrics={metrics} />
          )}

          {activeTab === 'security' && (
            <SecurityView onSelectTrace={(tid) => setSelectedTraceId(tid)} />
          )}

          {activeTab === 'chaos' && (
            <ChaosController onTraceGenerated={handleTraceGenerated} />
          )}

          {activeTab === 'governance' && (
            <GovernanceView metrics={metrics} />
          )}
        </div>
      </main>

      {/* Slide-over / Modal: Trace Waterfall Flamegraph Inspector */}
      {selectedTraceId && (
        <TraceWaterfallModal
          traceId={selectedTraceId}
          onClose={() => setSelectedTraceId(null)}
        />
      )}

      {/* Modal: Interactive Multi-Agent Runner */}
      <AgentRunnerModal
        isOpen={isRunnerOpen}
        onClose={() => setIsRunnerOpen(false)}
        onTraceGenerated={handleTraceGenerated}
        onRunningChange={setIsGenerating}
      />
    </div>
  );
}
