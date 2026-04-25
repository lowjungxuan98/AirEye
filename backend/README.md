## Backend (TypeScript)

Express backend for Grim's async import/export pipeline.

### Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Server runs on `PORT` (default `3001`).

### Testing

```bash
npm test
```

Vitest loads **`backend/.env` first** (`test/setup-env.ts`). **Configure `.env` before you run tests** (same steps as [Setup](#setup): copy `.env.example` to `.env` and fill every required value). Several suites exercise S3 (MinIO-compatible), Firebase Admin (Realtime Database and FCM topic messaging), and the configured OpenAI-compatible LLM provider against your real credentials; without a complete `.env`, those tests will fail with authentication or network errors from the vendors. **Library integration tests** under **`test/unit-test/libs/`** do not mock storage or the database—they create real rows/uploads and **must delete that test data** (see **`docs/code-rules/unit-test-rules.md`**).

Required environment variables:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_REGION`
- `S3_BUCKET_DEVELOPMENT`
- `S3_BUCKET_PRODUCTION`
- `S3_BUCKET_TESTING`
- `S3_PRESIGN_TTL_SECONDS`
- Firebase Admin credentials: set either `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- At least one provider key/model group: `OPENAI_*`, `OPENROUTER_*`, or `NVIDIA_*`

Optional:

- Provider config: `OPENROUTER_API_KEY` / `OPENROUTER_EXTRACT_MODEL` / `OPENROUTER_FINAL_MODEL` / `OPENROUTER_BASE_URL`, `OPENAI_API_KEY` / `OPENAI_EXTRACT_MODEL` / `OPENAI_FINAL_MODEL` / `OPENAI_BASE_URL`, and `NVIDIA_API_KEY` / `NVIDIA_EXTRACT_MODEL` / `NVIDIA_FINAL_MODEL` / `NVIDIA_BASE_URL`. OpenRouter defaults to `https://openrouter.ai/api/v1`, OpenAI uses the SDK default when `OPENAI_BASE_URL` is blank, and NVIDIA defaults to `https://integrate.api.nvidia.com/v1`.
- `GRIM_FCM_TOPIC` — FCM topic for capture/import signals (default `grim_new_result`)
- `GRIM_PROMPTS_DIR` — directory for `extract_text_prompt.txt`, `analyzing_text_prompt.txt`, and `format_guard_prompt.txt`
- `GRIM_PROMPT_ADMIN_SECRET` — requires `X-Grim-Prompt-Secret` on prompt reads/writes when set

### API

- `GET /docs` — Scalar API Reference UI (loads `openapi.yaml` from this server)
- `GET /openapi.yaml` — OpenAPI 3 spec (health, import, capture, export, prompts, provider)
- `GET /health`
  - integration checks (Firebase Realtime Database, extract/final LLM configs aggregated under `llm`, S3); **200** or **503**; JSON matches OpenAPI schema `IntegrationHealthReport` with top-level keys `ok`, `firebase`, `llm`, and `s3`
- `POST /api/v1/capture`
  - receiver-triggered capture request
  - sends a silent FCM topic data message to sender devices: `kind: capture_request`, `notificationType: silent`, `role: sender`
  - returns `{ "ok": true }` after Firebase accepts the send request
- `POST /api/v1/import`
  - accepts `multipart/form-data` with exactly one file part named **`image`** (e.g. `<input name="image" type="file">`)
  - **curl:** use **`-F` / `--form`** and **do not** set `Content-Type` yourself — curl must add `boundary=…`. Use one part type, e.g. **`-F 'image=@photo.jpg;type=image/jpeg'`** (not a comma-separated list of MIME types)
  - **Scalar:** if “Try it” fails, remove a manual **`Content-Type: multipart/form-data`** header so the UI can send a proper boundary
  - stores the image in S3/MinIO with `ContentType` metadata and a MIME-derived key extension such as `.jpg`
  - returns **200** `text/event-stream` (SSE): status events, then terminal JSON (success row or `error`)
  - on success, writes the row to Realtime Database, then sends two receiver FCM signals on topic `grim_new_result` (or `GRIM_FCM_TOPIC`): visible `kind: new_result` and silent `kind: export_refresh` with `url: /api/v1/export?page=1&limit=20`
- `GET /api/v1/export`
  - optional `page` (default 1), optional `limit` (default 20, max 50)
  - returns `200` paginated JSON (`data`, `page`, `limit`, `is_next`); newest first by `createdAt`; completed rows add `finalText`, `imageUrl`, `updatedAt`; failed rows add `errorMessage`, `updatedAt`
- `GET /api/v1/prompts`, `PUT /api/v1/prompts` — read or overwrite extract, analyzing, and format guard prompt templates (`backend/prompts/*.txt` by default; optional `GRIM_PROMPTS_DIR`, `GRIM_PROMPT_ADMIN_SECRET`). **PUT** accepts **`multipart/form-data`** with file or text fields **`extract_text`**, **`analyzing_text`**, and **`format_guard`**, or **`application/json`** with **`extractTextPrompt`**, **`analyzingTextPrompt`**, and **`formatGuardPrompt`**.
- `GET /api/v1/provider`, `PUT /api/v1/provider` — read or switch the active LLM provider. State is stored in Realtime Database at `provider_state/current_provide`; accepted values are `openrouter`, `openai`, and `nvidia_nim`.

### Docs

Reference docs used to design the current implementation and future follow-up work:

- **`docs/dependencies/`** — vendor integration notes (S3/MinIO, OpenAI-compatible LLM providers via the OpenAI SDK, Scalar, Firebase); start at [`docs/dependencies/README.md`](../docs/dependencies/README.md).
- Repository **`docs/`** (top level): `workflow.md` (target end-to-end backend flow), `specification.md`, `testing-plan.md`, plus `code-rules/`, `instructions/`, `design/`.

The v1 backend wires S3 (MinIO-compatible), Firebase Admin / Realtime Database / FCM, and one OpenAI-compatible adapter class into **`backend/src/`**. The extract and final-text stages can use separate per-provider model env vars such as `OPENAI_EXTRACT_MODEL` and `OPENAI_FINAL_MODEL`; shared `LLM_*` vars are still supported as defaults, and legacy OpenRouter env aliases remain accepted for compatibility. Current supported providers are OpenRouter, OpenAI, and NVIDIA NIM. Optional **`SCALAR_DOCS_URL`** only logs a link if you publish docs elsewhere; local Scalar UI is always **`/docs`** when the server runs.

### GitHub Actions / GHCR

This repo includes **`.github/workflows/publish-backend-image.yml`** to build the **`backend/`** Docker image and publish it to GitHub Packages / GitHub Container Registry.

Published image:

- `ghcr.io/<owner>/<repo>/backend`

Version tags:

- Pushing to `main` publishes `latest`, `main`, and `sha-<commit>`.
- Pushing a Git tag like `v1.2.3` publishes `1.2.3`, `1.2`, and `sha-<commit>`.
- Manual `workflow_dispatch` builds are supported from GitHub Actions.

The workflow uses the built-in `GITHUB_TOKEN`; no external deployment token is required to publish the image. Runtime configuration still comes from the environment where the container is deployed.

Local image build:

```bash
cd backend
docker build -t grim-backend:local .
docker run --rm -p 3001:3001 --env-file .env grim-backend:local
```

---

**Updated:** 2026-04-25
**Applies to:** grim backend (`backend/package.json` -> version `0.1.7`)
**Doc version:** 7
