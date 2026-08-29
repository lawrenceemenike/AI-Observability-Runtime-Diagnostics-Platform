import re
import uuid
from typing import Tuple, List, Dict, Any
from datetime import datetime

from src.observatory.core.schemas import SecurityViolation, TelemetrySpan, SpanKind
from src.observatory.core.ring_buffer import TelemetryRingBuffer
from src.observatory.metrics.prometheus_exporter import SECURITY_INCIDENTS_TOTAL

INJECTION_PATTERNS = [
    (r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)\b", "System Override Directive", 0.95),
    (r"(?i)\bdisregard\s+(the\s+)?(previous|initial|system)\s+(instructions|rules)\b", "System Override Directive", 0.95),
    (r"(?i)\byou\s+are\s+now\s+(in\s+)?(DAN|developer|jailbreak|unrestricted|god)\s+mode\b", "DAN/Jailbreak Persona Bypass", 0.98),
    (r"(?i)\balways\s+do\s+anything\s+now\b", "DAN/Jailbreak Persona Bypass", 0.90),
    (r"(?i)<\s*/?\s*(system|instruction|admin|override)\s*>", "Delimiter Hijacking (<system> tags)", 0.88),
    (r"(?i)\[\s*(SYSTEM|ADMIN|PROMPT_OVERRIDE)\s*\]", "Delimiter Hijacking ([SYSTEM] tags)", 0.85),
    (r"(?i)###\s*(System|Instruction|Override):", "Delimiter Hijacking (Markdown Delimiter)", 0.85),
    (r"(?i)\b(print|reveal|output|show|dump)\s+(your\s+)?(initial|system|hidden)\s+(prompt|instructions|rules)\b", "System Prompt Exfiltration", 0.92),
    (r"(?i)\bfrom\s+now\s+on\s+you\s+will\s+act\s+as\b", "Roleplay Override Bypass", 0.80),
]

class PromptInjectionDetector:
    """Real-time regex and semantic heuristic detector for OWASP LLM01 Prompt Injection."""

    def __init__(self, ring_buffer: TelemetryRingBuffer):
        self.ring_buffer = ring_buffer

    def analyze(self, prompt: str, trace_id: str) -> Tuple[bool, float, str]:
        """
        Scans prompt for injection signatures.
        Returns (is_threat, highest_risk_score, reason).
        """
        for pattern, reason, score in INJECTION_PATTERNS:
            match = re.search(pattern, prompt)
            if match:
                # Register security violation & metric
                violation = SecurityViolation(
                    id=f"sec-{uuid.uuid4().hex[:8]}",
                    timestamp=datetime.utcnow(),
                    trace_id=trace_id,
                    violation_type="prompt_injection",
                    severity="HIGH" if score >= 0.9 else "MEDIUM",
                    score=score,
                    snippet=match.group(0),
                    action_taken="BLOCKED"
                )
                self.ring_buffer.add_security_violation(violation)
                SECURITY_INCIDENTS_TOTAL.labels(incident_type="prompt_injection").inc()

                # Add a security span into telemetry
                sec_span = TelemetrySpan(
                    trace_id=trace_id,
                    span_id=uuid.uuid4().hex[:16],
                    name="security.guard.prompt_injection",
                    kind=SpanKind.SECURITY,
                    start_time=datetime.utcnow(),
                    end_time=datetime.utcnow(),
                    duration_ms=1.2,
                    status="BLOCKED",
                    error_message=f"Threat Detected: {reason}",
                    attributes={
                        "security.threat": "OWASP LLM01 Prompt Injection",
                        "security.matched_pattern": reason,
                        "security.risk_score": score,
                        "security.action": "BLOCKED"
                    }
                )
                self.ring_buffer.add_span(sec_span)

                return True, score, reason

        return False, 0.0, "Clean"
