import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "ai-runtime-observatory"
    APP_ENV: str = "production"
    DEBUG: bool = False
    
    # Local SLM Endpoint (Ollama / vLLM)
    GEMMA_BASE_URL: str = os.getenv("GEMMA_BASE_URL", "http://127.0.0.1:11434/v1")
    GEMMA_MODEL_NAME: str = os.getenv("GEMMA_MODEL_NAME", "gemma:2b")
    GEMMA_TIMEOUT_SECONDS: float = 60.0
    
    # Server Gateway Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Telemetry Ring Buffer Configuration
    RING_BUFFER_CAPACITY: int = 10000
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "observatory.db")
    
    # Security Watchdog Limits (OWASP LLM04)
    MAX_AGENT_LOOPS: int = 10
    MAX_CUMULATIVE_TOKENS: int = 8192
    MAX_AGENT_TIMEOUT_SECONDS: float = 30.0
    
    # Economics COGS ($ / 1M tokens counterfactual vs commercial cloud models)
    COUNTERFACTUAL_CLOUD_COST_PER_1M_TOKENS: float = 15.00  # $15 per 1M tokens (e.g. GPT-4/Claude 3.5 Sonnet counterfactual)
    LOCAL_COGS_PER_1M_TOKENS: float = 0.15                  # $0.15 per 1M tokens (electricity/hardware amortized)

    model_config = {"env_file": ".env", "extra": "allow"}

settings = Settings()
