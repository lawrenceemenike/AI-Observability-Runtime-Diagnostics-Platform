# NIST AI Risk Management Framework (AI RMF 1.0)
## Section 3: Observability, Runtime Governance & Telemetry Standards

### 3.1 Overview of AI Governance Controls
Organizations deploying generative AI models and Small Language Models (SLMs) into autonomous pipelines must maintain continuous visibility into inference health, prompt integrity, and downstream tool execution safety.

### 3.2 Continuous Observability & Telemetry Logging
Mandate for real-time telemetry logging of on-premise SLM inferences:
- All prompt dispatches, token velocity metrics, and time-to-first-token (TTFT) metrics must be instrumented using vendor-neutral OpenTelemetry standards.
- Real-time screening for OWASP LLM01 Prompt Injections, delimiter hijacking, and system prompt exfiltration must occur prior to model generation.
- Distributed tracing spans must capture sub-millisecond causal tracking across Orchestrator, Market, Finance, Regulatory and Gemma SLM nodes to guarantee rapid mean-time-to-detection (MTTD).

### 3.3 Zero-Trust Vector Retrieval & Context Verification
When retrieval-augmented generation (RAG) pipelines query enterprise vector databases:
- Document chunks must be parsed using structured recursive character chunking with a 512-token budget and 50-token overlap.
- Similarity thresholds must satisfy Cosine Similarity ≥ 0.85 to prevent hallucinated context injection into downstream synthesis agents.
- Sensitive credentials, API keys, and high-entropy secrets (Shannon entropy H(X) ≥ 4.3) must be sanitized before context injection.
