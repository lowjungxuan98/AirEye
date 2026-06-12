## AirEye GenAI Service (Python)

Isolated FastAPI service that runs the AirEye document-extraction workflow as a
**LangGraph** state machine: **LangChain** calls models through the existing
**LiteLLM** gateway, **LlamaIndex + Qdrant** provide RAG over output-format
templates, **Langfuse** manages the existing production prompts/traces, and
optional **LangSmith** support adds tracing, prompt pull, feedback, and offline
eval hooks.

The TypeScript backend calls this service over HTTP (`POST /v1/workflow/run`) from
its BullMQ worker. The service is stateless per request (except the Qdrant index);
the backend remains the system-of-record (S3, Firebase, FCM, provider state).

### Setup

```bash
cd genai
uv venv --python 3.12          # or: python3.12 -m venv .venv
uv pip install -e ".[dev]"     # or: .venv/bin/pip install -e ".[dev]"
cp .env.example .env           # fill in LiteLLM + Langfuse keys; add LangSmith later if used
```

### Run

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- `GET /health` — LiteLLM, Qdrant, Langfuse, and optional LangSmith readiness (`503` if required checks are not ok).
- `POST /v1/workflow/run` — body `{ "provider": "openai", "imageUrl": "https://.../upl_x.jpg" }`, header `x-api-key`. Returns `{ "extractedText": "...", "finalText": "...", "traceId": "..." }` when LangSmith tracing is enabled.
- `POST /v1/langsmith/feedback` — body `{ "traceId": "...", "key": "user_feedback", "score": 1, "comment": "..." }`, header `x-api-key`. Records LangSmith feedback when enabled.

### Seed the RAG corpus

```bash
.venv/bin/python -m ingest.ingest          # ingests ./ingest/seed into Qdrant
```

### Test

```bash
.venv/bin/python -m pytest -q
```

Tests mock LiteLLM / Langfuse / LangSmith / Qdrant, so no credentials or network are required.

### Environment

| Variable | Purpose |
|----------|---------|
| `GENAI_API_KEY` | Shared key required on `POST /v1/workflow/run` (matches the backend's `GENAI_API_KEY`). |
| `LITELLM_BASE_URL`, `LITELLM_API_KEY` | OpenAI-compatible gateway for vision, reasoning, and embeddings. |
| `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_LABEL` | Existing Langfuse prompt management + tracing. |
| `LANGFUSE_TRACING_ENABLED` | Toggle the Langfuse callback handler (default `true`). |
| `TOOL_REASONING_PROMPT_NAME` | Langfuse plan prompt name (default `tool-reasoning`). |
| `PROMPT_PROVIDER` | Prompt source: `langfuse` default, or `langsmith` after prompts are created there. |
| `LANGSMITH_ENABLED`, `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT` | Optional LangSmith setup. Leave disabled until the API key is available. |
| `LANGSMITH_TRACING_ENABLED`, `LANGSMITH_PROMPT_TAG`, `LANGSMITH_FEEDBACK_ENABLED`, `LANGSMITH_DATASET_NAME` | Optional LangSmith tracing, prompt version tag, feedback, and eval dataset controls. |
| `VISION_IMAGE_INLINE_ENABLED`, `VISION_IMAGE_MAX_LONG_EDGE`, `VISION_IMAGE_JPEG_QUALITY` | Download remote image URLs in GenAI, resize/compress, and send compact JPEG data URLs to the vision model. |
| `VISION_TRACE_IMAGE_INPUTS` | Defaults to `false`; keeps image URLs/base64 out of Langfuse/LangSmith callbacks. |
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
app/core/prompts/                Langfuse/LangSmith prompt fetch
app/core/observability/          Langfuse CallbackHandler + optional LangSmith integration
app/services/                    image_input.py (inline image prep), llm.py (LiteLLM), rag.py (LlamaIndex+Qdrant), workflow.py (runner)
app/api/v1/                      health.py, workflow.py
ingest/                          seed corpus + ingest CLI
```

See `docs/dependencies/genai-langgraph-implementation.md` for the architecture and rationale.
