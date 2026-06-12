import pytest

from app.core.config import get_settings
from app.core.observability import langsmith_integration


_ENV_DEFAULTS = {
    "GENAI_API_KEY": "change-me",
    "LITELLM_BASE_URL": "http://localhost:4000/v1",
    "LITELLM_API_KEY": "",
    "LANGFUSE_BASE_URL": "https://cloud.langfuse.com",
    "LANGFUSE_PUBLIC_KEY": "",
    "LANGFUSE_SECRET_KEY": "",
    "LANGFUSE_LABEL": "production",
    "LANGFUSE_TRACING_ENABLED": "true",
    "PROMPT_PROVIDER": "langfuse",
    "LANGSMITH_ENABLED": "false",
    "LANGSMITH_API_KEY": "",
    "LANGSMITH_ENDPOINT": "https://api.smith.langchain.com",
    "LANGSMITH_PROJECT": "aireye-genai",
    "LANGSMITH_WORKSPACE_ID": "",
    "LANGSMITH_TRACING_ENABLED": "true",
    "LANGSMITH_PROMPT_TAG": "production",
    "LANGSMITH_FEEDBACK_ENABLED": "true",
    "VISION_IMAGE_INLINE_ENABLED": "true",
    "VISION_IMAGE_DOWNLOAD_TIMEOUT_SECONDS": "20",
    "VISION_IMAGE_MAX_DOWNLOAD_BYTES": "15000000",
    "VISION_IMAGE_MAX_LONG_EDGE": "2000",
    "VISION_IMAGE_JPEG_QUALITY": "82",
    "VISION_TRACE_IMAGE_INPUTS": "false",
    "RAG_ENABLED": "true",
}


@pytest.fixture(autouse=True)
def isolate_settings(monkeypatch):
    get_settings.cache_clear()
    langsmith_integration._client = None
    for key, value in _ENV_DEFAULTS.items():
        monkeypatch.setenv(key, value)
    yield
    get_settings.cache_clear()
    langsmith_integration._client = None
