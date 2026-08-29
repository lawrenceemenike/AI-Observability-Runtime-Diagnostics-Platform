export type SpanKind = 'orchestrator' | 'agent' | 'llm' | 'tool' | 'retriever' | 'security';

export interface TelemetrySpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string | null;
  name: string;
  kind: SpanKind;
  start_time: string;
  end_time?: string | null;
  duration_ms: number;
  status: 'OK' | 'ERROR' | 'BLOCKED';
  error_message?: string | null;
  attributes: Record<string, any>;
}

export interface TraceRecord {
  trace_id: string;
  root_query: string;
  workflow_name: string;
  total_duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  counterfactual_savings_usd: number;
  spans: TelemetrySpan[];
  has_error: boolean;
  security_flagged: boolean;
  status: string;
  timestamp: string;
}

export interface RuntimeMetricsSnapshot {
  total_requests: number;
  success_rate: number;
  failure_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  ttft_ms: number;
  avg_tokens_per_req: number;
  tokens_per_second: number;
  total_tokens_processed: number;
  counterfactual_savings_usd: number;
  security_incidents_count: number;
  active_models: Record<string, number>;
  rag_retrieval_hit_rate: number;
  health_rate?: number;
  active_workers: number;
  runtime_status?: string;
  active_requests?: number;
  model_loaded?: string;
  endpoint_health?: string;
  daemon_endpoint?: string;
}

export interface ChaosExperimentConfig {
  target_node: string;
  fault_type: string;
  latency_ms: number;
  error_rate: number;
  enabled: boolean;
}

export interface AnomalyAnalysisResponse {
  trace_id: string;
  root_cause: string;
  affected_layer: string;
  recommended_remediation: string;
  confidence_score: number;
  raw_llm_response: string;
  duration_ms: number;
  analyzed_at: string;
}

export interface SecurityViolation {
  id: string;
  timestamp: string;
  trace_id: string;
  violation_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  score: number;
  snippet: string;
  action_taken: string;
  attack_vector?: string;
  mitigation_action?: string;
}

export interface SecurityPillarTelemetry {
  name: string;
  total_scanned?: number;
  intercepted?: number;
  clean_pass_rate_pct?: number;
  active_loops_bound?: number;
  max_context_tokens?: number;
  breaches?: number;
  redactions_count?: number;
  pii_masked?: string;
  baseline_entropy?: string;
  tool_guard_status?: string;
  tools_scoped?: string;
  unauthorized_actions?: number;
  display_text: string;
  status: string;
}

export interface SecurityTelemetrySnapshot {
  total_violations_blocked: number;
  llm01: SecurityPillarTelemetry;
  llm04: SecurityPillarTelemetry;
  llm06: SecurityPillarTelemetry;
  llm08: SecurityPillarTelemetry;
  violations: SecurityViolation[];
}

export interface TimeSeriesPoint {
  time: string;
  p95_latency_ms: number;
  tokens_per_sec: number;
  errors: number;
}

export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface TelemetryNotification {
  id: string;
  timestamp: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  trace_id?: string;
  read: boolean;
  category: 'security' | 'performance' | 'chaos' | 'system' | string;
}

export interface ChunkTelemetry {
  chunk_id: string;
  source_document: string;
  chunk_index: number;
  content: string;
  token_count: number;
  character_count: number;
  cosine_similarity: number;
  bm25_score?: number;
  initial_rank: number;
  reranked_rank: number;
  chunk_strategy: string;
  overlap_tokens: number;
  shannon_entropy: number;
  is_injection_clean: boolean;
}

export interface RetrievalSpanMetadata {
  query: string;
  top_k: number;
  retrieval_strategy: string;
  reranker_model?: string;
  total_chunks_evaluated: number;
  chunks_injected: ChunkTelemetry[];
  total_retrieved_tokens: number;
  retrieval_latency_ms: number;
}

export interface AgentMemoryFact {
  id: string;
  fact: string;
  source: string;
  source_agent?: string;
  category?: string;
  age: string;
  score: number;
  similarity_score?: number;
  token_count?: number;
  token_weight?: number;
  timestamp?: string;
  created_at?: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'CONFLICT_FLAGGED' | string;
  superseded_by?: string | null;
  was_cited_in_last_run: boolean;
  mutation_type: 'AUTONOMOUS_REFLECTION' | 'SYSTEM_INJECTION' | string;
}

export interface AgentMemoryAllocation {
  system_prompt_tokens: number;
  tool_scratchpad_tokens: number;
  turn_history_tokens: number;
  free_headroom_tokens: number;
}

export interface AgentMemoryTelemetry {
  working_memory_tokens: number;
  max_context_window: number;
  context_saturation_pct: number;
  evicted_turns_count: number;
  episodic_facts_count: number;
  avg_read_latency_ms: number;
  avg_write_latency_ms: number;
  memory_utilization_rate: number;
  active_conflicts_count: number;
  autonomous_reflections_count: number;
  allocation?: AgentMemoryAllocation;
  facts?: AgentMemoryFact[];
  recent_facts: AgentMemoryFact[];
}

export interface ToolCallEvaluation {
  tool_name: string;
  status: 'VALID' | 'REDUNDANT' | 'ERRORED' | 'UNNECESSARY' | string;
  duration_ms: number;
  reason: string;
}

export interface AgentTraceEvaluation {
  trace_id: string;
  trajectory_efficiency_score: number;
  total_steps_executed: number;
  optimal_steps_baseline: number;
  redundant_loops_detected: number;
  tool_precision_score: number;
  total_tools_called: number;
  successful_tool_calls: number;
  tool_evaluations: ToolCallEvaluation[];
  faithfulness_score: number;
  goal_completion_score: number;
  judge_reasoning: string;
  evaluation_duration_ms: number;
  evaluated_at?: string;
}

export interface EvaluationSummarySnapshot {
  average_trajectory_efficiency: number;
  average_tool_precision: number;
  average_faithfulness: number;
  average_goal_completion: number;
  total_evaluated_traces: number;
  passing_grade_rate: number;
}

export interface GovernanceModelInfo {
  name: string;
  display_name: string;
  size: string;
  params: string;
  quantization: string;
  context: string;
  vram_gb: number;
  tier: string;
  status: string;
  is_active: boolean;
}

export interface GovernanceComplianceCheck {
  framework: string;
  directive: string;
  enforcement: string;
  status: string;
  verified_at: string;
}

export interface GovernanceStatus {
  sla_compliance_rate: number;
  ttft_budget_ms: number;
  zero_egress_verified: boolean;
  egress_bytes_exfiltrated: number;
  span_propagation_rate: number;
  telemetry_overhead_ms: number;
  active_model: string;
  vram_allocated_gb: number;
  system_ram_pct: number;
  quantization_efficiency: string;
  context_saturation_free_tokens: number;
  max_context_tokens: number;
  available_models: GovernanceModelInfo[];
  compliance_ledger: GovernanceComplianceCheck[];
}
