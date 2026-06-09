import logging

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import Settings

logger = logging.getLogger(__name__)

# `${provider}-${stage}` LiteLLM model ids — identical convention to the backend.
STAGE_IMAGE = "image"
STAGE_REASONING = "reasoning"

# NOTE: we intentionally do NOT send provider-specific params (e.g. GLM's
# `thinking`) from the client. LiteLLM rejects unknown params for some routes
# (e.g. GLM-5V-Turbo -> 400 UnsupportedParamsError). Provider quirks belong in
# the LiteLLM proxy config (`drop_params: true` or per-model params), which keeps
# this client provider-agnostic.


def build_model_id(provider: str, stage: str) -> str:
    return f"{provider}-{stage}"


# Markers in LiteLLM/provider 400 errors that mean "this param isn't supported"
# (e.g. gpt-5 rejecting a custom temperature). Used to trigger a param-less retry.
_UNSUPPORTED_PARAM_MARKERS = (
    "unsupportedparams",
    "does not support",
    "don't support",
    "support temperature",
    "only temperature",
    "unsupported parameter",
)


def _is_unsupported_param_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in _UNSUPPORTED_PARAM_MARKERS)


class LlmService:
    """Builds LangChain chat models pointed at the LiteLLM gateway.

    All model traffic (vision + reasoning) flows through LiteLLM, so provider
    routing, cost tracking and keys stay centralised — and the Langfuse callback
    handler (propagated via the graph config) traces every call automatically.
    """

    def __init__(self, settings: Settings):
        self._settings = settings

    def _chat(self, provider: str, stage: str, temperature: float, max_tokens: int, extra_body=None) -> ChatOpenAI:
        return ChatOpenAI(
            model=build_model_id(provider, stage),
            base_url=self._settings.LITELLM_BASE_URL,
            api_key=self._settings.LITELLM_API_KEY,
            temperature=temperature,
            max_tokens=max_tokens,
            extra_body=extra_body,
        )

    def invoke_vision(self, provider: str, messages: list[BaseMessage]) -> BaseMessage:
        return self._invoke(
            provider, STAGE_IMAGE,
            self._settings.VISION_TEMPERATURE, self._settings.VISION_MAX_TOKENS, messages,
        )

    def invoke_reasoning(self, provider: str, messages: list[BaseMessage]) -> BaseMessage:
        return self._invoke(
            provider, STAGE_REASONING,
            self._settings.REASONING_TEMPERATURE, self._settings.REASONING_MAX_TOKENS, messages,
        )

    def _invoke(self, provider: str, stage: str, temperature: float, max_tokens: int,
                messages: list[BaseMessage]) -> BaseMessage:
        """Invoke a model, retrying once without `temperature` if LiteLLM rejects it.

        Some models reject a custom temperature (e.g. gpt-5 allows only 1). Dropping
        it lets the model use its default so a provider switch doesn't break the run.
        Setting `drop_params: true` on the LiteLLM proxy handles this centrally too."""
        try:
            return self._chat(provider, stage, temperature, max_tokens).invoke(messages)
        except Exception as error:
            if not _is_unsupported_param_error(error):
                raise
            logger.warning(
                "LiteLLM rejected params for %s-%s (%s); retrying without temperature",
                provider, stage, str(error)[:140],
            )
            return self._chat(provider, stage, None, max_tokens).invoke(messages)


def vision_messages(prompt: str, image_url: str) -> list[BaseMessage]:
    return [
        HumanMessage(
            content=[
                {"type": "text", "text": prompt.rstrip()},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        )
    ]


def reasoning_messages(prompt: str, input_text: str) -> list[BaseMessage]:
    return [SystemMessage(content=prompt.rstrip()), HumanMessage(content=input_text)]


def message_text(message: BaseMessage) -> str:
    """Normalise assistant content to a trimmed string (parity with the backend's
    `normalizeAssistantContent`)."""
    content = message.content
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts).strip()
    return ""
