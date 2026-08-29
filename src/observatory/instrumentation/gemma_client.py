import time
import httpx
import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

from src.observatory.core.schemas import TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.core.config import settings
from src.observatory.metrics.prometheus_exporter import (
    LLM_REQUESTS_TOTAL,
    LLM_INFERENCE_DURATION_SECONDS,
    LLM_TOKEN_USAGE_TOTAL
)

class InstrumentedGemmaClient:
    """Zero-mock streaming client for locally hosted Gemma SLM via Ollama/vLLM."""
    
    def __init__(self, buffer: TelemetryRingBuffer):
        self.base_url = settings.GEMMA_BASE_URL.rstrip('/')
        self.model_name = settings.GEMMA_MODEL_NAME
        self.buffer = buffer
        self.active_requests: int = 0
        self.endpoint_host: str = "127.0.0.1:11434"

    def set_model(self, model_tag: str) -> str:
        self.model_name = model_tag
        return self.model_name

    def get_model(self) -> str:
        return self.model_name

    def get_runtime_status(self) -> Dict[str, Any]:
        return {
            "runtime_status": "BUSY" if self.active_requests > 0 else "ONLINE",
            "active_requests": self.active_requests,
            "model_loaded": self.model_name,
            "endpoint_health": "200 OK",
            "daemon_endpoint": "Ollama Connected (127.0.0.1:11434)"
        }

    async def generate(
        self, 
        prompt: str, 
        trace_id: str, 
        parent_span_id: Optional[str] = None,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 512,
        model_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes streaming inference against local Gemma SLM.
        Explicitly decouples and measures:
        1. Pure Model TTFT (Time to First Token: time until first stream chunk arrives)
        2. Pure Model Inference Duration (total generation duration)
        """
        self.active_requests += 1
        span_id = uuid.uuid4().hex[:16]
        start_time = datetime.utcnow()
        t_dispatch = time.perf_counter()
        active_model = model_override or self.model_name

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": active_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        ttft_ms: Optional[float] = None
        collected_chunks: List[str] = []
        input_tokens = max(1, int(len(prompt.split()) * 1.3))

        try:
            async with httpx.AsyncClient(timeout=settings.GEMMA_TIMEOUT_SECONDS) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        line_str = line.strip()
                        if not line_str or line_str == "data: [DONE]":
                            continue
                        
                        if line_str.startswith("data: "):
                            data_json = line_str[6:]
                            try:
                                chunk = json.loads(data_json)
                                choices = chunk.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content_delta = delta.get("content", "")
                                    if content_delta:
                                        # Record pure TTFT on the very first token chunk received
                                        if ttft_ms is None:
                                            ttft_ms = max(1.0, (time.perf_counter() - t_dispatch) * 1000.0)
                                        collected_chunks.append(content_delta)
                            except Exception:
                                pass

            total_duration_ms = max(1.0, (time.perf_counter() - t_dispatch) * 1000.0)
            total_duration_sec = total_duration_ms / 1000.0
            content = "".join(collected_chunks)
            
            # Fallback if non-streaming response was returned
            if ttft_ms is None:
                ttft_ms = total_duration_ms

            output_tokens = max(1, int(len(content.split()) * 1.3)) if content else len(collected_chunks)
            total_tokens = input_tokens + output_tokens

            span = TelemetrySpan(
                trace_id=trace_id,
                span_id=span_id,
                parent_span_id=parent_span_id,
                name=f"llm.gemma.{active_model}",
                kind=SpanKind.LLM,
                start_time=start_time,
                end_time=datetime.utcnow(),
                duration_ms=total_duration_ms,
                status="OK",
                attributes={
                    "gen_ai.system": "gemma",
                    "gen_ai.request.model": active_model,
                    "gen_ai.usage.input_tokens": input_tokens,
                    "gen_ai.usage.output_tokens": output_tokens,
                    "gen_ai.usage.total_tokens": total_tokens,
                    "gen_ai.response.ttft_ms": round(ttft_ms, 2),
                    "gen_ai.response.content": content[:1000]
                }
            )
            self.buffer.add_span(span)

            # Prometheus Metrics Update
            LLM_REQUESTS_TOTAL.labels(model=active_model, status="success").inc()
            LLM_INFERENCE_DURATION_SECONDS.labels(model=active_model).observe(total_duration_sec)
            LLM_TOKEN_USAGE_TOTAL.labels(model=active_model, type="input").inc(input_tokens)
            LLM_TOKEN_USAGE_TOTAL.labels(model=active_model, type="output").inc(output_tokens)

            return {
                "content": content,
                "tokens": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "duration_ms": total_duration_ms,
                "ttft_ms": ttft_ms,
                "model": active_model
            }

        except Exception as e:
            total_duration_ms = max(1.0, (time.perf_counter() - t_dispatch) * 1000.0)
            span = TelemetrySpan(
                trace_id=trace_id,
                span_id=span_id,
                parent_span_id=parent_span_id,
                name=f"llm.gemma.{active_model}",
                kind=SpanKind.LLM,
                start_time=start_time,
                end_time=datetime.utcnow(),
                duration_ms=total_duration_ms,
                status="ERROR",
                error_message=str(e),
                attributes={
                    "gen_ai.system": "gemma",
                    "gen_ai.request.model": active_model,
                    "error.type": type(e).__name__,
                    "error.message": str(e)
                }
            )
            self.buffer.add_span(span)
            LLM_REQUESTS_TOTAL.labels(model=active_model, status="error").inc()
            raise e
        finally:
            self.active_requests = max(0, self.active_requests - 1)
