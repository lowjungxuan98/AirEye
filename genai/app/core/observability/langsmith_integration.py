import logging
import os
from contextlib import nullcontext
from typing import Any

from app.core.config import Settings

logger = logging.getLogger(__name__)

_client = None


def init_langsmith(settings: Settings) -> None:
    """Configure LangSmith when enabled.

    LangSmith is optional and runs beside Langfuse. We set the standard env vars
    for LangChain/LangGraph interoperability, but also keep an explicit client so
    feedback, prompts and health checks do not rely on process-global state.
    """
    global _client
    if not settings.LANGSMITH_ENABLED:
        _client = None
        return
    if not settings.LANGSMITH_API_KEY:
        logger.warning("LANGSMITH_ENABLED=true but LANGSMITH_API_KEY is not set.")
        _client = None
        return

    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGSMITH_TRACING"] = "true" if settings.LANGSMITH_TRACING_ENABLED else "false"
    if settings.LANGSMITH_WORKSPACE_ID:
        os.environ["LANGSMITH_WORKSPACE_ID"] = settings.LANGSMITH_WORKSPACE_ID

    _client = _new_client(settings)


def langsmith_ready() -> bool:
    return _client is not None


def get_langsmith_client(settings: Settings):
    if _client is not None:
        return _client
    if not settings.langsmith_configured:
        raise RuntimeError("LangSmith is not configured")
    return _new_client(settings)


def langsmith_tracing_context(settings: Settings):
    if not (settings.langsmith_configured and settings.LANGSMITH_TRACING_ENABLED):
        return nullcontext()

    import langsmith as ls

    return ls.tracing_context(
        client=get_langsmith_client(settings),
        project_name=settings.LANGSMITH_PROJECT,
        enabled=True,
    )


def pull_prompt_text(settings: Settings, name: str, tag: str | None = None) -> str:
    prompt_ref = _prompt_ref(name, tag or settings.LANGSMITH_PROMPT_TAG)
    prompt = get_langsmith_client(settings).pull_prompt(prompt_ref)
    return _prompt_to_text(prompt)


def create_feedback(
    settings: Settings,
    *,
    trace_id: str,
    key: str,
    score: float | int | bool | None = None,
    comment: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not settings.LANGSMITH_FEEDBACK_ENABLED:
        raise RuntimeError("LangSmith feedback is disabled")
    client = get_langsmith_client(settings)
    kwargs: dict[str, Any] = {
        "key": key,
        "trace_id": trace_id,
        "score": score,
    }
    if comment is not None:
        kwargs["comment"] = comment
    if metadata:
        kwargs["source_info"] = metadata
    client.create_feedback(**kwargs)


def check_langsmith_connection(settings: Settings) -> None:
    """Raise if LangSmith credentials cannot access the API."""
    projects = get_langsmith_client(settings).list_projects()
    next(iter(projects), None)


def _new_client(settings: Settings):
    from langsmith import Client

    return Client(api_key=settings.LANGSMITH_API_KEY, api_url=settings.LANGSMITH_ENDPOINT)


def _prompt_ref(name: str, tag: str | None) -> str:
    clean_name = name.strip()
    clean_tag = (tag or "").strip()
    return f"{clean_name}:{clean_tag}" if clean_tag else clean_name


def _prompt_to_text(prompt: Any) -> str:
    if isinstance(prompt, str):
        return prompt.strip()

    text = _text_attr(prompt)
    if text:
        return text

    steps = getattr(prompt, "steps", None)
    if isinstance(steps, list):
        for step in steps:
            text = _text_attr(step)
            if text:
                return text

    messages = getattr(prompt, "messages", None)
    if isinstance(messages, list):
        parts = [_text_attr(message) for message in messages]
        rendered = "\n\n".join(part for part in parts if part)
        if rendered:
            return rendered

    raise ValueError("LangSmith prompt must resolve to a text or chat prompt template")


def _text_attr(value: Any) -> str:
    for attr in ("template", "prompt"):
        text = getattr(value, attr, None)
        if isinstance(text, str) and text.strip():
            return text.strip()

    nested_prompt = getattr(value, "prompt", None)
    if nested_prompt is not value and nested_prompt is not None:
        text = _text_attr(nested_prompt)
        if text:
            return text

    return ""
