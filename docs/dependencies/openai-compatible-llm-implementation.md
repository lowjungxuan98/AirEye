# LiteLLM-backed OpenAI-compatible LLM - implementation notes

Grim uses one adapter implementation for all import LLM stages:

- image text extraction
- final text generation from the extracted text
- format guard pass over the final text

The backend uses the official `openai` Node SDK against a LiteLLM proxy. Provider selection is dynamic: the backend discovers LiteLLM routes and treats a base provider as available only when both `<provider>-image` and `<provider>-reasoning` routes exist.

## Current repo status

Implementation lives in `backend/src/libs/llm/text-processor.ts`, route discovery lives in `backend/src/libs/llm/model-discovery.ts`, and runtime selection is handled by `backend/src/libs/utils/provider_orchestrator.util.ts`.

Runtime composition happens in `backend/src/production.ts`.

Runtime provider switching uses the LiteLLM proxy configuration:

- `LITELLM_BASE_URL`
- `LITELLM_API_KEY`
- optional `LLM_DEFAULT_PROVIDER`
- optional `LLM_PROVIDERS` compatibility fallback when the LiteLLM `/models` endpoint is unavailable

There are no backend env vars for individual provider API keys or stage models. LiteLLM owns those routes. The active provider is stored in Realtime Database at `provider_state/current_provide` and is changed through `GET`/`PUT /api/v1/provider`.

The adapter uses one SDK client for every stage:

```ts
new OpenAI({
  apiKey: env.LLM_API_KEY,
  baseURL: env.LLM_BASE_URL
});
```

Model names are derived from the selected provider:

- image extraction: `<provider>-image`
- final generation and format guard: `<provider>-reasoning`

If no provider state exists yet, `LLM_DEFAULT_PROVIDER` is used when LiteLLM exposes both required routes for it. Otherwise the first complete provider discovered from LiteLLM becomes the initial provider. If LiteLLM model discovery is unavailable and `LLM_PROVIDERS` is set, the backend uses that comma-separated list as a compatibility fallback.

## Import pipeline fit

`ImportService` keeps provider details behind ports:

- `textExtractor.extractTextFromImage(...)`
- `finalTextBuilder.buildFinalText(...)`
- `finalTextFormatGuard.guardFinalText(...)`

The extract and reasoning stages use different LiteLLM model routes for the selected provider. The adapter returns opaque strings. The current prompts ask for structured JSON, but the HTTP API stores and returns `extractedText` and `finalText` as strings because model output format is prompt-controlled.

Pipeline order stays:

1. S3/MinIO image upload.
2. Realtime Database pending write under `uploads/{id}`.
3. FCM receiver refresh signal.
4. LLM image text extraction.
5. LLM final text generation.
6. LLM format guard pass.
7. Realtime Database final update under `uploads/{id}`.
8. FCM receiver refresh signal on success.

## Health check

`backend/src/api/v1/services/health.service.ts` checks the LiteLLM proxy by building the SDK client from `LITELLM_BASE_URL` / `LITELLM_API_KEY` and calling `models.list()`.

The public health JSON reports this dependency under `llm`.

## Notes

- `chat.completions.create(...)` remains the shared request path for all stages.
- Keep API keys server-side only.
- Prefer changing LiteLLM route config over adding provider-specific backend branches unless behavior genuinely diverges.

---

**Updated:** 2026-05-18
**Applies to:** grim backend (`backend/src/libs/llm/`, `backend/package.json` -> version `0.2.6`)
**Doc version:** 3
**Upstream refs:**
- https://platform.openai.com/docs/libraries/javascript
- https://docs.litellm.ai/
