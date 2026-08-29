import time
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from src.observatory.core.schemas import TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.chaos.fault_injector import ChaosFaultInjector
from src.observatory.metrics.prometheus_exporter import AGENT_EXECUTION_DURATION_SECONDS

class FinancialAgent:
    """Financial & COGS Calculation Agent with calculator tool child spans."""

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
            name="agent.financial_analysis",
            kind=SpanKind.AGENT,
            start_time=start_time,
            status="OK",
            attributes={
                "agent.name": "FinancialAgent",
                "agent.role": "COGS Modeling & ROI Calculus",
                "agent.query": query
            }
        )

        try:
            # 1. Tool Child Span: Ledger & Math Calculator
            tool_span_id = uuid.uuid4().hex[:16]
            tool_start = datetime.utcnow()
            t_tool_0 = time.perf_counter()

            # Chaos Check
            await self.chaos.maybe_inject_fault("calculator_tool", trace_id, agent_span_id)
            await asyncio.sleep(0.018)  # 18ms calculator tool execution

            financial_data = {
                "projected_monthly_tokens": 100_000_000,
                "commercial_api_cost_usd": 1500.0,
                "local_slm_cogs_usd": 15.0,
                "net_annual_savings_usd": 17820.0,
                "roi_percentage": "98.9%"
            }

            tool_duration_ms = (time.perf_counter() - t_tool_0) * 1000.0
            tool_span = TelemetrySpan(
                trace_id=trace_id,
                span_id=tool_span_id,
                parent_span_id=agent_span_id,
                name="tool.calculator",
                kind=SpanKind.TOOL,
                start_time=tool_start,
                end_time=datetime.utcnow(),
                duration_ms=tool_duration_ms,
                status="OK",
                attributes={
                    "tool.name": "COGS_ROI_Calculator",
                    "tool.calculation": "Commercial Cloud vs Local Gemma Amortization",
                    "tool.savings_factor": 100.0
                }
            )
            self.buffer.add_span(tool_span)

            duration_ms = (time.perf_counter() - t0) * 1000.0
            agent_span.end_time = datetime.utcnow()
            agent_span.duration_ms = duration_ms
            agent_span.attributes["agent.output_summary"] = f"Calculated savings: ${financial_data['net_annual_savings_usd']}"
            self.buffer.add_span(agent_span)

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="FinancialAgent", status="success").observe(duration_ms / 1000.0)

            return {
                "status": "SUCCESS",
                "data": financial_data,
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

            AGENT_EXECUTION_DURATION_SECONDS.labels(agent_name="FinancialAgent", status="error").observe(duration_ms / 1000.0)
            raise e
