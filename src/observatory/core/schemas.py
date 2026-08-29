from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class SpanKind(str, Enum):
    ORCHESTRATOR = "orchestrator"
    AGENT = "agent"
    LLM = "llm"
    TOOL = "tool"
    RETRIEVER = "retriever"
    SECURITY = "security"

class TelemetrySpan(BaseModel):
    trace_id: str = Field(..., description="Global unique trace identifier (UUIDv4/Hex)")
    span_id: str = Field(..., description="Unique span identifier")
    parent_span_id: Optional[str] = Field(None, description="Parent span identifier")
    name: str = Field(..., description="Span operation name (e.g. gemma.inference)")
    kind: SpanKind = Field(..., description="Categorical span kind")
    start_time: datetime = Field(..., description="UTC start timestamp")
    end_time: Optional[datetime] = Field(None, description="UTC completion timestamp")
    duration_ms: float = Field(0.0, description="Span execution duration in milliseconds")
    status: str = Field("OK", description="Execution status: OK, ERROR, BLOCKED")
    error_message: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Metadata tags, token counts & payload context")

class TraceRecord(BaseModel):
    trace_id: str
    root_query: str
    workflow_name: str
    total_duration_ms: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    counterfactual_savings_usd: float = 0.0
    spans: List[TelemetrySpan] = Field(default_factory=list)
    has_error: bool = False
    security_flagged: bool = False
    status: str = "COMPLETED"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChaosExperimentConfig(BaseModel):
    target_node: str = Field(..., description="Target node: retriever, calculator_tool, gemma_inference, market_agent, regulatory_agent")
    fault_type: str = Field(..., description="Fault type: latency_spike, http_500, malformed_payload, timeout")
    latency_ms: Optional[int] = Field(2000, description="Artificial delay in milliseconds")
    error_rate: float = Field(1.0, ge=0.0, le=1.0, description="Probability of failure")
    enabled: bool = True

class RuntimeMetricsSnapshot(BaseModel):
    total_requests: int = 0
    success_rate: float = 100.0
    failure_rate: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    ttft_ms: float = 0.0
    avg_tokens_per_req: float = 0.0
    tokens_per_second: float = 0.0
    total_tokens_processed: int = 0
    counterfactual_savings_usd: float = 0.0
    security_incidents_count: int = 0
    active_models: Dict[str, int] = Field(default_factory=dict)
    rag_retrieval_hit_rate: float = 95.0
    health_rate: float = 99.4
    active_workers: int = 1
    runtime_status: str = "ONLINE"
    active_requests: int = 0
    model_loaded: str = "gemma:2b"
    endpoint_health: str = "200 OK"
    daemon_endpoint: str = "Ollama Connected (127.0.0.1:11434)"

class SecurityViolation(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: str
    violation_type: str  # prompt_injection, entropy_secret, token_exhaustion, pii_leakage, excessive_agency
    severity: str = "CRITICAL"  # CRITICAL, WARNING, INFO
    score: float = 0.95
    snippet: str
    action_taken: str = "BLOCKED"  # BLOCKED, REDACTED, ALERTED
    attack_vector: str = "Ingress Prompt"  # Ingress Prompt, Indirect RAG Chunk, Agent Output
    mitigation_action: str = "Hard Block (HTTP 403)"  # Hard Block (HTTP 403), Sanitized & Scrubbed

class SecurityTelemetrySnapshot(BaseModel):
    total_violations_blocked: int
    llm01: Dict[str, Any]
    llm04: Dict[str, Any]
    llm06: Dict[str, Any]
    llm08: Dict[str, Any]
    violations: List[SecurityViolation]

class AnomalyAnalysisRequest(BaseModel):
    trace_id: str
    metric_anomaly: Optional[str] = None
    trigger_reason: Optional[str] = "P95 latency spike or tool HTTP 500 error"

class AnomalyAnalysisResponse(BaseModel):
    trace_id: str
    root_cause: str
    affected_layer: str
    recommended_remediation: str
    confidence_score: float
    raw_llm_response: str
    duration_ms: float
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)

class AgentExecutionRequest(BaseModel):
    query: str
    workflow_type: str = "enterprise_research"  # enterprise_research, quick_scan, compliance_check
    max_steps: int = 10
    temperature: float = 0.1

class AgentExecutionResponse(BaseModel):
    trace_id: str
    status: str
    final_synthesis: str
    total_duration_ms: float
    total_tokens: int
    steps_taken: int
    spans_count: int
    security_flagged: bool
    error_message: Optional[str] = None

class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"   # Security blocks, complete model drop
    WARNING = "WARNING"     # SLA latency breaches, retry spikes
    INFO = "INFO"           # Chaos experiment triggered, worker re-allocation

class TelemetryNotification(BaseModel):
    id: str = Field(..., description="Unique notification UUID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: IncidentSeverity
    title: str
    description: str
    trace_id: Optional[str] = None
    read: bool = False
    category: str  # "security", "performance", "chaos", "system"

class ChunkTelemetry(BaseModel):
    chunk_id: str = Field(..., description="Unique chunk hash/ID")
    source_document: str = Field(..., description="Origin file/table name (e.g., nist_ai_rmf.pdf)")
    chunk_index: int = Field(..., description="Zero-based sequence index in document")
    content: str = Field(..., description="Raw text payload of the chunk")
    token_count: int = Field(..., description="Token count of this specific chunk")
    character_count: int = Field(..., description="Character count")
    cosine_similarity: float = Field(..., description="Dense vector cosine similarity (0.0 - 1.0)")
    bm25_score: Optional[float] = Field(None, description="Sparse keyword score")
    initial_rank: int = Field(..., description="Rank before re-ranking")
    reranked_rank: int = Field(..., description="Rank after cross-encoder re-ranking")
    chunk_strategy: str = Field("recursive_character", description="Chunking algorithm used")
    overlap_tokens: int = Field(50, description="Token overlap with adjacent chunks")
    shannon_entropy: float = Field(..., description="Entropy calculation for secret detection")
    is_injection_clean: bool = Field(True, description="OWASP LLM01 scan status")

class RetrievalSpanMetadata(BaseModel):
    query: str
    top_k: int
    retrieval_strategy: str = "hybrid_dense_sparse"
    reranker_model: Optional[str] = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    total_chunks_evaluated: int = 10
    chunks_injected: List[ChunkTelemetry] = Field(default_factory=list)
    total_retrieved_tokens: int = 0
    retrieval_latency_ms: float = 0.0

class ToolCallEvaluation(BaseModel):
    tool_name: str
    status: str = Field(..., description="VALID, REDUNDANT, ERRORED, UNNECESSARY")
    duration_ms: float
    reason: str

class AgentTraceEvaluation(BaseModel):
    trace_id: str
    trajectory_efficiency_score: float = Field(..., ge=0.0, le=1.0)
    total_steps_executed: int
    optimal_steps_baseline: int = 9
    redundant_loops_detected: int = 0
    
    tool_precision_score: float = Field(..., ge=0.0, le=1.0)
    total_tools_called: int = 0
    successful_tool_calls: int = 0
    tool_evaluations: List[ToolCallEvaluation] = Field(default_factory=list)
    
    faithfulness_score: float = Field(..., ge=0.0, le=1.0)
    goal_completion_score: float = Field(..., ge=0.0, le=1.0)
    judge_reasoning: str
    evaluation_duration_ms: float = 0.0
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

class EvaluationSummarySnapshot(BaseModel):
    average_trajectory_efficiency: float
    average_tool_precision: float
    average_faithfulness: float
    average_goal_completion: float
    total_evaluated_traces: int
    passing_grade_rate: float

class EpisodicMemoryFact(BaseModel):
    id: str
    fact: str
    category: str = "knowledge"
    source: str = "regulatory_agent"
    source_agent: str = "regulatory_agent"
    score: float = 0.95
    similarity_score: float = 0.95
    token_count: int = 16
    token_weight: int = 16
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field("ACTIVE", description="ACTIVE, SUPERSEDED, or CONFLICT_FLAGGED")
    superseded_by: Optional[str] = None
    was_cited_in_last_run: bool = False
    mutation_type: str = Field("AUTONOMOUS_REFLECTION", description="AUTONOMOUS_REFLECTION or SYSTEM_INJECTION")
    age: Optional[str] = "just now"

class CognitiveMemoryTelemetry(BaseModel):
    # Mechanical storage metrics
    working_memory_tokens: int
    max_context_window: int
    context_saturation_pct: float
    evicted_turns_count: int
    episodic_facts_count: int
    avg_read_latency_ms: float
    avg_write_latency_ms: float
    
    # Cognitive dynamics metrics
    memory_utilization_rate: float = Field(..., description="% of injected memories cited in synthesis")
    active_conflicts_count: int = Field(..., description="Number of contradictory memory pairs detected")
    autonomous_reflections_count: int = Field(..., description="Count of agent-directed memory mutations")
    facts: List[EpisodicMemoryFact] = Field(default_factory=list)
    recent_facts: Optional[List[EpisodicMemoryFact]] = None
    allocation: Optional[Dict[str, int]] = None



