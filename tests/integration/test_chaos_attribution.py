import pytest
import asyncio
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.schemas import ChaosExperimentConfig, AnomalyAnalysisRequest
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.security.injection_detector import PromptInjectionDetector
from src.observatory.security.secret_scrubber import SecretScrubber
from src.observatory.agents.orchestrator import EnterpriseResearchOrchestrator

@pytest.mark.asyncio
async def test_chaos_fault_injection_and_gemma_causal_attribution():
    """Validates chaos fault injection and automated Gemma SLM root cause diagnosis."""
    buffer = TelemetryRingBuffer(capacity=500, db_path="test_chaos.db")
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

    # 1. Enable Chaos on calculator_tool (HTTP 500 error)
    chaos.set_config(ChaosExperimentConfig(
        target_node="calculator_tool",
        fault_type="http_500",
        latency_ms=100,
        error_rate=1.0,
        enabled=True
    ))

    # 2. Execute workflow under fault condition
    res = await orch.execute_workflow(query="Evaluate compute budget with chaos active")
    assert res.status == "FAILED"
    assert "Chaos Fault Injected" in (res.error_message or "")

    # 3. Retrieve trace from ring buffer
    trace = buffer.get_trace(res.trace_id)
    assert trace is not None
    assert trace.has_error is True

    # 4. Trigger automated Gemma root cause attribution
    diagnosis = await orch.synthesis_agent.diagnose_root_cause(
        trace_record=trace,
        anomaly_reason="Chaos fault injection simulated on calculator node"
    )

    assert diagnosis.trace_id == res.trace_id
    assert "calculator" in diagnosis.root_cause.lower() or "tool" in diagnosis.affected_layer.lower()
    assert len(diagnosis.recommended_remediation) > 5
    assert diagnosis.confidence_score >= 0.8
