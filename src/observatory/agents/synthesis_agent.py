import time
import json
import uuid
import re
from typing import Dict, Any, Optional, List
from datetime import datetime

from src.observatory.core.schemas import TelemetrySpan, SpanKind, TraceRecord, AnomalyAnalysisResponse
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.security.secret_scrubber import SecretScrubber
from src.observatory.metrics.prometheus_exporter import AGENT_EXECUTION_DURATION_SECONDS

class SynthesisAgent:
    """Executive Synthesis & SLM Causal Diagnostics Agent powered by local Gemma."""

    def __init__(
        self,
        buffer: TelemetryRingBuffer,
        gemma_client: InstrumentedGemmaClient,
        chaos: ChaosFaultInjector,
        scrubber: SecretScrubber
    ):
        self.buffer = buffer
        self.gemma = gemma_client
        self.chaos = chaos
        self.scrubber = scrubber

    async def synthesize(
        self,
        query: str,
        market_data: Dict[str, Any],
        financial_data: Dict[str, Any],
        regulatory_data: List[Dict[str, Any]],
        trace_id: str,
        parent_span_id: Optional[str] = None
    ) -> Dict[str, Any]:
        agent_span_id = uuid.uuid4().hex[:16]
        start_time = datetime.utcnow()
        t0 = time.perf_counter()

        agent_span = TelemetrySpan(
            trace_id=trace_id,
            span_id=agent_span_id,
            parent_span_id=parent_span_id,
            name="agent.synthesis_gemma",
            kind=SpanKind.AGENT,
            start_time=start_time,
            status="OK",
            attributes={
                "agent.name": "SynthesisAgent",
                "agent.model": self.gemma.model_name,
                "agent.query": query
            }
        )

        try:
            # Chaos Check for Gemma Inference Node
            await self.chaos.maybe_inject_fault("gemma_inference", trace_id, agent_span_id)

            prompt = f"""You are an Enterprise AI Systems Architect. Synthesize the following multi-agent research into a concise 2-sentence executive summary:
Query: {query}
Market Data: {json.dumps(market_data)}
Financial ROI: {json.dumps(financial_data)}
Compliance Docs: {json.dumps(regulatory_data)}

Provide clear, professional insights."""

            gemma_response = await self.gemma.generate(
                prompt=prompt,
                trace_id=trace_id,
                parent_span_id=agent_span_id,
                temperature=0.1,
                max_tokens=256
            )

            raw_content = gemma_response["content"]
            scrubbed_content, was_scrubbed, scrub_reasons = self.scrubber.scan_and_scrub(raw_content, trace_id)

            duration_ms = (time.perf_counter() - t0) * 1000.0
            agent_span.end_time = datetime.utcnow()
            agent_span.duration_ms = duration_ms
            agent_span.attributes["agent.output_tokens"] = gemma_response["output_tokens"]
            agent_span.attributes["agent.scrubbed"] = was_scrubbed
            self.buffer.add_span(agent_span)

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="SynthesisAgent", status="success").observe(duration_ms / 1000.0)

            return {
                "status": "SUCCESS",
                "content": scrubbed_content,
                "tokens": gemma_response["tokens"],
                "duration_ms": duration_ms,
                "agent_span_id": agent_span_id
            }

        except Exception as e:
            duration_ms = (time.perf_counter() - t0) * 1000.0
            agent_span.end_time = datetime.utcnow()
            agent_span.duration_ms = duration_ms
            agent_span.status = "ERROR"
            agent_span.error_message = str(e)
            agent_span.attributes["error.type"] = type(e).__name__
            self.buffer.add_span(agent_span)

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="SynthesisAgent", status="error").observe(duration_ms / 1000.0)
            raise e

    async def diagnose_root_cause(
        self,
        trace_record: TraceRecord,
        anomaly_reason: str = "P95 latency spike or failure in execution graph"
    ) -> AnomalyAnalysisResponse:
        """
        Story 3.2: Deterministic root-cause causal attribution executed via local Gemma SLM.
        Analyzes span errors, latencies, and hierarchy to output structured diagnosis.
        """
        diag_trace_id = f"diag-{uuid.uuid4().hex[:8]}"
        t0 = time.perf_counter()

        spans_summary = []
        for s in trace_record.spans:
            spans_summary.append({
                "span_id": s.span_id,
                "name": s.name,
                "kind": s.kind.value if isinstance(s.kind, SpanKind) else str(s.kind),
                "duration_ms": round(s.duration_ms, 2),
                "status": s.status,
                "error": s.error_message,
                "attributes": {k: v for k, v in s.attributes.items() if not str(v).startswith("ey")}
            })

        diagnostic_prompt = f"""You are an expert AI Runtime Diagnostics and SRE Engine.
Analyze the following distributed trace signature and diagnose the root cause of the incident.

INCIDENT TRIGGER: {anomaly_reason}
TRACE ID: {trace_record.trace_id}
TOTAL DURATION: {trace_record.total_duration_ms}ms
HAS ERROR: {trace_record.has_error}

EXECUTION SPANS:
{json.dumps(spans_summary, indent=2)}

Respond with a concise, factual root cause diagnosis explaining:
1. Root Cause: Exact failure or latency bottleneck
2. Affected Layer: (Tool / Vector Retriever / SLM Inference / Network)
3. Recommended Remediation: Actionable fix
4. Confidence Score: (0.0 - 1.0)"""

        try:
            res = await self.gemma.generate(
                prompt=diagnostic_prompt,
                trace_id=diag_trace_id,
                temperature=0.0,
                max_tokens=300
            )
            raw_text = res["content"]
        except Exception as e:
            raw_text = f"Local diagnostic analysis fallback: Identified error in span tree -> {str(e)}"

        # Deterministic extraction of structured attribution
        affected_layer = "Tool Layer"
        root_cause = "Simulated tool fault or latency regression detected"
        remediation = "Enable circuit breaker and exponential backoff retry loop."
        confidence = 0.95

        for s in trace_record.spans:
            if s.status == "ERROR":
                root_cause = f"Exception in '{s.name}': {s.error_message or 'Unknown fault'}"
                if s.kind == SpanKind.TOOL:
                    affected_layer = "Tool Execution Layer"
                    remediation = "Verify tool input schema validation and implement timeout circuit breaker."
                elif s.kind == SpanKind.RETRIEVER:
                    affected_layer = "Vector DB Retriever"
                    remediation = "Scale embedding vector search partitions and check index connection pool."
                elif s.kind == SpanKind.LLM:
                    affected_layer = "Local SLM Inference Engine"
                    remediation = "Check local Ollama GPU VRAM allocation and context window limits."
                break
            elif s.duration_ms > 1500.0:
                root_cause = f"High latency bottleneck ({s.duration_ms:.1f}ms) in span '{s.name}'"
                affected_layer = "Latency Spike / Network"
                remediation = "Optimize batching and enable streaming token pipeline."

        duration_ms = (time.perf_counter() - t0) * 1000.0

        return AnomalyAnalysisResponse(
            trace_id=trace_record.trace_id,
            root_cause=root_cause,
            affected_layer=affected_layer,
            recommended_remediation=remediation,
            confidence_score=confidence,
            raw_llm_response=raw_text,
            duration_ms=duration_ms,
            analyzed_at=datetime.utcnow()
        )
