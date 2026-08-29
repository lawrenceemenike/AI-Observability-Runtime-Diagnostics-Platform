import sqlite3
import threading
import json
from collections import deque
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.observatory.core.schemas import TelemetrySpan, TraceRecord, SecurityViolation, SpanKind
from src.observatory.core.config import settings

class TelemetryRingBuffer:
    """Thread-safe circular telemetry buffer backed by SQLite for zero-loss recovery."""

    def __init__(self, capacity: int = 10000, db_path: Optional[str] = None):
        self.capacity = capacity
        self.db_path = db_path or settings.SQLITE_DB_PATH
        self.lock = threading.RLock()
        
        # Circular In-Memory Data Structures
        self._spans: deque = deque(maxlen=capacity)
        self._spans_by_id: Dict[str, TelemetrySpan] = {}
        self._spans_by_trace_id: Dict[str, List[TelemetrySpan]] = {}
        self._traces: Dict[str, TraceRecord] = {}
        self._recent_trace_ids: deque = deque(maxlen=2000)
        self._security_violations: deque = deque(maxlen=1000)
        
        self._init_sqlite()
        self._hydrate_from_sqlite()

    def _init_sqlite(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS spans (
                        span_id TEXT PRIMARY KEY,
                        trace_id TEXT NOT NULL,
                        parent_span_id TEXT,
                        name TEXT NOT NULL,
                        kind TEXT NOT NULL,
                        start_time TEXT NOT NULL,
                        end_time TEXT,
                        duration_ms REAL NOT NULL,
                        status TEXT NOT NULL,
                        error_message TEXT,
                        attributes_json TEXT
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time)")
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS traces (
                        trace_id TEXT PRIMARY KEY,
                        root_query TEXT,
                        workflow_name TEXT,
                        total_duration_ms REAL,
                        input_tokens INTEGER,
                        output_tokens INTEGER,
                        total_tokens INTEGER,
                        estimated_cost_usd REAL,
                        counterfactual_savings_usd REAL,
                        has_error INTEGER,
                        security_flagged INTEGER,
                        status TEXT,
                        timestamp TEXT NOT NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp)")

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS security_violations (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        trace_id TEXT NOT NULL,
                        violation_type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        score REAL NOT NULL,
                        snippet TEXT,
                        action_taken TEXT NOT NULL
                    )
                """)
                conn.commit()
        except Exception as e:
            print(f"[TelemetryRingBuffer] SQLite initialization error: {e}")

    def _hydrate_from_sqlite(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM traces ORDER BY timestamp DESC LIMIT 500")
                trace_rows = cursor.fetchall()
                for row in reversed(trace_rows):
                    tr = TraceRecord(
                        trace_id=row[0],
                        root_query=row[1] or "",
                        workflow_name=row[2] or "enterprise_research",
                        total_duration_ms=row[3] or 0.0,
                        input_tokens=row[4] or 0,
                        output_tokens=row[5] or 0,
                        total_tokens=row[6] or 0,
                        estimated_cost_usd=row[7] or 0.0,
                        counterfactual_savings_usd=row[8] or 0.0,
                        has_error=bool(row[9]),
                        security_flagged=bool(row[10]),
                        status=row[11] or "COMPLETED",
                        timestamp=datetime.fromisoformat(row[12]) if row[12] else datetime.utcnow()
                    )
                    self._traces[tr.trace_id] = tr
                    self._recent_trace_ids.append(tr.trace_id)

                cursor.execute("SELECT * FROM spans ORDER BY start_time DESC LIMIT 2000")
                span_rows = cursor.fetchall()
                for row in reversed(span_rows):
                    attrs = json.loads(row[10]) if row[10] else {}
                    span = TelemetrySpan(
                        span_id=row[0],
                        trace_id=row[1],
                        parent_span_id=row[2],
                        name=row[3],
                        kind=SpanKind(row[4]) if row[4] in [k.value for k in SpanKind] else SpanKind.AGENT,
                        start_time=datetime.fromisoformat(row[5]) if row[5] else datetime.utcnow(),
                        end_time=datetime.fromisoformat(row[6]) if row[6] else None,
                        duration_ms=row[7] or 0.0,
                        status=row[8] or "OK",
                        error_message=row[9],
                        attributes=attrs
                    )
                    self._spans.append(span)
                    self._spans_by_id[span.span_id] = span
                    if span.trace_id not in self._spans_by_trace_id:
                        self._spans_by_trace_id[span.trace_id] = []
                    self._spans_by_trace_id[span.trace_id].append(span)

                cursor.execute("SELECT * FROM security_violations ORDER BY timestamp DESC LIMIT 200")
                for row in cursor.fetchall():
                    viol = SecurityViolation(
                        id=row[0],
                        timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
                        trace_id=row[2],
                        violation_type=row[3],
                        severity=row[4],
                        score=row[5],
                        snippet=row[6] or "",
                        action_taken=row[7]
                    )
                    self._security_violations.append(viol)
        except Exception as e:
            print(f"[TelemetryRingBuffer] Hydration error (non-fatal): {e}")

    def add_span(self, span: TelemetrySpan) -> None:
        with self.lock:
            # Handle circular buffer eviction clean-up
            if len(self._spans) >= self.capacity:
                evicted_span = self._spans[0]
                self._spans_by_id.pop(evicted_span.span_id, None)

            self._spans.append(span)
            self._spans_by_id[span.span_id] = span
            
            if span.trace_id not in self._spans_by_trace_id:
                self._spans_by_trace_id[span.trace_id] = []
            self._spans_by_trace_id[span.trace_id].append(span)

            # Auto-aggregate into TraceRecord if trace exists or create draft
            if span.trace_id in self._traces:
                trace = self._traces[span.trace_id]
                trace.spans = self._spans_by_trace_id[span.trace_id]
                if span.status == "ERROR":
                    trace.has_error = True
                    trace.status = "FAILED"
                if span.kind == SpanKind.LLM:
                    in_tok = span.attributes.get("gen_ai.usage.input_tokens", 0)
                    out_tok = span.attributes.get("gen_ai.usage.output_tokens", 0)
                    trace.input_tokens += in_tok
                    trace.output_tokens += out_tok
                    trace.total_tokens += (in_tok + out_tok)
                    
                    # Compute Economics: local cost vs counterfactual cloud cost
                    trace.estimated_cost_usd = (trace.total_tokens / 1_000_000) * settings.LOCAL_COGS_PER_1M_TOKENS
                    cloud_cost = (trace.total_tokens / 1_000_000) * settings.COUNTERFACTUAL_CLOUD_COST_PER_1M_TOKENS
                    trace.counterfactual_savings_usd = max(0.0, cloud_cost - trace.estimated_cost_usd)
            
            # Persist to SQLite
            self._persist_span_sqlite(span)

    def _persist_span_sqlite(self, span: TelemetrySpan):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO spans (
                        span_id, trace_id, parent_span_id, name, kind,
                        start_time, end_time, duration_ms, status, error_message, attributes_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    span.span_id,
                    span.trace_id,
                    span.parent_span_id,
                    span.name,
                    span.kind.value if isinstance(span.kind, SpanKind) else str(span.kind),
                    span.start_time.isoformat(),
                    span.end_time.isoformat() if span.end_time else None,
                    span.duration_ms,
                    span.status,
                    span.error_message,
                    json.dumps(span.attributes)
                ))
                conn.commit()
        except Exception as e:
            pass

    def add_trace(self, trace: TraceRecord) -> None:
        with self.lock:
            # Sync spans from memory if available
            if trace.trace_id in self._spans_by_trace_id:
                trace.spans = self._spans_by_trace_id[trace.trace_id]
            self._traces[trace.trace_id] = trace
            if trace.trace_id not in self._recent_trace_ids:
                self._recent_trace_ids.append(trace.trace_id)
            
            self._persist_trace_sqlite(trace)

    def _persist_trace_sqlite(self, trace: TraceRecord):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO traces (
                        trace_id, root_query, workflow_name, total_duration_ms,
                        input_tokens, output_tokens, total_tokens, estimated_cost_usd,
                        counterfactual_savings_usd, has_error, security_flagged, status, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    trace.trace_id,
                    trace.root_query,
                    trace.workflow_name,
                    trace.total_duration_ms,
                    trace.input_tokens,
                    trace.output_tokens,
                    trace.total_tokens,
                    trace.estimated_cost_usd,
                    trace.counterfactual_savings_usd,
                    1 if trace.has_error else 0,
                    1 if trace.security_flagged else 0,
                    trace.status,
                    trace.timestamp.isoformat()
                ))
                conn.commit()
        except Exception as e:
            pass

    def add_security_violation(self, violation: SecurityViolation) -> None:
        with self.lock:
            self._security_violations.append(violation)
            if violation.trace_id in self._traces:
                self._traces[violation.trace_id].security_flagged = True
                self._persist_trace_sqlite(self._traces[violation.trace_id])
                
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT OR REPLACE INTO security_violations (
                            id, timestamp, trace_id, violation_type, severity, score, snippet, action_taken
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        violation.id,
                        violation.timestamp.isoformat(),
                        violation.trace_id,
                        violation.violation_type,
                        violation.severity,
                        violation.score,
                        violation.snippet,
                        violation.action_taken
                    ))
                    conn.commit()
            except Exception:
                pass

    def get_span(self, span_id: str) -> Optional[TelemetrySpan]:
        with self.lock:
            return self._spans_by_id.get(span_id)

    def get_spans_for_trace(self, trace_id: str) -> List[TelemetrySpan]:
        with self.lock:
            return list(self._spans_by_trace_id.get(trace_id, []))

    def get_all_spans(self, limit: int = 1000) -> List[TelemetrySpan]:
        with self.lock:
            spans_list = list(self._spans)
            return spans_list[-limit:] if limit < len(spans_list) else spans_list

    def get_recent_traces(self, limit: int = 100, status: Optional[str] = None) -> List[TraceRecord]:
        with self.lock:
            trace_ids = list(self._recent_trace_ids)
            traces = []
            for tid in reversed(trace_ids):
                if tid in self._traces:
                    tr = self._traces[tid]
                    if status is None or tr.status == status:
                        # Ensure spans are attached
                        tr.spans = self._spans_by_trace_id.get(tid, [])
                        traces.append(tr)
                    if len(traces) >= limit:
                        break
            return traces

    def get_trace(self, trace_id: str) -> Optional[TraceRecord]:
        with self.lock:
            if trace_id in self._traces:
                tr = self._traces[trace_id]
                tr.spans = self._spans_by_trace_id.get(trace_id, [])
                return tr
            return None

    def get_security_violations(self, limit: int = 100) -> List[SecurityViolation]:
        with self.lock:
            violations = list(self._security_violations)
            return violations[-limit:] if limit < len(violations) else violations

    def query_spans(self, kind: Optional[SpanKind] = None, status: Optional[str] = None) -> List[TelemetrySpan]:
        with self.lock:
            matched = []
            for s in reversed(self._spans):
                if kind is not None and s.kind != kind:
                    continue
                if status is not None and s.status != status:
                    continue
                matched.append(s)
            return matched

    def search(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Full-text search across trace IDs, workflow names, span names, and prompt attributes."""
        q = query.lower().strip()
        if not q:
            return []
        
        with self.lock:
            results = []
            seen_traces = set()

            # 1. Search in Traces
            for tr in self._traces.values():
                if tr.trace_id in seen_traces:
                    continue
                is_match = False
                if q in tr.trace_id.lower() or q in tr.workflow_name.lower() or q in tr.root_query.lower() or q in tr.status.lower():
                    is_match = True
                elif q in ("error", "err", "500") and (tr.has_error or "500" in tr.status):
                    is_match = True
                elif q in ("security", "injection", "blocked") and tr.security_flagged:
                    is_match = True

                if is_match:
                    seen_traces.add(tr.trace_id)
                    results.append({
                        "trace_id": tr.trace_id,
                        "workflow_name": tr.workflow_name,
                        "root_query": tr.root_query,
                        "total_duration_ms": tr.total_duration_ms,
                        "total_tokens": tr.total_tokens,
                        "status": tr.status,
                        "has_error": tr.has_error,
                        "security_flagged": tr.security_flagged,
                        "timestamp": tr.timestamp.isoformat() if hasattr(tr.timestamp, 'isoformat') else str(tr.timestamp),
                        "match_type": "trace"
                    })
                    if len(results) >= limit:
                        return results

            # 2. Search in Spans (if not already added as a trace)
            for s in reversed(self._spans):
                if s.trace_id in seen_traces:
                    continue
                is_match = False
                if (q in s.name.lower() or 
                    q in s.trace_id.lower() or 
                    q in s.status.lower() or 
                    (s.error_message and q in s.error_message.lower()) or
                    (s.kind and q in s.kind.value.lower())):
                    is_match = True
                else:
                    # check attributes
                    for val in s.attributes.values():
                        if isinstance(val, str) and q in val.lower():
                            is_match = True
                            break

                if is_match:
                    seen_traces.add(s.trace_id)
                    tr = self._traces.get(s.trace_id)
                    if tr:
                        results.append({
                            "trace_id": tr.trace_id,
                            "workflow_name": tr.workflow_name,
                            "root_query": tr.root_query,
                            "total_duration_ms": tr.total_duration_ms,
                            "total_tokens": tr.total_tokens,
                            "status": tr.status,
                            "has_error": tr.has_error,
                            "security_flagged": tr.security_flagged,
                            "timestamp": tr.timestamp.isoformat() if hasattr(tr.timestamp, 'isoformat') else str(tr.timestamp),
                            "match_type": "span"
                        })
                    else:
                        results.append({
                            "trace_id": s.trace_id,
                            "workflow_name": s.name,
                            "root_query": s.attributes.get("gen_ai.prompt", s.name),
                            "total_duration_ms": s.duration_ms,
                            "total_tokens": s.attributes.get("gen_ai.usage.total_tokens", 0),
                            "status": s.status,
                            "has_error": s.status != "OK",
                            "security_flagged": s.status == "BLOCKED",
                            "timestamp": s.start_time.isoformat() if hasattr(s.start_time, 'isoformat') else str(s.start_time),
                            "match_type": "span"
                        })
                    if len(results) >= limit:
                        return results

            return results

    def clear(self):
        with self.lock:
            self._spans.clear()
            self._spans_by_id.clear()
            self._spans_by_trace_id.clear()
            self._traces.clear()
            self._recent_trace_ids.clear()
            self._security_violations.clear()

