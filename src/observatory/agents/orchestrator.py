import time
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from src.observatory.core.schemas import (
    TelemetrySpan,
    SpanKind,
    TraceRecord,
    AgentExecutionResponse
)
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.config import settings
from src.observatory.security.injection_detector import PromptInjectionDetector
from src.observatory.security.secret_scrubber import SecretScrubber
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.agents.research_agent import MarketResearchAgent
from src.observatory.agents.finance_agent import FinancialAgent
from src.observatory.agents.regulatory_agent import RegulatoryComplianceAgent
from src.observatory.agents.synthesis_agent import SynthesisAgent
from src.observatory.metrics.prometheus_exporter import (
    AGENT_EXECUTION_DURATION_SECONDS,
    ACTIVE_WORKERS_GAUGE
)

class EnterpriseResearchOrchestrator:
    """Coordinates multi-agent research pipelines with zero-trust security & 100% trace propagation."""

    def __init__(
        self,
        buffer: TelemetryRingBuffer,
        gemma_client: InstrumentedGemmaClient,
        chaos: ChaosFaultInjector,
        injection_detector: PromptInjectionDetector,
        scrubber: SecretScrubber,
        memory_manager=None
    ):
        self.buffer = buffer
        self.gemma = gemma_client
        self.chaos = chaos
        self.detector = injection_detector
        self.scrubber = scrubber
        self.memory_manager = memory_manager

        self.market_agent = MarketResearchAgent(buffer, chaos)
        self.finance_agent = FinancialAgent(buffer, chaos)
        self.regulatory_agent = RegulatoryComplianceAgent(buffer, chaos)
        self.synthesis_agent = SynthesisAgent(buffer, gemma_client, chaos, scrubber)

    async def execute_workflow(
        self,
        query: str,
        workflow_type: str = "enterprise_research",
        max_steps: int = 10,
        temperature: float = 0.1
    ) -> AgentExecutionResponse:
        trace_id = f"tr-{uuid.uuid4().hex[:8]}"
        root_span_id = uuid.uuid4().hex[:16]
        start_time = datetime.utcnow()
        t0 = time.perf_counter()

        ACTIVE_WORKERS_GAUGE.inc()

        # 1. OWASP LLM01: Prompt Injection Guard
        is_threat, risk_score, threat_reason = self.detector.analyze(query, trace_id)
        if is_threat:
            ACTIVE_WORKERS_GAUGE.dec()
            duration_ms = (time.perf_counter() - t0) * 1000.0
            
            trace_record = TraceRecord(
                trace_id=trace_id,
                root_query=query,
                workflow_name=workflow_type,
                total_duration_ms=duration_ms,
                status="BLOCKED",
                has_error=True,
                security_flagged=True
            )
            self.buffer.add_trace(trace_record)

            return AgentExecutionResponse(
                trace_id=trace_id,
                status="BLOCKED",
                final_synthesis=f"Security Policy Violation: Prompt injection blocked ({threat_reason}).",
                total_duration_ms=duration_ms,
                total_tokens=0,
                steps_taken=1,
                spans_count=len(self.buffer.get_spans_for_trace(trace_id)),
                security_flagged=True,
                error_message=f"Threat Detected: {threat_reason}"
            )

        # 2. Initialize Root Orchestrator Span
        root_span = TelemetrySpan(
            trace_id=trace_id,
            span_id=root_span_id,
            parent_span_id=None,
            name="orchestrator.enterprise_research_pipeline",
            kind=SpanKind.ORCHESTRATOR,
            start_time=start_time,
            status="OK",
            attributes={
                "orchestrator.workflow": workflow_type,
                "orchestrator.query": query,
                "orchestrator.max_steps": max_steps
            }
        )

        trace_record = TraceRecord(
            trace_id=trace_id,
            root_query=query,
            workflow_name=workflow_type,
            status="RUNNING"
        )
        self.buffer.add_trace(trace_record)

        has_error = False
        error_msg = None
        market_res = {}
        finance_res = {}
        regulatory_res = []
        final_text = ""
        steps_count = 0

        try:
            # 3. Sub-Agent 1: Market Research
            steps_count += 1
            market_res = await self.market_agent.execute(query, trace_id, root_span_id)

            # 4. Sub-Agent 2: Financial Calculation
            steps_count += 1
            finance_res = await self.finance_agent.execute(query, trace_id, root_span_id)

            # 5. Sub-Agent 3: Regulatory Compliance RAG
            steps_count += 1
            regulatory_res = await self.regulatory_agent.execute(query, trace_id, root_span_id)

            # 6. Sub-Agent 4: Gemma SLM Synthesis
            steps_count += 1
            synthesis_res = await self.synthesis_agent.synthesize(
                query=query,
                market_data=market_res.get("data", {}),
                financial_data=finance_res.get("data", {}),
                regulatory_data=regulatory_res.get("data", []),
                trace_id=trace_id,
                parent_span_id=root_span_id
            )
            final_text = synthesis_res.get("content", "")

            # 7. Cognitive Memory Attribution & Reflection
            if self.memory_manager and final_text:
                self.memory_manager.evaluate_memory_attribution(
                    self.memory_manager.long_term_store,
                    final_text
                )

        except Exception as e:
            has_error = True
            error_msg = str(e)
            final_text = f"Workflow partially interrupted by runtime exception: {str(e)}"
            root_span.status = "ERROR"
            root_span.error_message = error_msg
            root_span.attributes["error.type"] = type(e).__name__

        finally:
            ACTIVE_WORKERS_GAUGE.dec()

        # Finalize Root Span & Trace Record
        duration_ms = (time.perf_counter() - t0) * 1000.0
        root_span.end_time = datetime.utcnow()
        root_span.duration_ms = duration_ms
        self.buffer.add_span(root_span)

        all_spans = self.buffer.get_spans_for_trace(trace_id)
        total_tokens = sum(s.attributes.get("gen_ai.usage.total_tokens", 0) for s in all_spans)
        
        trace_record.total_duration_ms = duration_ms
        trace_record.status = "FAILED" if has_error else "COMPLETED"
        trace_record.has_error = has_error
        trace_record.total_tokens = total_tokens
        trace_record.spans = all_spans
        
        # Counterfactual Economics
        trace_record.estimated_cost_usd = (total_tokens / 1_000_000) * settings.LOCAL_COGS_PER_1M_TOKENS
        cloud_cost = (total_tokens / 1_000_000) * settings.COUNTERFACTUAL_CLOUD_COST_PER_1M_TOKENS
        trace_record.counterfactual_savings_usd = max(0.0, cloud_cost - trace_record.estimated_cost_usd)
        
        self.buffer.add_trace(trace_record)

        AGENT_EXECUTION_DURATION_SECONDS.labels(
            agent_name="EnterpriseOrchestrator",
            status="error" if has_error else "success"
        ).observe(duration_ms / 1000.0)

        return AgentExecutionResponse(
            trace_id=trace_id,
            status="FAILED" if has_error else "COMPLETED",
            final_synthesis=final_text,
            total_duration_ms=duration_ms,
            total_tokens=total_tokens,
            steps_taken=steps_count,
            spans_count=len(all_spans),
            security_flagged=trace_record.security_flagged,
            error_message=error_msg
        )
