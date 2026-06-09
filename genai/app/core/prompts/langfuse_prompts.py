from langfuse import get_client

from app.core.config import Settings

DEFAULT_PROMPT_CACHE_TTL_SECONDS = 60


class PromptService:
    """Fetches text prompts from Langfuse by name + label.

    Same source of truth as the TypeScript backend (`LangfuseClient.getPrompt`),
    so the `tool-reasoning` plan prompt and per-step prompts are shared verbatim.
    """

    def __init__(self, settings: Settings):
        self._label = settings.LANGFUSE_LABEL
        self._cache_ttl = DEFAULT_PROMPT_CACHE_TTL_SECONDS

    def get_text(self, name: str, label: str | None = None) -> str:
        client = get_client()
        prompt = client.get_prompt(
            name,
            label=label or self._label,
            type="text",
            cache_ttl_seconds=self._cache_ttl,
        )
        return prompt.prompt
