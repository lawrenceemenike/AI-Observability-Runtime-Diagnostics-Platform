import { 
  RuntimeMetricsSnapshot, 
  TraceRecord, 
  TelemetrySpan, 
  ChaosExperimentConfig, 
  AnomalyAnalysisResponse, 
  SecurityViolation,
  SecurityTelemetrySnapshot,
  TimeSeriesPoint,
  TelemetryNotification
} from '../types/telemetry';

const API_BASE = '';

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchMetrics(window: string = '24h'): Promise<RuntimeMetricsSnapshot> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/metrics?window=${encodeURIComponent(window)}`);
  return res.json();
}

export async function syncTelemetry(): Promise<{ status: string; snapshot: RuntimeMetricsSnapshot; spans_count: number }> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/sync`, { method: 'POST' });
  return res.json();
}

export async function fetchNotifications(): Promise<TelemetryNotification[]> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/notifications`);
  return res.json();
}

export async function searchTelemetry(query: string): Promise<any[]> {
  if (!query || !query.trim()) return [];
  const res = await fetch(`${API_BASE}/api/v1/telemetry/search?q=${encodeURIComponent(query.trim())}`);
  return res.json();
}

export async function fetchTimeSeries(): Promise<{ series: TimeSeriesPoint[] }> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/time-series`);
  return res.json();
}

export async function fetchTraces(limit: number = 1000, search?: string): Promise<TraceRecord[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/api/v1/telemetry/traces?${params.toString()}`);
  return res.json();
}

export async function fetchTraceById(traceId: string): Promise<TraceRecord> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/traces/${traceId}`);
  if (!res.ok) throw new Error(`Trace ${traceId} not found`);
  return res.json();
}

export async function fetchChaosConfig(): Promise<ChaosExperimentConfig> {
  const res = await fetch(`${API_BASE}/api/v1/chaos/config`);
  return res.json();
}

export async function updateChaosConfig(cfg: ChaosExperimentConfig): Promise<ChaosExperimentConfig> {
  const res = await fetch(`${API_BASE}/api/v1/chaos/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  return res.json();
}

export async function injectChaosFault(cfg: ChaosExperimentConfig): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/chaos/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });
  return res.json();
}

export async function executeAgentWorkflow(query: string, workflow_type: string = 'enterprise_research'): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/agents/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, workflow_type }),
  });
  return res.json();
}

export async function analyzeTraceAnomaly(traceId: string, triggerReason?: string): Promise<AnomalyAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/diagnostics/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trace_id: traceId, trigger_reason: triggerReason }),
  });
  return res.json();
}

export async function fetchSecurityViolations(): Promise<SecurityViolation[]> {
  const res = await fetch(`${API_BASE}/api/v1/security/violations`);
  return res.json();
}

export async function fetchSecurityTelemetry(): Promise<SecurityTelemetrySnapshot> {
  const res = await fetch(`${API_BASE}/api/v1/security/telemetry`);
  return res.json();
}

export async function testSecurityPayload(text: string, attack_vector: string = 'Ingress Prompt'): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/security/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, attack_vector }),
  });
  return res.json();
}

export async function reseedTelemetry(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/seed`, { method: 'POST' });
  return res.json();
}

export function subscribeToTelemetryStream(
  onData: (data: { metrics: RuntimeMetricsSnapshot; traces: TraceRecord[]; spans: TelemetrySpan[] }) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/v1/telemetry/stream`);

  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.metrics && parsed.traces) {
        onData(parsed);
      }
    } catch (e) {
      console.error('SSE parse error:', e);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchMemoryTelemetry(): Promise<import('../types/telemetry').AgentMemoryTelemetry> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/memory`);
  return res.json();
}

export async function createMemoryFact(fact: string, source: string = 'user_override', category: string = 'knowledge'): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/memory/facts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fact, source, category })
  });
  return res.json();
}

export async function deleteMemoryFact(factId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/memory/facts/${encodeURIComponent(factId)}`, {
    method: 'DELETE'
  });
  return res.json();
}

export async function fetchTraceEvaluation(traceId: string, refresh: boolean = false): Promise<import('../types/telemetry').AgentTraceEvaluation> {
  const url = refresh 
    ? `${API_BASE}/api/v1/evaluation/trace/${encodeURIComponent(traceId)}?refresh=true`
    : `${API_BASE}/api/v1/evaluation/trace/${encodeURIComponent(traceId)}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchEvaluationSummary(): Promise<import('../types/telemetry').EvaluationSummarySnapshot> {
  const res = await fetch(`${API_BASE}/api/v1/evaluation/summary`);
  return res.json();
}

export async function fetchGovernanceStatus(): Promise<import('../types/telemetry').GovernanceStatus> {
  const res = await fetch(`${API_BASE}/api/v1/governance/status`);
  return res.json();
}

export async function switchGovernanceModel(modelTag: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/governance/model/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_tag: modelTag })
  });
  return res.json();
}


