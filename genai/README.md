## AirEye GenAI Service (Python)

Isolated FastAPI service that runs the AirEye document-extraction workflow as a
**LangGraph** state machine: **LangChain** calls models through the existing
**LiteLLM** gateway, **LlamaIndex + Qdrant** provide RAG over output-format
templates, and **Langfuse** manages prompts and traces the whole run.

The TypeScript backend calls this service over HTTP (`POST /v1/workflow/run`) from
its BullMQ worker. The service is stateless per request (except the Qdrant index);
the backend remains the system-of-record (S3, Firebase, FCM, provider state).

### Setup

```bash
cd genai
uv venv --python 3.12          # or: python3.12 -m venv .venv
uv pip install -e ".[dev]"     # or: .venv/bin/pip install -e ".[dev]"
cp .env.example .env           # fill in LiteLLM + Langfuse keys
```

### Run

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- `GET /health` — LiteLLM, Qdrant, and Langfuse readiness (`503` if not ok).
- `POST /v1/workflow/run` — body `{ "provider": "openai", "imageUrl": "https://.../upl_x.jpg" }`, header `x-api-key`. Returns `{ "extractedText": "...", "finalText": "..." }`.

### Seed the RAG corpus

```bash
.venv/bin/python -m ingest.ingest          # ingests ./ingest/seed into Qdrant
```

### Test

```bash
.venv/bin/python -m pytest -q
```

Tests mock LiteLLM / Langfuse / Qdrant, so no credentials or network are required.

### Environment

| Variable | Purpose |
|----------|---------|
| `GENAI_API_KEY` | Shared key required on `POST /v1/workflow/run` (matches the backend's `GENAI_API_KEY`). |
| `LITELLM_BASE_URL`, `LITELLM_API_KEY` | OpenAI-compatible gateway for vision, reasoning, and embeddings. |
| `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_LABEL` | Prompt management + tracing. |
| `LANGFUSE_TRACING_ENABLED` | Toggle the Langfuse callback handler (default `true`). |
| `TOOL_REASONING_PROMPT_NAME` | Langfuse plan prompt name (default `tool-reasoning`). |
| `RAG_ENABLED` | Toggle the LlamaIndex retrieve node (default `true`). |
| `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION` | Qdrant vector store. |
| `GENAI_EMBED_MODEL` | Fixed embedding model id registered in LiteLLM (default `text-embedding-3-small`). |
| `RAG_TOP_K` | Number of templates/examples to retrieve (default `3`). |

### Layout

```
app/main.py                      FastAPI app + exception handlers
app/core/config.py               pydantic-settings configuration
app/core/security.py             x-api-key dependency
app/core/langgraph/              state.py, nodes.py, graph.py (plan→extract→retrieve→normalize→finalize)
app/core/prompts/                Langfuse prompt fetch
app/core/observability/          Langfuse client + CallbackHandler
app/services/                    llm.py (LiteLLM), rag.py (LlamaIndex+Qdrant), workflow.py (runner)
app/api/v1/                      health.py, workflow.py
ingest/                          seed corpus + ingest CLI
```

See `docs/dependencies/genai-langgraph-implementation.md` for the architecture and rationale.
