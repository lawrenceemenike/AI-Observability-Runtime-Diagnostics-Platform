import pytest
import asyncio
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.schemas import SpanKind
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.security.injection_detector import PromptInjectionDetector
from src.observatory.security.secret_scrubber import SecretScrubber
from src.observatory.agents.orchestrator import EnterpriseResearchOrchestrator

@pytest.mark.asyncio
async def test_full_multi_agent_pipeline_execution():
    """Validates complete multi-agent workflow with trace propagation and child span hierarchy."""
    buffer = TelemetryRingBuffer(capacity=500, db_path="test_agent_pipe.db")
    gemma = InstrumentedGemmaClient(buffer)
    chaos = ChaosFaultInjector(buffer)
    detector = PromptInjectionDetector(buffer)
    scrubber = SecretScrubber(buffer)

    orch = EnterpriseResearchOrchestrator(
        buffer=buffer,
        gemma_client=gemma,
        chaos=chaos,
        injection_detector=detector,
        scrubber=scrubber
    )

    query = "Analyze market viability and regulatory compliance for on-premise Gemma SLM deployment"
    res = await orch.execute_workflow(query=query)

    assert res.status == "COMPLETED"
    assert res.total_duration_ms > 0
    assert res.spans_count >= 5  # Root orchestrator, Market, Tool, Finance, Calculator, Regulatory, Retriever, Synthesis, LLM

    spans = buffer.get_spans_for_trace(res.trace_id)
    kinds = [s.kind for s in spans]
    assert SpanKind.ORCHESTRATOR in kinds
    assert SpanKind.AGENT in kinds
    assert SpanKind.TOOL in kinds
    assert SpanKind.RETRIEVER in kinds
    assert SpanKind.LLM in kinds
