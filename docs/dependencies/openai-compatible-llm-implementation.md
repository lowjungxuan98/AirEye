# LiteLLM And Langfuse Workflow Notes

AirEye uses Langfuse for prompt text and LiteLLM for model execution.

## Current Repo Status

- `backend/src/libs/langfuse/client.ts` fetches text prompts and lists prompt metadata.
- `backend/src/libs/litellm/client.ts` discovers provider routes and runs vision/reasoning calls through the OpenAI-compatible SDK.
- `backend/src/libs/workflow/tool-reasoning.ts` fetches the planning prompt and parses ordered workflow steps.
- `backend/src/libs/workflow/step-executor.ts` loads each step prompt and runs the selected step model.
- Runtime composition happens in `backend/src/production.ts`.

Runtime configuration:

- `LITELLM_BASE_URL`
- `LITELLM_API_KEY`
- `LANGFUSE_BASE_URL`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_LABEL`
- `TOOL_REASONING_PROMPT_NAME`

There are no backend env vars for individual provider API keys or local prompt files. LiteLLM owns provider routes. Langfuse owns prompt text.

## Model Routing

Provider selection is dynamic. The backend discovers LiteLLM routes and treats a base provider as available only when both routes exist:

- vision step: `<provider>-image`
- reasoning step: `<provider>-reasoning`

If no provider state exists yet, the first complete provider discovered from LiteLLM becomes the initial provider. The active provider is stored in Realtime Database at `provider_state/current_provide` and is changed through `GET`/`PUT /api/v1/provider`.

## Workflow Fit

The document image workflow is prompt-configured:

1. S3/MinIO image upload.
2. Realtime Database pending write under `uploads/{id}`.
3. FCM receiver refresh signal.
4. Langfuse tool-reasoning prompt returns ordered workflow steps.
5. Each workflow step loads its Langfuse prompt.
6. LiteLLM runs a vision step against the image URL or a reasoning step against the previous step output.
7. Realtime Database final update under `uploads/{id}`.
8. FCM receiver refresh signal on success.

The adapter returns opaque strings. The HTTP API stores and returns `extractedText` and `finalText` as strings because output format is prompt-controlled.

## Health Check

`backend/src/api/v1/services/health.service.ts` checks the LiteLLM proxy by calling the model discovery endpoint with `LITELLM_BASE_URL` / `LITELLM_API_KEY`. The public health JSON reports this dependency under `llm`.

## Notes

- `chat.completions.create(...)` remains the shared request path for model calls.
- Keep API keys server-side only.
- Prefer changing LiteLLM route config or Langfuse prompts over adding provider-specific backend branches unless behavior genuinely diverges.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend (`backend/src/libs/litellm/`, `backend/src/libs/langfuse/`, `backend/src/libs/workflow/`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 4
