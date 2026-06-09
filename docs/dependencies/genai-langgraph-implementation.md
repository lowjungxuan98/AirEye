# GenAI Service: LangGraph + LangChain + LlamaIndex Notes

AirEye runs its document-extraction workflow in an isolated Python service
(`genai/`) so it can use the Python-only GenAI ecosystem while the TypeScript
backend keeps owning storage, notifications, queueing and provider state.

The service composes five tools, each for its strength:

- **LangGraph** — deterministic `StateGraph` orchestration of the workflow.
- **LangChain** (`langchain-openai`) — model calls (`ChatOpenAI`).
- **LiteLLM** — the OpenAI-compatible gateway for *all* model traffic (vision, reasoning, embeddings).
- **LlamaIndex + Qdrant** — RAG retrieval of output-format templates / few-shot examples.
- **Langfuse** — prompt management (shared with the backend) and full-run tracing.

## Why this shape

- **LangGraph orchestrates, LlamaIndex retrieves.** This is the recognised 2026 pattern: each framework is used for its strength and composed (the LlamaIndex retriever is invoked inside a LangGraph node). See sources below.
- **Deterministic graph, not a ReAct agent.** Document extraction needs repeatable, inspectable steps. Explicit nodes (`plan → vision-extract → retrieve → normalize → finalize`) keep parity with the backend's previous pipeline and produce clean traces.
- **LiteLLM stays the single gateway.** Provider routing, cost tracking and keys stay centralised; the service holds no provider API keys. Vision/reasoning use the same `<provider>-image` / `<provider>-reasoning` ids the backend already discovers.
- **Embeddings use a fixed model.** `GENAI_EMBED_MODEL` is decoupled from the switchable vision/reasoning provider, because vector spaces are not comparable across embedding models — switching providers must not invalidate the Qdrant index.
- **Langfuse `CallbackHandler` traces the whole graph in one line**, capturing nested model spans, token usage and latency. (The TypeScript `LiteLlmClient` does not trace model calls, so this closes a gap.)

## Current Repo Status

- `genai/app/core/langgraph/` — `state.py`, `nodes.py`, `graph.py` define the workflow graph.
- `genai/app/services/llm.py` — builds `ChatOpenAI` against LiteLLM (`<provider>-image`, `<provider>-reasoning`).
- `genai/app/services/rag.py` — LlamaIndex `VectorStoreIndex` over Qdrant with a LiteLLM embedding model.
- `genai/app/core/prompts/langfuse_prompts.py` — fetches text prompts from Langfuse (same prompts as the backend).
- `genai/app/core/observability/langfuse_tracing.py` — Langfuse client + `CallbackHandler`.
- `genai/app/api/v1/` — `health.py`, `workflow.py`.
- `genai/ingest/` — seed corpus + `python -m ingest.ingest`.
- Backend side: `backend/src/libs/agent/` (HTTP client implementing the `WorkflowRunner` port), wired in `backend/src/production.ts` and selected in `backend/src/api/v1/services/import.service.ts`.

## The Graph

```
plan ──► vision-extract ──► retrieve (RAG) ──► normalize ──► finalize
```

1. **plan** — fetch the Langfuse `tool-reasoning` prompt, run a vision call, parse a JSON plan `{ steps: [{ prompt, model }] }` (same parsing rules as the backend's `parseSteps`).
2. **vision-extract** — run step 0 (always a vision step) → `extracted_text`.
3. **retrieve** — embed `extracted_text` via LiteLLM, query Qdrant for relevant templates/examples (no-op when `RAG_ENABLED=false` or Qdrant is unreachable — RAG is best-effort and never fails the run).
4. **normalize** — run the remaining steps; reasoning steps get the retrieved templates injected into their prompt to keep output consistent.
5. **finalize** — `extractedText = outputs[0]`, `finalText = outputs[-1]`.

## Model Routing

Identical convention to the backend. The `provider` is supplied by the backend
(which owns provider state); the service never reads it. Vision forwards the
presigned S3 image URL as `image_url` (no image bytes leave the backend's storage).

| Stage | Model id | Notes |
|-------|----------|-------|
| Vision | `<provider>-image` | temperature `0` (provider-specific params like GLM's `thinking` are handled in LiteLLM, not the client) |
| Reasoning | `<provider>-reasoning` | temperature `0.15` |
| Embeddings | `GENAI_EMBED_MODEL` (fixed) | OpenAI-compatible `/embeddings` via LiteLLM |

If a model rejects a standard param (e.g. gpt-5 allows only `temperature=1`), the client retries the call once **without `temperature`** so a provider switch doesn't break the run. Setting `drop_params: true` on the LiteLLM proxy is the recommended belt-and-suspenders that handles this (and any future param) centrally.

## HTTP Contract

- `POST /v1/workflow/run` — header `x-api-key`; body `{ provider, imageUrl, kind? }`; returns `{ extractedText, finalText, steps?, traceId? }`.
- `GET /health` — `{ ok, litellm, qdrant, langfuse }`; `200` when ok, `503` otherwise.

## Backend Integration (strangler-fig)

`ImportService.runLlmPipeline` selects the engine via `WORKFLOW_ENGINE`:

- `genai` (default) → `AgentWorkflowClient.run(...)` calls this service.
- `typescript` → the in-process `ToolReasoning` + `StepExecutor` fallback.

The HTTP contract mirrors the old pipeline's `{ extractedText, finalText }`, so the
swap is drop-in and instantly reversible. `GET /api/v1/health` reports the service
under `genai`.

## Prerequisites

- A LiteLLM embedding model registered and exposed as `GENAI_EMBED_MODEL`.
- The existing Langfuse `tool-reasoning` and per-step prompts (reused unchanged).
- A reachable Qdrant instance (provided by the root `docker-compose.yml` locally).

## Sources

- Langfuse LangChain/LangGraph tracing: https://langfuse.com/integrations/frameworks/langchain
- Langfuse LangGraph cookbook: https://langfuse.com/guides/cookbook/integration_langgraph
- LangGraph + LlamaIndex composition: https://contracollective.com/blog/langchain-vs-llamaindex-llm-orchestration-2026
- LiteLLM with LangChain/LlamaIndex: https://docs.litellm.ai/docs/proxy/user_keys
- FastAPI + LangGraph production layout: https://github.com/wassim249/fastapi-langgraph-agent-production-ready-template

---

**Updated:** 2026-06-10
**Applies to:** AirEye GenAI service (`genai/`) and backend `libs/agent` (`backend/package.json` -> version `0.2.15`)
**Doc version:** 1
