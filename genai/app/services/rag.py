import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)


def make_embed_model(settings: Settings):
    """Fixed embedding model routed through LiteLLM. Kept independent of the
    switchable vision/reasoning provider so the Qdrant vector space stays stable."""
    from llama_index.embeddings.openai import OpenAIEmbedding

    return OpenAIEmbedding(
        model=settings.GENAI_EMBED_MODEL,
        api_base=settings.LITELLM_BASE_URL,
        api_key=settings.LITELLM_API_KEY,
    )


def make_qdrant_client(settings: Settings):
    from qdrant_client import QdrantClient

    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def make_vector_store(settings: Settings, client=None):
    from llama_index.vector_stores.qdrant import QdrantVectorStore

    return QdrantVectorStore(
        client=client or make_qdrant_client(settings),
        collection_name=settings.QDRANT_COLLECTION,
    )


class RagService:
    """LlamaIndex retriever over Qdrant. Lazily initialised so the service boots
    even when Qdrant is unreachable; retrieval failures degrade to no context
    rather than failing the workflow."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._retriever = None
        self._initialized = False

    def _ensure(self) -> None:
        if self._initialized:
            return
        from llama_index.core import VectorStoreIndex

        vector_store = make_vector_store(self._settings)
        index = VectorStoreIndex.from_vector_store(
            vector_store,
            embed_model=make_embed_model(self._settings),
        )
        self._retriever = index.as_retriever(similarity_top_k=self._settings.RAG_TOP_K)
        self._initialized = True

    def retrieve(self, query: str) -> str:
        if not query or not query.strip():
            return ""
        try:
            self._ensure()
            nodes = self._retriever.retrieve(query)
        except Exception as error:  # noqa: BLE001 — RAG is best-effort context
            logger.warning("RAG retrieve failed (%s); continuing without context", error)
            return ""

        blocks: list[str] = []
        for node in nodes:
            text = node.get_content().strip()
            if text:
                blocks.append(text)
        return "\n\n---\n\n".join(blocks)
