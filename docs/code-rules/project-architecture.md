# Project architecture (backend)

This document describes the **current** Grim backend layout under `backend/src/` as of the code-rules refresh. It is not a target design for unbuilt features.

## Entry points

- **`server.ts`** — loads environment (`loadServerEnv` from `libs/configs/env.config.ts`), builds production instances (local `createProductionDependencies`), calls `createApp(...)`, starts HTTP.
- **`app.ts`** — `createApp(deps)` returns a configured Express app: OpenAPI static file, Scalar docs, `/api/v1` router (health, import, capture, export, prompts), legacy health alias, global error handler. Exports `AppDependencies`.

There is **no** separate `dependencies.ts`; composition for production lives next to startup in `server.ts`.

## HTTP API (`api/v1/`)

| Layer | Role | Examples (existing files) |
|--------|------|---------------------------|
| **`model/`** | Request/response shapes, persistence row types, shared port interfaces | `import.model.ts`, `capture.model.ts`, `export.model.ts`, `health.model.ts`, `services.model.ts` |
| **`services/`** | Use cases / orchestration | `import.service.ts`, `capture.service.ts`, `export.service.ts`, `health.service.ts` |
| **`controllers/`** | Map HTTP → service calls (thin) | `import.controller.ts`, `capture.controller.ts`, `export.controller.ts`, `health.controller.ts` |
| **`routes/`** | Routers, middleware per route (e.g. multer on import) | `health.route.ts`, `import.route.ts`, `capture.route.ts`, `export.route.ts`, `prompts.route.ts` |

**Mounted paths today (from `app.ts`):**

- `GET /api/v1/health` — via `createHealthRouter` under `/api/v1`.
- `GET /health` — legacy compatibility alias for local/old callers.
- `GET /openapi.yaml`, `GET /docs`, `GET /docs/` — defined in `app.ts`.
- `POST /api/v1/import`, `POST /api/v1/capture`, `GET /api/v1/export`, `GET /api/v1/prompts`, `PUT /api/v1/prompts` — under `express.Router()` mounted at `/api/v1`.

## Libraries (`libs/`)

| Area | Path | Purpose (as implemented) |
|------|------|----------------------------|
| Firebase | `libs/firebase/admin.ts` | Admin app init from env |
| | `libs/firebase/realtime.ts` | `getRealtimeDb`, `FirebaseUploadRepository` |
| | `libs/firebase/fcm.ts` | `FirebaseNotifier`, default topic constant |
| LLM | `libs/llm/text-processor.ts` | OpenAI-compatible image extraction and final text |
| S3 / MinIO | `libs/s3/s3.util.ts` | Bucket readiness, image upload, presigned URL generation |
| Config | `libs/configs/env.config.ts` | `ServerEnv`, `loadServerEnv` |
| Constants | `libs/constants/limits.contant.ts` | Export/import size limits (filename is spelled **`contant`** in the repo) |
| Utils | `libs/utils/http.util.ts` | `wrapAsync`, `mapRequestError` |
| | `libs/utils/api-error.util.ts` | `ApiError` |
| | `libs/utils/notification.util.ts` | Shared FCM message construction for silent sender/receiver role flags |
| | `libs/utils/sort-by-created-at.util.ts` | `sortByCreatedAtDesc` (used by Realtime repo + in-memory test repo) |

**Dependency direction (actual imports):** `libs/*` imports types and ports from `api/v1/model/*` where those contracts are defined (e.g. `UploadRepository`, `ImageStorage`). There is no separate `src/domain/` or `src/errors/` folder today.

## Spec and tests (outside `src/`)

- **`backend/openapi.yaml`** — HTTP contract referenced by Scalar and tests.
- **`backend/test/`** — Vitest + Supertest. **`test/setup-env.ts`** loads **`backend/.env`** before any test file. Root tests build **`createApp`** with in-memory repositories and doubles from **`test/test-utils.ts`** / **`test/in-memory-upload-repository.ts`**. **`test/unit-test/libs/**`** mirrors **`src/libs/**`** and runs adapter checks against S3/MinIO, Firebase, and the configured LLM provider where applicable; rules and prerequisites are in **`docs/code-rules/unit-test-rules.md`** and **`backend/README.md`** → **Testing**.

## Vendor integration write-ups

- **`docs/dependencies/`** — S3/MinIO, OpenAI-compatible LLM provider, Scalar, Firebase implementation notes (`README.md` indexes the folder).

## What this document does not cover

- Mobile app layout, CI pipelines, deployment topology, or cloud account setup unless described elsewhere in `docs/`.

---

**Updated:** 2026-04-25
**Applies to:** grim backend architecture (`backend/src/`, `backend/package.json` -> version `0.1.8`)
**Doc version:** 5
