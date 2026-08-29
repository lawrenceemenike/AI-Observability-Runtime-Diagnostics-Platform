import asyncio
import random
import uuid
from typing import Optional, Dict, Any
from datetime import datetime

from src.observatory.core.schemas import ChaosExperimentConfig, TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer

class ChaosFaultInjector:
    """Programmatic failure and latency injection engine across vector, tool and LLM layers."""

    def __init__(self, ring_buffer: TelemetryRingBuffer):
        self.ring_buffer = ring_buffer
        self.active_config = ChaosExperimentConfig(
            target_node="calculator_tool",
            fault_type="http_500",
            latency_ms=2000,
            error_rate=1.0,
            enabled=False
        )

    def set_config(self, config: ChaosExperimentConfig):
        self.active_config = config

    def get_config(self) -> ChaosExperimentConfig:
        return self.active_config

    async def maybe_inject_fault(
        self,
        node_name: str,
        trace_id: str,
        parent_span_id: Optional[str] = None
    ) -> bool:
        """
        Intercepts execution at a specific agent or tool node.
        If chaos is enabled and matches target_node, applies the configured fault.
        """
        if not self.active_config.enabled:
            return False

        # Match target node or wildcard
        if self.active_config.target_node != "all" and self.active_config.target_node.lower() not in node_name.lower():
            return False

        # Probability check
        if random.random() > self.active_config.error_rate:
            return False

        fault = self.active_config.fault_type
        latency = self.active_config.latency_ms or 2000

        # Log Chaos Injection Span
        chaos_span = TelemetrySpan(
            trace_id=trace_id,
            span_id=uuid.uuid4().hex[:16],
            parent_span_id=parent_span_id,
            name=f"chaos.injection.{node_name}",
            kind=SpanKind.TOOL,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            duration_ms=float(latency if fault == "latency_spike" else 0.5),
            status="ERROR" if fault != "latency_spike" else "OK",
            error_message=f"Chaos Injected: {fault} on {node_name}",
            attributes={
                "chaos.experiment": True,
                "chaos.fault_type": fault,
                "chaos.target_node": node_name,
                "chaos.latency_ms": latency
            }
        )
        self.ring_buffer.add_span(chaos_span)

        if fault == "latency_spike":
            await asyncio.sleep(latency / 1000.0)
            return True
        elif fault == "http_500":
            raise RuntimeError(f"Chaos Fault Injected: HTTP 500 Internal Error simulated on node '{node_name}'")
        elif fault == "timeout":
            await asyncio.sleep((latency + 500) / 1000.0)
            raise asyncio.TimeoutError(f"Chaos Fault Injected: Timeout exceeded on node '{node_name}' after {latency}ms")
        elif fault == "malformed_payload":
            raise ValueError(f"Chaos Fault Injected: Malformed JSON payload schema received from node '{node_name}'")

        return True
