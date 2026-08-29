import pytest
import uuid
from datetime import datetime
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.schemas import TelemetrySpan, TraceRecord, SpanKind

def test_ring_buffer_add_and_query():
    buffer = TelemetryRingBuffer(capacity=50, db_path="test_ring_buffer.db")
    trace_id = f"tr-ring-{uuid.uuid4().hex[:6]}"

    span1 = TelemetrySpan(
        trace_id=trace_id,
        span_id="sp-1",
        name="test.span.1",
        kind=SpanKind.TOOL,
        start_time=datetime.utcnow(),
        duration_ms=10.0,
        status="OK"
    )
    span2 = TelemetrySpan(
        trace_id=trace_id,
        span_id="sp-2",
        name="test.span.2",
        kind=SpanKind.LLM,
        start_time=datetime.utcnow(),
        duration_ms=25.0,
        status="OK",
        attributes={"gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 50, "gen_ai.usage.total_tokens": 150}
    )

    buffer.add_span(span1)
    buffer.add_span(span2)

    retrieved_spans = buffer.get_spans_for_trace(trace_id)
    assert len(retrieved_spans) == 2
    assert buffer.get_span("sp-1") is not None
    assert buffer.get_span("sp-2") is not None

def test_ring_buffer_eviction():
    # Capacity = 5 spans
    buffer = TelemetryRingBuffer(capacity=5, db_path="test_eviction.db")
    
    for i in range(10):
        span = TelemetrySpan(
            trace_id=f"tr-evict-{i}",
            span_id=f"sp-{i}",
            name=f"span.{i}",
            kind=SpanKind.AGENT,
            start_time=datetime.utcnow(),
            duration_ms=5.0
        )
        buffer.add_span(span)

    all_spans = buffer.get_all_spans()
    assert len(all_spans) == 5
    # Earliest spans (0-4) should have been evicted from ring buffer
    assert buffer.get_span("sp-0") is None
    assert buffer.get_span("sp-9") is not None
