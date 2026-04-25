# OpenAI-compatible LLM providers via OpenAI SDK - implementation notes

Grim uses one adapter implementation for all import LLM stages:

- image text extraction
- final text generation from the extracted text
- format guard pass over the final text

The backend uses the official `openai` Node SDK and selects an OpenAI-compatible provider at runtime.

## Current repo status

Implementation lives in `backend/src/libs/llm/text-processor.ts`, with runtime selection handled by `backend/src/libs/utils/provider_orchestrator.util.ts`.

Runtime composition happens in `backend/src/production.ts`.

Runtime provider switching uses provider-specific vars:

- `OPENAI_API_KEY` / `OPENAI_EXTRACT_MODEL` / `OPENAI_FINAL_MODEL` / `OPENAI_BASE_URL`
- `OPENROUTER_API_KEY` / `OPENROUTER_EXTRACT_MODEL` / `OPENROUTER_FINAL_MODEL` / `OPENROUTER_BASE_URL`
- `NVIDIA_API_KEY` / `NVIDIA_EXTRACT_MODEL` / `NVIDIA_FINAL_MODEL` / `NVIDIA_BASE_URL`

The active provider is stored in Realtime Database at `provider_state/current_provide` and is changed through `GET`/`PUT /api/v1/provider`.

The adapter uses the same SDK class for every provider:

```ts
new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {})
});
```

Current defaults:

- OpenRouter defaults to `https://openrouter.ai/api/v1` when a stage does not set `*_LLM_BASE_URL`
- OpenRouter defaults to `openrouter/free` when a stage does not set `*_LLM_MODEL`
- OpenAI uses the SDK default base URL when a stage does not set `*_LLM_BASE_URL`
- NVIDIA defaults to `https://integrate.api.nvidia.com/v1` for runtime provider switching; self-hosted NIM deployments can override this with `NVIDIA_BASE_URL`
- When both stages share a provider, shared `LLM_*` vars can provide defaults that each stage inherits

## Import pipeline fit

`ImportService` keeps provider details behind ports:

- `textExtractor.extractTextFromImage(...)`
- `finalTextBuilder.buildFinalText(...)`
- `finalTextFormatGuard.guardFinalText(...)`

The extract and final stages can be backed by different provider configs, but both use the same adapter class. The adapter returns opaque strings. The current prompts ask for structured JSON, but the HTTP API stores and returns `extractedText` and `finalText` as strings because model output format is prompt-controlled.

Pipeline order stays:

1. S3/MinIO image upload.
2. LLM image text extraction.
3. LLM final text generation.
4. LLM format guard pass.
5. Realtime Database write under `uploads/{id}`.
6. FCM success signals.

## Health check

`backend/src/api/v1/services/health.service.ts` checks both stage configs by building SDK clients from resolved env and calling `models.list()`.

The public health JSON reports this dependency under `llm`; that field is an aggregate over the extract and final stage configs.

## Notes

- `chat.completions.create(...)` remains the shared request path because it is supported across the current providers used by this repo.
- Keep API keys server-side only.
- Prefer changing provider config over adding provider-specific orchestration paths unless behavior genuinely diverges.

---

**Updated:** 2026-04-25
**Applies to:** grim backend (`backend/src/libs/llm/`, `backend/package.json` -> version `0.1.8`)
**Doc version:** 2
**Upstream refs:**
- https://platform.openai.com/docs/libraries/javascript
- https://openrouter.ai/docs/guides/community/openai-sdk
- https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html
- https://docs.nvidia.com/nim/vision-language-models/latest/api-reference.html
