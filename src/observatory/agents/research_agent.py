import time
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from src.observatory.core.schemas import TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.metrics.prometheus_exporter import AGENT_EXECUTION_DURATION_SECONDS

class MarketResearchAgent:
    """Enterprise Market Research Agent instrumented with OTel child spans."""

    def __init__(self, buffer: TelemetryRingBuffer, chaos: ChaosFaultInjector):
        self.buffer = buffer
        self.chaos = chaos

    async def execute(
        self,
        query: str,
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
            name="agent.market_research",
            kind=SpanKind.AGENT,
            start_time=start_time,
            status="OK",
            attributes={
                "agent.name": "MarketResearchAgent",
                "agent.role": "Market Trends & Competitive Intelligence",
                "agent.query": query
            }
        )

        try:
            # 1. Execute Search Tool Sub-Span
            tool_span_id = uuid.uuid4().hex[:16]
            tool_start = datetime.utcnow()
            t_tool_0 = time.perf_counter()

            # Chaos Check
            await self.chaos.maybe_inject_fault("market_search_tool", trace_id, agent_span_id)
            await asyncio.sleep(0.045)  # Realistic 45ms tool execution latency

            market_data = {
                "sector": "Enterprise AI & Diagnostics",
                "growth_cagr": "34.2%",
                "key_trends": [
                    "Shift towards on-premise Small Language Models (Gemma 2B/7B)",
                    "Zero-trust OpenTelemetry runtime governance",
                    "Real-time causal anomaly detection in distributed agent graphs"
                ],
                "sentiment": "Strongly Bullish"
            }

            tool_duration_ms = (time.perf_counter() - t_tool_0) * 1000.0
            tool_span = TelemetrySpan(
                trace_id=trace_id,
                span_id=tool_span_id,
                parent_span_id=agent_span_id,
                name="tool.market_search",
                kind=SpanKind.TOOL,
                start_time=tool_start,
                end_time=datetime.utcnow(),
                duration_ms=tool_duration_ms,
                status="OK",
                attributes={
                    "tool.name": "EnterpriseMarketSearch",
                    "tool.input": query,
                    "tool.results_count": 3
                }
            )
            self.buffer.add_span(tool_span)

            duration_ms = (time.perf_counter() - t0) * 1000.0
            agent_span.end_time = datetime.utcnow()
            agent_span.duration_ms = duration_ms
            agent_span.attributes["agent.output_summary"] = f"Analyzed sector: {market_data['sector']}"
            self.buffer.add_span(agent_span)

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="MarketAgent", status="success").observe(duration_ms / 1000.0)

            return {
                "status": "SUCCESS",
                "data": market_data,
                "agent_span_id": agent_span_id,
                "duration_ms": duration_ms
            }

        except Exception as e:
            duration_ms = (time.perf_counter() - t0) * 1000.0
            agent_span.end_time = datetime.utcnow()
            agent_span.duration_ms = duration_ms
            agent_span.status = "ERROR"
            agent_span.error_message = str(e)
            agent_span.attributes["error.type"] = type(e).__name__
            self.buffer.add_span(agent_span)

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="MarketAgent", status="error").observe(duration_ms / 1000.0)
            raise e
