import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response

class OpenTelemetryHeaderMiddleware(BaseHTTPMiddleware):
    """Propagates traceparent and records HTTP response time headers."""

    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id") or uuid.uuid4().hex
        t0 = time.perf_counter()
        
        response: Response = await call_next(request)
        
        duration_ms = (time.perf_counter() - t0) * 1000.0
        response.headers["X-Trace-Id"] = trace_id
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
        return response
