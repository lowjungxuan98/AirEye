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

    # Prompt management provider. Langfuse remains the production default; LangSmith
    # can be enabled once matching prompt names are created there.
    PROMPT_PROVIDER: str = "langfuse"

    # LangSmith — optional tracing, prompt pull, feedback, and offline evals.
    LANGSMITH_ENABLED: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGSMITH_PROJECT: str = "aireye-genai"
    LANGSMITH_WORKSPACE_ID: str = ""
    LANGSMITH_TRACING_ENABLED: bool = True
    LANGSMITH_PROMPT_TAG: str = "production"
    LANGSMITH_FEEDBACK_ENABLED: bool = True
    LANGSMITH_DATASET_NAME: str = "aireye-genai-regression"

    # Model-call parameters — kept in parity with the TypeScript LiteLlmClient.
    VISION_TEMPERATURE: float = 0.0
    REASONING_TEMPERATURE: float = 0.15
    VISION_MAX_TOKENS: int = 16384
    REASONING_MAX_TOKENS: int = 8192

    # Vision image preprocessing. Remote image URLs are downloaded by GenAI and
    # passed to the model as compact JPEG data URLs, avoiding provider-side
    # download timeouts on large S3 presigned URLs.
    VISION_IMAGE_INLINE_ENABLED: bool = True
    VISION_IMAGE_DOWNLOAD_TIMEOUT_SECONDS: float = 20.0
    VISION_IMAGE_MAX_DOWNLOAD_BYTES: int = 15_000_000
    VISION_IMAGE_MAX_LONG_EDGE: int = 2000
    VISION_IMAGE_JPEG_QUALITY: int = 82
    VISION_TRACE_IMAGE_INPUTS: bool = False

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

    @property
    def langsmith_configured(self) -> bool:
        return bool(self.LANGSMITH_ENABLED and self.LANGSMITH_API_KEY)

    @property
    def prompt_provider(self) -> str:
        return self.PROMPT_PROVIDER.strip().lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()
