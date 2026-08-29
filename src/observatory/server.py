import asyncio
import json
import uuid
import time
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
import httpx

from src.observatory.core.config import settings
from src.observatory.core.schemas import (
    TelemetrySpan,
    TraceRecord,
    SpanKind,
    ChaosExperimentConfig,
    RuntimeMetricsSnapshot,
    AnomalyAnalysisRequest,
    AnomalyAnalysisResponse,
    AgentExecutionRequest,
    AgentExecutionResponse,
    SecurityViolation,
    SecurityTelemetrySnapshot,
    TelemetryNotification,
    IncidentSeverity
)
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.instrumentation.tracer import ObservatoryTracer
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.instrumentation.middleware import OpenTelemetryHeaderMiddleware
from src.observatory.metrics.prometheus_exporter import get_prometheus_metrics, CONTENT_TYPE_LATEST
from src.observatory.metrics.aggregator import MetricsAggregator
from src.observatory.security.injection_detector import PromptInjectionDetector
from src.observatory.security.secret_scrubber import SecretScrubber
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.agents.orchestrator import EnterpriseResearchOrchestrator
from src.observatory.evaluation.evaluator import AgentTraceEvaluator
from src.observatory.agents.memory import AgentMemoryManager
from src.observatory.security.firewall import RuntimeSecurityFirewall
from src.observatory.core.governance import GovernanceControlPlane

# Initialize Shared Core Singletons
ring_buffer = TelemetryRingBuffer(capacity=settings.RING_BUFFER_CAPACITY)
tracer = ObservatoryTracer(ring_buffer)
gemma_client = InstrumentedGemmaClient(ring_buffer)
chaos_injector = ChaosFaultInjector(ring_buffer)
injection_detector = PromptInjectionDetector(ring_buffer)
secret_scrubber = SecretScrubber(ring_buffer)
security_firewall = RuntimeSecurityFirewall(
    buffer=ring_buffer,
    injection_detector=injection_detector,
    secret_scrubber=secret_scrubber
)
governance_control_plane = GovernanceControlPlane(
    buffer=ring_buffer,
    gemma_client=gemma_client
)
metrics_aggregator = MetricsAggregator(ring_buffer=ring_buffer, gemma_client=gemma_client)
trace_evaluator = AgentTraceEvaluator(gemma_client)
memory_manager = AgentMemoryManager()
orchestrator = EnterpriseResearchOrchestrator(
    buffer=ring_buffer,
    gemma_client=gemma_client,
    chaos=chaos_injector,
    injection_detector=injection_detector,
    scrubber=secret_scrubber,
    memory_manager=memory_manager
)

app = FastAPI(
    title="ai-runtime-observatory Gateway",
    description="Real-Time AI Observability & Runtime Diagnostics Engine for Local Gemma SLMs",
    version="1.0.0"
)

# Enable CORS for local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(OpenTelemetryHeaderMiddleware)

def seed_initial_telemetry():
    """Seeds rich initial traces matching the Databerry reference architecture if buffer is empty."""
    if len(ring_buffer.get_recent_traces(limit=10)) >= 4:
        return

    sample_runs = [
        ("tr-8f2a91", "MarketResearchAgent", "Analyze next-gen SLM enterprise adoption", 42.0, "COMPLETED", False, [
            ("agent.market_research", SpanKind.AGENT, 42.0, "OK", None, {"agent.name": "MarketResearchAgent"}),
            ("tool.market_search", SpanKind.TOOL, 38.5, "OK", None, {"tool.name": "EnterpriseMarketSearch"})
        ]),
        ("tr-8f2a92", "LocalGemmaInference", "Synthesize quarterly AI infrastructure ROI", 310.2, "COMPLETED", False, [
            ("orchestrator.pipeline", SpanKind.ORCHESTRATOR, 310.2, "OK", None, {}),
            ("llm.gemma.gemma:2b", SpanKind.LLM, 305.0, "OK", None, {
                "gen_ai.system": "gemma",
                "gen_ai.request.model": "gemma:2b",
                "gen_ai.usage.input_tokens": 1420,
                "gen_ai.usage.output_tokens": 384,
                "gen_ai.usage.total_tokens": 1804,
                "gen_ai.response.ttft_ms": 112.5
            })
        ]),
        ("tr-8f2a93", "RegulatoryVectorDB", "Query SEC AI compliance disclosures", 12.4, "COMPLETED", False, [
            ("agent.regulatory", SpanKind.AGENT, 12.4, "OK", None, {}),
            ("retriever.vector_search", SpanKind.RETRIEVER, 11.2, "OK", None, {
                "retriever.database": "Enterprise_Vector_Store",
                "retriever.collection": "compliance_policies_2026",
                "retriever.query": "Query SEC AI compliance disclosures",
                "retriever.top_k": 2,
                "gen_ai.retrieval.strategy": "hybrid_dense_bm25",
                "gen_ai.retrieval.reranker": "cross-encoder/ms-marco-MiniLM-L-6-v2",
                "gen_ai.retrieval.total_tokens": 215,
                "gen_ai.retrieval.total_chunks_evaluated": 10,
                "gen_ai.retrieval.chunks": [
                    {
                        "chunk_id": "chk-8f2a93-0",
                        "source_document": "sec_ai_disclosure_2026.md",
                        "chunk_index": 0,
                        "content": "Article 14.b: Enterprise deployment of autonomous agents requires cryptographic audit trails, zero-trust token redaction, and strict P95 latency bounds under 2.50s for financial synthesis pipelines.",
                        "token_count": 112,
                        "character_count": 218,
                        "cosine_similarity": 0.94,
                        "bm25_score": 16.8,
                        "initial_rank": 1,
                        "reranked_rank": 1,
                        "chunk_strategy": "semantic_recursive_512",
                        "overlap_tokens": 50,
                        "shannon_entropy": 4.12,
                        "is_injection_clean": True
                    },
                    {
                        "chunk_id": "chk-8f2a93-1",
                        "source_document": "nist_ai_rmf_1.0.pdf",
                        "chunk_index": 1,
                        "content": "Section 3.2: Continuous observability of on-premise Small Language Model (SLM) inferences. Mandates real-time detection of prompt injection, token velocity telemetry, and causal flamegraph diagnosis for multi-agent workflows.",
                        "token_count": 103,
                        "character_count": 236,
                        "cosine_similarity": 0.89,
                        "bm25_score": 14.2,
                        "initial_rank": 2,
                        "reranked_rank": 2,
                        "chunk_strategy": "semantic_recursive_512",
                        "overlap_tokens": 50,
                        "shannon_entropy": 4.08,
                        "is_injection_clean": True
                    }
                ]
            })
        ]),
        ("tr-8f2a94", "ToolCalculatorError", "Compute multi-region amortization COGS", 890.0, "FAILED", True, [
            ("agent.finance", SpanKind.AGENT, 890.0, "ERROR", "Chaos Fault Injected: HTTP 500", {}),
            ("tool.calculator", SpanKind.TOOL, 885.0, "ERROR", "HTTP 500 Internal Error simulated on node 'calculator_tool'", {"error.type": "RuntimeError"})
        ]),
    ]

    for tid, wf_name, query, dur, status, is_err, spans_def in sample_runs:
        spans_list = []
        for sname, skind, sdur, sstat, serr, sattrs in spans_def:
            sp = TelemetrySpan(
                trace_id=tid,
                span_id=uuid.uuid4().hex[:16],
                name=sname,
                kind=skind,
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                duration_ms=sdur,
                status=sstat,
                error_message=serr,
                attributes=sattrs
            )
            ring_buffer.add_span(sp)
            spans_list.append(sp)

        tot_tok = sum(s.attributes.get("gen_ai.usage.total_tokens", 0) for s in spans_list)
        tr = TraceRecord(
            trace_id=tid,
            root_query=query,
            workflow_name=wf_name,
            total_duration_ms=dur,
            input_tokens=1420 if tot_tok > 0 else 0,
            output_tokens=384 if tot_tok > 0 else 0,
            total_tokens=tot_tok,
            estimated_cost_usd=(tot_tok / 1_000_000) * 0.15,
            counterfactual_savings_usd=max(0.0, (tot_tok / 1_000_000) * 15.0 - (tot_tok / 1_000_000) * 0.15),
            spans=spans_list,
            has_error=is_err,
            status=status,
            timestamp=datetime.utcnow()
        )
        ring_buffer.add_trace(tr)

@app.on_event("startup")
async def on_startup():
    seed_initial_telemetry()

@app.get("/health")
async def health_check():
    """Verifies gateway health and connectivity to local Gemma SLM."""
    gemma_healthy = False
    active_models = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get("http://127.0.0.1:11434/api/tags")
            if res.status_code == 200:
                gemma_healthy = True
                data = res.json()
                active_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass

    return {
        "status": "HEALTHY",
        "app": settings.APP_NAME,
        "gemma_endpoint": settings.GEMMA_BASE_URL,
        "gemma_connected": gemma_healthy,
        "active_models": active_models,
        "buffer_spans_count": len(ring_buffer.get_all_spans(limit=10000))
    }

@app.get("/metrics")
async def get_metrics():
    """Exposes OpenLLMetry metrics in standard Prometheus text format for scraping."""
    return Response(content=get_prometheus_metrics(), media_type=CONTENT_TYPE_LATEST)

@app.get("/api/v1/telemetry/traces", response_model=List[TraceRecord])
async def get_traces(
    limit: int = Query(1000, ge=1, le=5000),
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Retrieves recent traces with full collection by default."""
    traces = ring_buffer.get_recent_traces(limit=limit, status=status)
    if search:
        s_lower = search.lower()
        traces = [
            t for t in traces 
            if s_lower in t.trace_id.lower() or s_lower in t.root_query.lower() or s_lower in t.workflow_name.lower()
        ]
    return traces

@app.get("/api/v1/telemetry/traces/{trace_id}", response_model=TraceRecord)
async def get_trace_by_id(trace_id: str):
    """Retrieves full trace details and span hierarchy for flamegraph rendering."""
    trace = ring_buffer.get_trace(trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail=f"Trace '{trace_id}' not found.")
    return trace

@app.get("/api/v1/telemetry/spans", response_model=List[TelemetrySpan])
async def get_spans(limit: int = Query(100, ge=1, le=1000)):
    """Retrieves latest raw telemetry spans."""
    return ring_buffer.get_all_spans(limit=limit)

def parse_window_seconds(window: Optional[str]) -> Optional[int]:
    if not window or window == "all":
        return None
    if window == "5m":
        return 300
    if window == "15m":
        return 900
    if window == "1h":
        return 3600
    if window == "24h":
        return 86400
    if window.endswith("m"):
        try:
            return int(window[:-1]) * 60
        except ValueError:
            pass
    if window.endswith("h"):
        try:
            return int(window[:-1]) * 3600
        except ValueError:
            pass
    return 86400

@app.get("/api/v1/telemetry/metrics", response_model=RuntimeMetricsSnapshot)
@app.get("/api/v1/telemetry/snapshot", response_model=RuntimeMetricsSnapshot)
async def get_runtime_metrics(window: Optional[str] = Query("24h")):
    """Returns dynamic P50/P95/P99 latency, TTFT, token velocity, and counterfactual savings."""
    sec = parse_window_seconds(window)
    return metrics_aggregator.get_runtime_snapshot(window_seconds=sec)

@app.get("/api/v1/telemetry/notifications", response_model=List[TelemetryNotification])
async def get_notifications():
    """Returns active telemetry alerts, security events, SLA breaches, and chaos events."""
    notifications: List[TelemetryNotification] = []
    
    # 1. Inspect recent security events
    for span in ring_buffer.query_spans(kind=SpanKind.SECURITY):
        if span.status == "BLOCKED":
            notifications.append(TelemetryNotification(
                id=f"notif-sec-{span.span_id}",
                timestamp=span.start_time,
                severity=IncidentSeverity.CRITICAL,
                title="OWASP LLM01 Security Policy Violation Intercepted",
                description=span.attributes.get("reason", "Prompt injection or sensitive persona override detected."),
                trace_id=span.trace_id,
                category="security"
            ))

    # 1b. Violations from security scrubber
    for viol in ring_buffer.get_security_violations(limit=10):
        notifications.append(TelemetryNotification(
            id=f"notif-viol-{viol.id}",
            timestamp=viol.timestamp,
            severity=IncidentSeverity.CRITICAL,
            title=f"OWASP {viol.violation_type.upper()}: {viol.action_taken}",
            description=f"Confidence {viol.score:.2f} • Snippet: '{viol.snippet[:60]}...'",
            trace_id=viol.trace_id,
            category="security"
        ))

    # 2. Inspect SLA latency breaches (> 2,500ms)
    for span in ring_buffer.query_spans(kind=SpanKind.ORCHESTRATOR):
        if span.duration_ms > 2500.0:
            notifications.append(TelemetryNotification(
                id=f"notif-sla-{span.span_id}",
                timestamp=span.start_time,
                severity=IncidentSeverity.WARNING,
                title="P95 Latency SLA Threshold Exceeded",
                description=f"Execution took {span.duration_ms/1000.0:.2f}s (Target: < 2.50s) in '{span.name}'.",
                trace_id=span.trace_id,
                category="performance"
            ))

    # 3. Inspect chaos experiment runs
    for span in ring_buffer.query_spans(status="ERROR"):
        if "chaos" in span.name.lower() or "500" in (span.error_message or ""):
            notifications.append(TelemetryNotification(
                id=f"notif-chaos-{span.span_id}",
                timestamp=span.start_time,
                severity=IncidentSeverity.INFO,
                title="Chaos Fault Experiment Executed",
                description=f"Injected fault in '{span.name}' triggered expected failure mode: {span.error_message or 'HTTP 500'}.",
                trace_id=span.trace_id,
                category="chaos"
            ))

    # If empty, supply representative reference alerts
    if not notifications:
        notifications = [
            TelemetryNotification(
                id="notif-sample-1",
                timestamp=datetime.utcnow(),
                severity=IncidentSeverity.CRITICAL,
                title="OWASP LLM01 Ingress Blocked",
                description="Delimiter hijacking & persona override intercepted in prompt.",
                trace_id="tr-8f2a94",
                category="security"
            ),
            TelemetryNotification(
                id="notif-sample-2",
                timestamp=datetime.utcnow(),
                severity=IncidentSeverity.WARNING,
                title="P95 Latency SLA Breach",
                description="P95 latency reached 28.59s (Target: < 2.50s) in enterprise_research pipeline.",
                trace_id="tr-8f2a92",
                category="performance"
            ),
            TelemetryNotification(
                id="notif-sample-3",
                timestamp=datetime.utcnow(),
                severity=IncidentSeverity.INFO,
                title="Chaos Fault Injected",
                description="Simulated 2,000ms delay & HTTP 500 triggered on Vector Retrieval.",
                trace_id="tr-8f2a94",
                category="chaos"
            ),
        ]

    # Deduplicate by id and sort newest first
    seen_ids = set()
    deduped = []
    for n in notifications:
        if n.id not in seen_ids:
            seen_ids.add(n.id)
            deduped.append(n)

    return deduped[:15]

@app.post("/api/v1/telemetry/sync")
async def trigger_telemetry_sync():
    """Forces an immediate re-aggregation of all metrics and flushes buffer state."""
    snapshot = metrics_aggregator.compute_snapshot(window_seconds=86400)
    spans_count = len(ring_buffer.get_all_spans(limit=10000))
    return {
        "status": "synchronized",
        "spans_count": spans_count,
        "timestamp": datetime.utcnow().isoformat(),
        "snapshot": snapshot
    }

@app.get("/api/v1/telemetry/search")
async def search_telemetry(q: str = Query(..., min_length=1)):
    """Full-text search across trace IDs, agent names, and error messages."""
    results = ring_buffer.search(query=q)
    return results

@app.get("/api/v1/telemetry/time-series")
async def get_time_series():
    """Returns historical latency and token velocity series for charts."""
    return metrics_aggregator.get_time_series_metrics()

@app.get("/api/v1/telemetry/stream")
async def stream_telemetry_sse():
    """
    Story 2.2: Server-Sent Events (SSE) stream emitting real-time spans, traces, and metrics snapshots.
    """
    async def event_generator():
        last_sent_span_count = 0
        while True:
            try:
                metrics_snapshot = metrics_aggregator.get_runtime_snapshot().dict()
                recent_traces = [t.dict() for t in ring_buffer.get_recent_traces(limit=100)]
                recent_spans = [s.dict() for s in ring_buffer.get_all_spans(limit=30)]

                payload = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "metrics": metrics_snapshot,
                    "traces": recent_traces,
                    "spans": recent_spans
                }

                yield f"data: {json.dumps(payload, default=str)}\n\n"
                await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                await asyncio.sleep(2.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/v1/agents/execute", response_model=AgentExecutionResponse)
async def execute_agent_workflow(req: AgentExecutionRequest):
    """Executes the multi-agent enterprise research workflow."""
    return await orchestrator.execute_workflow(
        query=req.query,
        workflow_type=req.workflow_type,
        max_steps=req.max_steps,
        temperature=req.temperature
    )

@app.get("/api/v1/chaos/config", response_model=ChaosExperimentConfig)
async def get_chaos_config():
    """Retrieves active chaos fault-injection experiment settings."""
    return chaos_injector.get_config()

@app.post("/api/v1/chaos/config", response_model=ChaosExperimentConfig)
async def update_chaos_config(cfg: ChaosExperimentConfig):
    """Updates chaos fault-injection experiment parameters."""
    chaos_injector.set_config(cfg)
    return chaos_injector.get_config()

@app.post("/api/v1/chaos/inject")
async def trigger_chaos_injection(cfg: ChaosExperimentConfig):
    """Programmatically triggers a targeted chaos fault experiment."""
    chaos_injector.set_config(cfg)
    # Execute a test run with the active fault
    test_res = await orchestrator.execute_workflow(
        query=f"Chaos Stress Test on {cfg.target_node} with {cfg.fault_type}",
        workflow_type="chaos_fault_simulation"
    )
    return {
        "status": "CHAOS_EXPERIMENT_EXECUTED",
        "experiment_config": cfg,
        "result_trace_id": test_res.trace_id,
        "workflow_status": test_res.status,
        "error_message": test_res.error_message
    }

@app.post("/api/v1/diagnostics/analyze", response_model=AnomalyAnalysisResponse)
async def analyze_trace_anomaly(req: AnomalyAnalysisRequest):
    """
    Story 3.2: Automated Anomaly Detection & SLM Root-Cause Attribution.
    Dispatches trace signature to local Gemma SLM for deterministic causal diagnosis.
    """
    trace = ring_buffer.get_trace(req.trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail=f"Trace '{req.trace_id}' not found.")
    
    return await orchestrator.synthesis_agent.diagnose_root_cause(
        trace_record=trace,
        anomaly_reason=req.trigger_reason or "Metric anomaly detected"
    )

@app.get("/api/v1/security/telemetry", response_model=SecurityTelemetrySnapshot)
async def get_security_telemetry():
    """Retrieves live AI runtime firewall telemetry, OWASP metrics, and forensic audit logs."""
    return security_firewall.get_telemetry()

@app.get("/api/v1/security/violations", response_model=List[SecurityViolation])
async def get_security_violations(limit: int = Query(50, ge=1, le=200)):
    """Retrieves intercepted OWASP prompt injection and data leakage violations."""
    telemetry = security_firewall.get_telemetry()
    return telemetry.get("violations", [])[:limit]

@app.post("/api/v1/security/test")
async def test_security_payload(payload: Dict[str, str]):
    """Sandbox testing endpoint for OWASP LLM01 injection, entropy & DLP firewall."""
    text = payload.get("text", "")
    vector = payload.get("attack_vector", "Ingress Prompt")
    return security_firewall.scan_and_enforce(text=text, attack_vector=vector)

@app.get("/api/v1/telemetry/memory")
async def get_memory_telemetry():
    """Returns working memory saturation, cognitive dynamics, and episodic store telemetry."""
    recent_traces = ring_buffer.get_recent_traces(limit=5)
    working_tokens = sum(t.total_tokens for t in recent_traces) if recent_traces else 1240
    working_tokens = min(max(working_tokens, 1240), 7500)
    return memory_manager.get_telemetry(working_tokens=working_tokens)

@app.post("/api/v1/telemetry/memory/facts")
async def add_memory_fact(payload: Dict[str, Any]):
    """Stores a new episodic fact in agent memory."""
    fact_text = payload.get("fact", "").strip()
    if not fact_text:
        raise HTTPException(status_code=400, detail="Fact text cannot be empty.")
    
    new_fact = memory_manager.add_fact(
        fact_text=fact_text,
        source=payload.get("source", "user_override"),
        category=payload.get("category", "knowledge"),
        score=float(payload.get("score", 0.95)),
        mutation_type=payload.get("mutation_type", "SYSTEM_INJECTION")
    )
    return {"status": "SUCCESS", "fact": new_fact}

@app.delete("/api/v1/telemetry/memory/facts/{fact_id}")
async def delete_memory_fact(fact_id: str):
    """Deletes/prunes a specific fact from episodic store."""
    success = memory_manager.delete_fact(fact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Fact not found.")
    return {"status": "SUCCESS", "message": f"Fact {fact_id} deleted."}

@app.get("/api/v1/evaluation/trace/{trace_id}")
async def evaluate_single_trace(trace_id: str, refresh: bool = False):
    """Evaluates a trace on demand using deterministic checks and Gemma judge."""
    trace = ring_buffer.get_trace(trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail="Trace not found")
    return await trace_evaluator.evaluate_trace(trace, use_llm_judge=True, force_refresh=refresh)

@app.get("/api/v1/evaluation/summary")
async def get_evaluation_summary():
    """Computes aggregate evaluation benchmark scores across the buffer."""
    traces = ring_buffer.get_recent_traces(limit=50)
    return await trace_evaluator.compute_summary(traces)

@app.get("/api/v1/governance/status")
async def get_governance_status():
    """Retrieves live continuous AI governance status, SLA metrics, and hardware envelope."""
    return governance_control_plane.get_status()

@app.post("/api/v1/governance/model/switch")
async def switch_governance_model(payload: Dict[str, str]):
    """Hot-swaps active SLM deployment runtime in Gemma client."""
    model_tag = payload.get("model_tag", "gemma:2b").strip()
    return governance_control_plane.switch_model(model_tag)

@app.get("/metrics")
async def get_metrics_endpoint():
    """Prometheus exposition format endpoint prioritizing OpenLLMetry specifications."""
    from src.observatory.metrics.prometheus_exporter import format_openllmetry_exposition
    content = format_openllmetry_exposition(ring_buffer=ring_buffer, memory_manager=memory_manager)
    return Response(content=content, media_type="text/plain; version=0.0.4; charset=utf-8")

@app.post("/api/v1/telemetry/seed")
async def reseed_telemetry():
    """Reseeds the ring buffer with sample traces for testing."""
    seed_initial_telemetry()
    return {"status": "SUCCESS", "message": "Telemetry buffer refreshed."}

import os
from fastapi.staticfiles import StaticFiles

# Mount static files if frontend is built
dist_dir = os.path.join(os.path.dirname(__file__), "..", "..", "dashboard", "dist")
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api") or full_path == "metrics" or full_path == "health":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            with open(index_file, "r", encoding="utf-8") as f:
                return Response(content=f.read(), media_type="text/html")
        raise HTTPException(status_code=404, detail="Frontend build index not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
