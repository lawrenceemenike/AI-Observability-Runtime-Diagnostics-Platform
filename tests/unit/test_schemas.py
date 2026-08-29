import pytest
from datetime import datetime
from src.observatory.core.schemas import (
    TelemetrySpan,
    TraceRecord,
    SpanKind,
    ChaosExperimentConfig,
    RuntimeMetricsSnapshot
)

def test_telemetry_span_validation():
    span = TelemetrySpan(
        trace_id="tr-test-001",
        span_id="sp-test-001",
        name="gemma.inference",
        kind=SpanKind.LLM,
        start_time=datetime.utcnow(),
        duration_ms=45.2,
        status="OK",
        attributes={"gen_ai.system": "gemma", "gen_ai.usage.total_tokens": 120}
    )
    assert span.trace_id == "tr-test-001"
    assert span.kind == SpanKind.LLM
    assert span.attributes["gen_ai.system"] == "gemma"
    assert span.duration_ms == 45.2

def test_trace_record_aggregation():
    span1 = TelemetrySpan(
        trace_id="tr-test-002",
        span_id="sp-01",
        name="agent.market",
        kind=SpanKind.AGENT,
        start_time=datetime.utcnow(),
        duration_ms=20.0
    )
    trace = TraceRecord(
        trace_id="tr-test-002",
        root_query="Enterprise AI market analysis",
        workflow_name="enterprise_research",
        total_duration_ms=250.0,
        input_tokens=1000,
        output_tokens=250,
        total_tokens=1250,
        spans=[span1]
    )
    assert len(trace.spans) == 1
    assert trace.total_tokens == 1250
    assert trace.has_error is False

def test_chaos_config_defaults():
    cfg = ChaosExperimentConfig(
        target_node="calculator_tool",
        fault_type="http_500",
        latency_ms=2000,
        error_rate=1.0,
        enabled=True
    )
    assert cfg.enabled is True
    assert cfg.fault_type == "http_500"
