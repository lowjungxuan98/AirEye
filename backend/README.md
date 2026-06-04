## AirEye Backend (TypeScript)

Express backend for the AirEye prompt-driven document image workflow: capture a document image, run a prompt-configured workflow, and return normalized output.

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

Vitest loads `backend/.env` first (`test/setup-env.ts`). Configure `.env` before running tests: several suites exercise S3-compatible storage, Firebase Admin, FCM topic messaging, and configured LiteLLM/Langfuse integrations against real credentials. Without a complete `.env`, those tests can fail with vendor authentication or network errors.

Required environment variables:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_REGION`
- `S3_BUCKET_DEVELOPMENT`
- `S3_BUCKET_PRODUCTION`
- `S3_BUCKET_TESTING`
- `S3_PRESIGN_TTL_SECONDS`
- `REDIS_URL` - Redis connection URL for the BullMQ import/regenerate serialization queue
- Firebase Admin credentials: set either `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_URL`
- `LITELLM_BASE_URL`
- `LITELLM_API_KEY`
- `LANGFUSE_BASE_URL`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`

Optional:

- `AIREYE_FCM_TOPIC` - FCM topic for sender capture requests and receiver import refresh signals
- `LANGFUSE_LABEL` - prompt label used for workflow prompts, default `production`
- `TOOL_REASONING_PROMPT_NAME` - Langfuse prompt that returns workflow steps, default `tool-reasoning`
- `SCALAR_DOCS_URL` - optional published docs URL logged at startup

The FCM topic resolves from `AIREYE_FCM_TOPIC`, then falls back to the AirEye default `aireye_new_result`.

### API

- `GET /docs` - Scalar API Reference UI
- `GET /openapi.yaml` - OpenAPI 3 spec
- `GET /api/v1/health` - Firebase, LiteLLM, and S3 readiness
- `POST /api/v1/send-notification` - sends a silent sender capture request through FCM
- `POST /api/v1/import` - accepts one multipart `image` file, stores it, creates a pending export row, and returns a queued job id
- `POST /api/v1/regenerate` - queues the workflow for an existing image URL and export row
- `GET /api/v1/export` - returns paginated newest-first export rows
- `GET /api/v1/provider`, `PUT /api/v1/provider` - reads or switches the active LiteLLM provider

Workflow prompts are managed in Langfuse, not local prompt files or HTTP prompt routes. The tool-reasoning prompt returns ordered workflow steps. Each workflow step references a Langfuse prompt and chooses either a vision step or reasoning step. Import and regenerate work is serialized through BullMQ on Redis after the HTTP request returns `202`.

### Docs

- `docs/workflow.md` - capture a document image -> run a prompt-configured workflow -> return normalized output
- `docs/specification.md` - API summary
- `docs/dependencies/` - vendor integration notes

The v1 backend wires S3-compatible storage, Firebase Admin / Realtime Database / FCM, Langfuse, and LiteLLM into `backend/src/`. LiteLLM uses `<provider>-image` for vision steps and `<provider>-reasoning` for reasoning steps.

### GitHub Actions / GHCR

This repo includes `.github/workflows/publish-backend-image.yml` to build the `backend/` Docker image and publish it to GitHub Packages / GitHub Container Registry.

Published image:

- `ghcr.io/<owner>/<repo>/backend`

Local image build:

```bash
cd backend
docker build -t aireye-backend:local .
docker run --rm -p 3001:3001 --env-file .env aireye-backend:local
```

---

**Updated:** 2026-06-03
**Applies to:** AirEye backend (`backend/package.json` -> version `0.2.14`)
**Doc version:** 10
