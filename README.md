# databerry™ — Real-Time AI Observability & Runtime Diagnostics Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-Tracing-F54A00?style=flat&logo=opentelemetry&logoColor=white)](https://opentelemetry.io/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20Gemma%20SLM-black?style=flat&logo=ollama&logoColor=white)](https://ollama.ai/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An open-source zero-mock, real-time observability and runtime diagnostics platform designed for on-premise Small Language Models (Gemma SLM) and autonomous multi-agent systems. Built with OpenTelemetry distributed tracing, mathematical evaluation judges, in-memory circular ring buffers, and continuous runtime guardrails.

---

## 🏛 Architecture Overview

```
+-----------------------------------------------------------------------------------------------+
|                                    databerry™ Architecture                                    |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|   +--------------------------+    OpenTelemetry Spans     +-------------------------------+   |
|   |  Multi-Agent System      |--------------------------->|  ObservatoryTracer & Buffer   |   |
|   |  (Orchestrator, Tools,   |                            |  - Thread-Safe Ring Buffer    |   |
|   |   Memory, RAG Retriever) |                            |  - In-Memory Circular Cache   |   |
|   +--------------------------+                            +-------------------------------+   |
|                 |                                                         |                   |
|                 v (Zero Egress)                                           v                   |
|   +--------------------------+                            +-------------------------------+   |
|   |  Local Gemma SLM         |                            |  Metrics & Security Engine    |   |
|   |  (Ollama / vLLM 11434)   |                            |  - OpenLLMetry Exporter       |   |
|   +--------------------------+                            |  - OWASP Runtime Firewall     |   |
|                 |                                         |  - Shannon Entropy Scrubber   |   |
|                 v                                         +-------------------------------+   |
|   +---------------------------------------------------------------------------------------+   |
|   |                       FastAPI Real-Time Telemetry Server (Port 8000)                  |   |
|   |        (REST Endpoints, Server-Sent Events SSE Stream, Prometheus /metrics)           |   |
|   +---------------------------------------------------------------------------------------+   |
|                                             | (Live SSE Stream & REST)                        |
|                                             v                                                 |
|   +---------------------------------------------------------------------------------------+   |
|   |                         React / Vite / Tailwind UI Dashboard                          |   |
|   |   - Main Diagnostics Grid     - Trace Explorer & Flamegraphs  - Cognitive Memory      |   |
|   |   - Agent Quality Evaluation  - Prometheus APM Exposition     - Runtime Security      |   |
|   |   - Chaos Fault Studio        - Runtime Governance Control Plane                      |   |
|   +---------------------------------------------------------------------------------------+   |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 🌟 Key Platform Modules

### 1. Main Dashboard & Golden Signals
- **Inference Status**: Live daemon tracker displaying `Idle / Ready (0 In-Flight)` vs `Generating (1 In-Flight)` and Ollama port connectivity (`127.0.0.1:11434`).
- **Tail Latency & SLA**: Real-time $P_{50}$, $P_{95}$, and $P_{99}$ percentiles with automated SLA breach coloring.
- **RAG Retrieval Precision**: Semi-circle gauge evaluating cosine similarity thresholds ($\ge 0.85$).
- **Counterfactual Economics**: Quantifies live cost savings comparing local inference ($0.15/1M tok) against commercial cloud APIs ($15.00/1M tok), delivering $99.0\%$ gross margins.

### 2. Trace Explorer & Causal Flamegraphs
- Full OpenTelemetry span trees with parent-child hierarchy indexing.
- Deep visual flamegraph inspector detailing span durations, token weights, and prompt/response attributes.
- Integrated automated root-cause diagnostics.

### 3. Agent Memory & Cognitive Dynamics
- **Memory Utilization Rate**: Measures whether retrieved episodic facts were synthesized or wasted as context bloat.
- **Belief Contradiction Engine**: Semantic conflict detector catching contradictory statements.
- **Context Saturation Gauge**: Active working memory tracking against the 8,192 token limit.
- **Episodic Store Ledger**: Searchable vector fact registry with time-decay weighting and manual pruning.

### 4. Agent Evaluation & Trajectory Intelligence
- Combines mathematical checks and local Gemma LLM-as-a-Judge grading:
  - **Trajectory Efficiency**: Penalizes redundant execution loops (0–10 scale).
  - **Tool Precision**: Validates schema correctness and necessity.
  - **Grounding Faithfulness**: Entailment score against retrieved RAG chunks.
  - **Goal Completion**: Verifies fulfillment of user objectives.

### 5. AI Security Firewall & Forensic Audit (OWASP Top 10)
- **LLM01 Prompt Injection**: Regex and heuristic delimiter hijack interceptors.
- **LLM04 Token Watchdog**: Step-loop circuit breakers (10-step bound).
- **LLM06 Entropy & DLP**: High-water mark Shannon entropy ($H(X) \ge 4.9$) redaction for secrets and PII.
- **LLM08 Excessive Agency**: Strict tool authorization white-listing.
- **Interactive Sandbox & Forensic Log**: Red-teaming console with direct clickable trace links.

### 6. Chaos Engineering & Fault Simulation
- Programmatic fault injector targeting `Calculator Tool`, `Vector Retriever`, `Search Tool`, or `Local Gemma SLM`.
- Simulates `HTTP 500`, `Latency Spikes (0–5s)`, `Timeouts`, and `Malformed Schemas`.

### 7. Runtime Governance & Model Control Plane
- Dynamic SLA compliance rate ($< 350\text{ms}$ TTFT budget).
- Verified $100\%$ zero-egress data containment ($0\text{ B}$ outbound).
- Hardware envelope monitor (VRAM / RAM / Quantization).
- Interactive zero-downtime model hot-swapping (`gemma:2b`, `gemma:latest`, `gemma4:12b`).
- Continuous regulatory policy ledger (NIST AI RMF 1.0, OWASP LLM, SEC Data Boundary).

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- [Ollama](https://ollama.ai/) with `gemma:2b` pulled (`ollama pull gemma:2b`)

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/lawrenceemenike/AI-Observability-Runtime-Diagnostics-Platform.git
cd AI-Observability-Runtime-Diagnostics-Platform

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI telemetry server
python -m uvicorn src.observatory.server:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# Navigate to dashboard directory
cd dashboard

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

---

## 🧪 Testing & Verification

Run the automated test suite covering all ring buffer, security firewall, chaos engineering, and telemetry components:

```bash
pytest tests/ -v
```

To build and validate the production frontend bundle:
```bash
cd dashboard
npm run build
```

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
