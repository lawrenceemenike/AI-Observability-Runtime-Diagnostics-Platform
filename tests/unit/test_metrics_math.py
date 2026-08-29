import pytest
from datetime import datetime
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.schemas import TraceRecord, TelemetrySpan, SpanKind
from src.observatory.metrics.aggregator import MetricsAggregator

def test_metrics_percentile_calculations():
    buffer = TelemetryRingBuffer(capacity=100, db_path="test_metrics.db")
    aggregator = MetricsAggregator(buffer)

    # Add 10 traces with known latencies: 100, 200, 300, ... 1000 ms
    for i in range(1, 11):
        dur = float(i * 100)
        tr = TraceRecord(
            trace_id=f"tr-metric-{i}",
            root_query="Test query",
            workflow_name="test_wf",
            total_duration_ms=dur,
            total_tokens=100,
            status="COMPLETED",
            timestamp=datetime.utcnow()
        )
        buffer.add_trace(tr)

    snapshot = aggregator.get_runtime_snapshot()
    assert snapshot.total_requests == 10
    assert snapshot.p50_latency_ms == 550.0
    assert snapshot.p95_latency_ms > 900.0
    assert snapshot.success_rate == 100.0
    assert snapshot.failure_rate == 0.0
