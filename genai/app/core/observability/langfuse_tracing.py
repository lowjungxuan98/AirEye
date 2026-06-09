import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)

_initialized = False


def init_langfuse(settings: Settings) -> None:
    """Initialise the Langfuse singleton when credentials are present.

    The client is needed for prompt management regardless of tracing; the
    callback handler (see `make_callback_handler`) is what records traces.
    """
    global _initialized
    if not settings.langfuse_configured:
        logger.warning("Langfuse keys not set — prompt fetch and tracing are disabled.")
        return
    from langfuse import Langfuse

    Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=settings.LANGFUSE_BASE_URL,
    )
    _initialized = True


def langfuse_ready() -> bool:
    return _initialized


def make_callback_handler(settings: Settings):
    """Return a Langfuse CallbackHandler, or None when tracing is off/unconfigured.

    Attached to the graph via `config={"callbacks": [handler]}`; LangGraph then
    propagates it to every nested LangChain model call automatically.
    """
    if not (_initialized and settings.LANGFUSE_TRACING_ENABLED):
        return None
    from langfuse.langchain import CallbackHandler

    return CallbackHandler()
