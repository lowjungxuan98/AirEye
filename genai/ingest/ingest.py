"""Build / refresh the Qdrant RAG collection from the seed corpus.

Usage (from the genai/ directory):

    python -m ingest.ingest                # ingest ./ingest/seed
    python -m ingest.ingest --seed-dir X   # ingest a custom directory

Embeddings are produced through LiteLLM using the fixed `GENAI_EMBED_MODEL`, so
the collection's vector space matches what the retrieve node queries at runtime.
"""

import argparse
import logging
import pathlib

from app.core.config import get_settings
from app.services.rag import make_embed_model, make_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest")

SEED_DIR = pathlib.Path(__file__).parent / "seed"
_TEXT_SUFFIXES = {".md", ".txt", ".json"}


def load_documents(seed_dir: pathlib.Path) -> list:
    from llama_index.core import Document

    documents = []
    for path in sorted(seed_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in _TEXT_SUFFIXES:
            documents.append(
                Document(
                    text=path.read_text(encoding="utf-8"),
                    metadata={"source": str(path.relative_to(seed_dir)), "type": "template"},
                )
            )
    return documents


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest the AirEye RAG seed corpus into Qdrant.")
    parser.add_argument("--seed-dir", default=str(SEED_DIR), help="Directory of template/example files.")
    args = parser.parse_args()

    settings = get_settings()
    documents = load_documents(pathlib.Path(args.seed_dir))
    if not documents:
        logger.warning("No seed documents found under %s — nothing to ingest.", args.seed_dir)
        return

    from llama_index.core import StorageContext, VectorStoreIndex

    storage_context = StorageContext.from_defaults(vector_store=make_vector_store(settings))
    VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        embed_model=make_embed_model(settings),
    )
    logger.info(
        "Ingested %d document(s) into Qdrant collection '%s'.",
        len(documents),
        settings.QDRANT_COLLECTION,
    )


if __name__ == "__main__":
    main()
