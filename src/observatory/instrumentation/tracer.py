import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource

from src.observatory.core.schemas import TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer

# Initialize global OpenTelemetry Tracer Provider
resource = Resource.create({"service.name": "ai-runtime-observatory", "service.version": "1.0.0"})
provider = TracerProvider(resource=resource)
trace.set_tracer_provider(provider)
otel_tracer = trace.get_tracer("ai-runtime-observatory.tracer")

def generate_trace_id() -> str:
    return uuid.uuid4().hex

def generate_span_id() -> str:
    return uuid.uuid4().hex[:16]

class ObservatoryTracer:
    """Manages OpenTelemetry tracing, span propagation and ring-buffer ingestion."""

    def __init__(self, ring_buffer: TelemetryRingBuffer):
        self.ring_buffer = ring_buffer
        self.otel_tracer = otel_tracer

    def create_span(
        self,
        name: str,
        kind: SpanKind,
        trace_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ) -> TelemetrySpan:
        span_id = generate_span_id()
        return TelemetrySpan(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            name=name,
            kind=kind,
            start_time=datetime.utcnow(),
            status="OK",
            attributes=attributes or {}
        )

    def finish_span(
        self,
        span: TelemetrySpan,
        status: str = "OK",
        error_message: Optional[str] = None,
        additional_attributes: Optional[Dict[str, Any]] = None
    ) -> TelemetrySpan:
        span.end_time = datetime.utcnow()
        span.duration_ms = max(0.1, (span.end_time - span.start_time).total_seconds() * 1000.0)
        span.status = status
        span.error_message = error_message
        if additional_attributes:
            span.attributes.update(additional_attributes)
        
        self.ring_buffer.add_span(span)
        return span

    @asynccontextmanager
    async def span(
        self,
        name: str,
        kind: SpanKind,
        trace_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ):
        span = self.create_span(
            name=name,
            kind=kind,
            trace_id=trace_id,
            parent_span_id=parent_span_id,
            attributes=attributes
        )
        try:
            yield span
            self.finish_span(span, status=span.status, error_message=span.error_message)
        except Exception as e:
            self.finish_span(span, status="ERROR", error_message=str(e), additional_attributes={"error.type": type(e).__name__})
            raise e
