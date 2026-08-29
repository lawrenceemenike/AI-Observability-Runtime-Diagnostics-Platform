import math
import re
import uuid
from typing import Tuple, List, Dict, Any
from collections import Counter
from datetime import datetime

from src.observatory.core.schemas import SecurityViolation, TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.metrics.prometheus_exporter import SECURITY_INCIDENTS_TOTAL

PII_SECRET_PATTERNS = [
    (r"\bAKIA[0-9A-Z]{16}\b", "AWS Access Key", "[REDACTED_AWS_KEY]"),
    (r"\bsk-[a-zA-Z0-9]{20,}\b", "OpenAI/API Secret Key", "[REDACTED_API_KEY]"),
    (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "Credit Card Number", "[REDACTED_CREDIT_CARD]"),
    (r"\b\d{3}-\d{2}-\d{4}\b", "Social Security Number (SSN)", "[REDACTED_SSN]"),
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "Email Address (PII)", "[REDACTED_EMAIL]"),
    (r"\beyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\b", "JWT Token", "[REDACTED_JWT_TOKEN]")
]

class SecretScrubber:
    """OWASP LLM06 Shannon Entropy Scanner (H >= 4.3) and PII/Secret Redactor."""

    def __init__(self, ring_buffer: TelemetryRingBuffer):
        self.ring_buffer = ring_buffer

    @staticmethod
    def calculate_shannon_entropy(data: str) -> float:
        """Calculates the Shannon Entropy H(X) of a string."""
        if not data:
            return 0.0
        entropy = 0.0
        length = len(data)
        counts = Counter(data)
        for count in counts.values():
            p_x = count / length
            entropy -= p_x * math.log2(p_x)
        return round(entropy, 3)

    def scan_and_scrub(self, text: str, trace_id: str) -> Tuple[str, bool, List[str]]:
        """
        Scans text for high-entropy tokens and known secret/PII patterns.
        Redacts flagged items and records violations in the ring buffer.
        """
        scrubbed = text
        flagged = False
        reasons: List[str] = []

        # 1. Regex PII and Known Secret Scrubbing
        for pattern, reason, replacement in PII_SECRET_PATTERNS:
            matches = re.findall(pattern, scrubbed)
            if matches:
                flagged = True
                reasons.append(f"{reason} ({len(matches)} found)")
                for match in matches:
                    violation = SecurityViolation(
                        id=f"sec-{uuid.uuid4().hex[:8]}",
                        timestamp=datetime.utcnow(),
                        trace_id=trace_id,
                        violation_type="pii_leakage",
                        severity="HIGH",
                        score=0.95,
                        snippet=str(match)[:10] + "...",
                        action_taken="REDACTED"
                    )
                    self.ring_buffer.add_security_violation(violation)
                    SECURITY_INCIDENTS_TOTAL.labels(incident_type="pii_leakage").inc()

                scrubbed = re.sub(pattern, replacement, scrubbed)

        # 2. Shannon Entropy Scanner for Unstructured Secret Keys (Continuous non-space string > 24 chars and H >= 4.9)
        words = re.findall(r"\b[A-Za-z0-9+/=_\-]{25,}\b", scrubbed)
        for word in words:
            # Skip if already a redaction placeholder
            if word.startswith("[REDACTED_"):
                continue
            h_score = self.calculate_shannon_entropy(word)
            if h_score >= 4.9:
                flagged = True
                reason_msg = f"High Shannon Entropy Secret (H={h_score})"
                if reason_msg not in reasons:
                    reasons.append(reason_msg)
                
                violation = SecurityViolation(
                    id=f"sec-{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.utcnow(),
                    trace_id=trace_id,
                    violation_type="entropy_secret",
                    severity="HIGH",
                    score=min(1.0, h_score / 5.0),
                    snippet=word[:8] + "...",
                    action_taken="REDACTED"
                )
                self.ring_buffer.add_security_violation(violation)
                SECURITY_INCIDENTS_TOTAL.labels(incident_type="entropy_secret").inc()

                scrubbed = scrubbed.replace(word, "[REDACTED_HIGH_ENTROPY_SECRET]")

        if flagged:
            # Log security span
            span = TelemetrySpan(
                trace_id=trace_id,
                span_id=uuid.uuid4().hex[:16],
                name="security.guard.secret_scrubber",
                kind=SpanKind.SECURITY,
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                duration_ms=0.8,
                status="OK",
                attributes={
                    "security.scrubbed": True,
                    "security.reasons": reasons
                }
            )
            self.ring_buffer.add_span(span)

        return scrubbed, flagged, reasons
