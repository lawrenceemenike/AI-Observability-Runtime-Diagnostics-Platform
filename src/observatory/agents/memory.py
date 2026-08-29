import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from src.observatory.core.schemas import EpisodicMemoryFact, CognitiveMemoryTelemetry

class AgentMemoryManager:
    """Manages episodic fact storage, cognitive attribution tracking, state contradiction heuristics, and reflection spans."""
    
    def __init__(self):
        self.long_term_store: List[Dict[str, Any]] = [
            {
                "id": "mem-01",
                "fact": "Enterprise SLA: 99.95% Availability across Tier-1 US-East & EU-West inference regions",
                "source": "regulatory_agent",
                "source_agent": "regulatory_agent",
                "category": "infrastructure",
                "age": "10m ago",
                "score": 0.98,
                "similarity_score": 0.98,
                "token_count": 18,
                "token_weight": 18,
                "timestamp": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "ACTIVE",
                "superseded_by": None,
                "was_cited_in_last_run": True,
                "mutation_type": "AUTONOMOUS_REFLECTION"
            },
            {
                "id": "mem-02",
                "fact": "On-premise Gemma 2B quantization baseline achieved 4.2x throughput speedup",
                "source": "synthesis_agent",
                "source_agent": "synthesis_agent",
                "category": "performance",
                "age": "25m ago",
                "score": 0.94,
                "similarity_score": 0.94,
                "token_count": 15,
                "token_weight": 15,
                "timestamp": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "ACTIVE",
                "superseded_by": None,
                "was_cited_in_last_run": True,
                "mutation_type": "AUTONOMOUS_REFLECTION"
            },
            {
                "id": "mem-03",
                "fact": "SEC AI Risk Disclosure mandate: automated PII scrubbing and entropy checks required",
                "source": "compliance_officer",
                "source_agent": "compliance_officer",
                "category": "compliance",
                "age": "45m ago",
                "score": 0.99,
                "similarity_score": 0.99,
                "token_count": 20,
                "token_weight": 20,
                "timestamp": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "ACTIVE",
                "superseded_by": None,
                "was_cited_in_last_run": True,
                "mutation_type": "SYSTEM_INJECTION"
            },
            {
                "id": "mem-04",
                "fact": "Local GPU cluster amortized capital cost is $0.00012 per 1,000 generated tokens",
                "source": "finance_agent",
                "source_agent": "finance_agent",
                "category": "economics",
                "age": "1h ago",
                "score": 0.96,
                "similarity_score": 0.96,
                "token_count": 16,
                "token_weight": 16,
                "timestamp": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "ACTIVE",
                "superseded_by": None,
                "was_cited_in_last_run": False,
                "mutation_type": "AUTONOMOUS_REFLECTION"
            },
            {
                "id": "mem-05",
                "fact": "Tail Latency SLA bound enforced strictly under 2.50s P95 threshold",
                "source": "regulatory_agent",
                "source_agent": "regulatory_agent",
                "category": "sla_bound",
                "age": "2h ago",
                "score": 0.95,
                "similarity_score": 0.95,
                "token_count": 14,
                "token_weight": 14,
                "timestamp": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
                "status": "ACTIVE",
                "superseded_by": None,
                "was_cited_in_last_run": True,
                "mutation_type": "AUTONOMOUS_REFLECTION"
            }
        ]

    def evaluate_memory_attribution(self, injected_facts: list, model_output: str) -> dict:
        """Evaluates whether the generated response cited or utilized the injected memories."""
        cited_count = 0
        for fact in injected_facts:
            # Semantic keyword / entity grounding check
            keywords = [w.lower().strip(".,;:\"'()") for w in fact["fact"].split() if len(w) > 4]
            if any(kw in model_output.lower() for kw in keywords):
                fact["was_cited_in_last_run"] = True
                cited_count += 1
            else:
                fact["was_cited_in_last_run"] = False
        
        rate = (cited_count / len(injected_facts)) * 100.0 if injected_facts else 100.0
        return {"utilization_rate": round(rate, 1), "cited_count": cited_count}

    def detect_state_conflicts(self) -> list:
        """Scans episodic memory store for contradictory or competing assertions."""
        conflicts = []
        for i, f1 in enumerate(self.long_term_store):
            for f2 in self.long_term_store[i+1:]:
                if f1["category"] == f2["category"] and f1["id"] != f2["id"]:
                    f1_text = f1["fact"].lower()
                    f2_text = f2["fact"].lower()
                    # Check for competing assertions in identical category
                    if ("expanding" in f1_text and "expanding" in f2_text) or \
                       ("latency" in f1_text and "latency" in f2_text and f1_text != f2_text) or \
                       ("cost" in f1_text and "cost" in f2_text and f1_text != f2_text) or \
                       ("availability" in f1_text and "availability" in f2_text and f1_text != f2_text):
                        f1["status"] = "CONFLICT_FLAGGED"
                        f2["status"] = "CONFLICT_FLAGGED"
                        conflicts.append({"pair": [f1["id"], f2["id"]], "reason": f"Competing {f1['category']} assertions detected"})
        return conflicts

    def add_fact(
        self, 
        fact_text: str, 
        source: str = "user_override", 
        category: str = "knowledge", 
        score: float = 0.95, 
        mutation_type: str = "SYSTEM_INJECTION"
    ) -> Dict[str, Any]:
        new_fact = {
            "id": f"mem-{uuid.uuid4().hex[:6]}",
            "fact": fact_text,
            "source": source,
            "source_agent": source,
            "category": category,
            "age": "just now",
            "score": float(score),
            "similarity_score": float(score),
            "token_count": max(1, int(len(fact_text.split()) * 1.3)),
            "token_weight": max(1, int(len(fact_text.split()) * 1.3)),
            "timestamp": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "status": "ACTIVE",
            "superseded_by": None,
            "was_cited_in_last_run": True,
            "mutation_type": mutation_type
        }
        self.long_term_store.insert(0, new_fact)
        self.detect_state_conflicts()
        return new_fact

    def delete_fact(self, fact_id: str) -> bool:
        initial_len = len(self.long_term_store)
        self.long_term_store = [f for f in self.long_term_store if f["id"] != fact_id]
        return len(self.long_term_store) < initial_len

    def get_telemetry(self, working_tokens: int) -> Dict[str, Any]:
        conflicts = self.detect_state_conflicts()
        active_conflicts_count = len(conflicts)
        
        # Calculate memory utilization rate
        cited_facts = [f for f in self.long_term_store if f.get("was_cited_in_last_run", False)]
        utilization_rate = round((len(cited_facts) / len(self.long_term_store) * 100.0), 1) if self.long_term_store else 75.0
        
        autonomous_count = len([f for f in self.long_term_store if f.get("mutation_type") == "AUTONOMOUS_REFLECTION"])
        
        max_context = 8192
        sat_pct = round((working_tokens / max_context) * 100, 1)

        facts_list = []
        for f in self.long_term_store:
            src = f.get("source_agent") or f.get("source", "regulatory_agent")
            scr = float(f.get("similarity_score") or f.get("score", 0.95))
            tok = int(f.get("token_weight") or f.get("token_count", 16))
            fact_obj = EpisodicMemoryFact(
                id=f["id"],
                fact=f["fact"],
                category=f.get("category", "knowledge"),
                source=src,
                source_agent=src,
                score=scr,
                similarity_score=scr,
                token_count=tok,
                token_weight=tok,
                timestamp=f.get("timestamp") or datetime.utcnow().isoformat(),
                created_at=datetime.utcnow(),
                status=f.get("status", "ACTIVE"),
                superseded_by=f.get("superseded_by"),
                was_cited_in_last_run=f.get("was_cited_in_last_run", False),
                mutation_type=f.get("mutation_type", "AUTONOMOUS_REFLECTION"),
                age=f.get("age", "just now")
            )
            facts_list.append(fact_obj)

        return {
            "working_memory_tokens": working_tokens,
            "max_context_window": max_context,
            "context_saturation_pct": sat_pct,
            "evicted_turns_count": 0,
            "episodic_facts_count": len(self.long_term_store),
            "avg_read_latency_ms": 3.4,
            "avg_write_latency_ms": 1.8,
            "memory_utilization_rate": utilization_rate,
            "active_conflicts_count": active_conflicts_count,
            "autonomous_reflections_count": autonomous_count,
            "allocation": {
                "system_prompt_tokens": 420,
                "tool_scratchpad_tokens": max(150, int(working_tokens * 0.35)),
                "turn_history_tokens": max(200, int(working_tokens * 0.45)),
                "free_headroom_tokens": max(0, max_context - working_tokens)
            },
            "facts": [f.dict(by_alias=True) for f in facts_list],
            "recent_facts": [f.dict(by_alias=True) for f in facts_list]
        }
