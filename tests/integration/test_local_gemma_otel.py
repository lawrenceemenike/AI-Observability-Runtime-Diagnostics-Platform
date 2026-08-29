import pytest
import asyncio
import uuid
import os
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.instrumentation.gemma_client import InstrumentedGemmaClient
from src.observatory.metrics.prometheus_exporter import get_prometheus_metrics

@pytest.mark.asyncio
async def test_real_local_gemma_otel_span_generation():
    """Zero-mock verification test against real local Gemma SLM running on Ollama."""
    db_file = f"test_live_gemma_{uuid.uuid4().hex[:6]}.db"
    buffer = TelemetryRingBuffer(capacity=100, db_path=db_file)
    client = InstrumentedGemmaClient(buffer=buffer)
    
    # 2. Dispatch real prompt to local Gemma
    test_trace_id = f"test-trace-{uuid.uuid4().hex[:8]}"
    prompt = "Explain why distributed tracing is necessary for multi-agent LLM systems in one sentence."
    
    result = await client.generate(
        prompt=prompt,
        trace_id=test_trace_id,
        temperature=0.0,
        max_tokens=64
    )
    
    # 3. Assert real model completion
    assert len(result["content"]) > 5
    assert result["tokens"] > 0
    assert result["duration_ms"] > 0.0
    
    # 4. Assert OTel span registration in memory buffer
    spans = buffer.get_spans_for_trace(test_trace_id)
    assert len(spans) == 1
    span = spans[0]
    
    assert span.name.startswith("llm.gemma")
    assert span.status == "OK"
    assert span.attributes["gen_ai.system"] == "gemma"
    assert span.attributes["gen_ai.usage.total_tokens"] == result["tokens"]
    
    # 5. Assert Prometheus exposition format contains the metric
    metrics_text = get_prometheus_metrics().decode("utf-8")
    assert "ai_llm_inference_duration_seconds" in metrics_text
    
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
