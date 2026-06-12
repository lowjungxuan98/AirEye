from app.core.config import Settings
from app.core.observability.langsmith_integration import pull_prompt_text
from app.core.prompts.langfuse_prompts import PromptService as LangfusePromptService


class LangSmithPromptService:
    """Fetch text prompts from LangSmith by prompt name + tag."""

    def __init__(self, settings: Settings):
        if not settings.langsmith_configured:
            raise RuntimeError("PROMPT_PROVIDER=langsmith requires LANGSMITH_ENABLED=true and LANGSMITH_API_KEY")
        self._settings = settings

    def get_text(self, name: str, label: str | None = None) -> str:
        return pull_prompt_text(self._settings, name, tag=label)


def build_prompt_service(settings: Settings):
    provider = settings.prompt_provider
    if provider == "langfuse":
        return LangfusePromptService(settings)
    if provider == "langsmith":
        return LangSmithPromptService(settings)
    raise ValueError('PROMPT_PROVIDER must be "langfuse" or "langsmith"')
