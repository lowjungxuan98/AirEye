from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment / `.env`.

    Mirrors the backend's env contract where it overlaps (LiteLLM, Langfuse) so a
    single set of credentials drives both services.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Service
    PORT: int = 8000
    GENAI_API_KEY: str = "change-me"

    # LiteLLM (OpenAI-compatible gateway) — owns every model route.
    LITELLM_BASE_URL: str = "http://localhost:4000/v1"
    LITELLM_API_KEY: str = ""

    # Langfuse — prompt management + tracing.
    LANGFUSE_BASE_URL: str = "https://cloud.langfuse.com"
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_LABEL: str = "production"
    LANGFUSE_TRACING_ENABLED: bool = True
    TOOL_REASONING_PROMPT_NAME: str = "tool-reasoning"

    # Model-call parameters — kept in parity with the TypeScript LiteLlmClient.
    VISION_TEMPERATURE: float = 0.0
    REASONING_TEMPERATURE: float = 0.15
    VISION_MAX_TOKENS: int = 16384
    REASONING_MAX_TOKENS: int = 8192

    # RAG (LlamaIndex + Qdrant). The embedding model is FIXED and independent of
    # the switchable vision/reasoning provider so the index stays valid.
    RAG_ENABLED: bool = True
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "aireye_templates"
    GENAI_EMBED_MODEL: str = "text-embedding-3-small"
    RAG_TOP_K: int = 3

    @property
    def langfuse_configured(self) -> bool:
        return bool(self.LANGFUSE_PUBLIC_KEY and self.LANGFUSE_SECRET_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()
