# Project Architecture (Backend)

This document describes the current AirEye backend layout under `backend/src/`.

## Entry Points

- `server.ts` - loads environment, builds production instances, calls `createApp(...)`, starts HTTP.
- `production.ts` - composes Firebase, S3, Langfuse, LiteLLM, workflow, and service instances.
- `app.ts` - returns a configured Express app: OpenAPI static file, Scalar docs, `/api/v1` router, legacy health alias, and global error handler.

## HTTP API (`api/v1/`)

| Layer | Role | Files |
|--------|------|-------|
| `model/` | Request/response shapes, persistence row types, shared port interfaces | `import.model.ts`, `send-notification.model.ts`, `export.model.ts`, `health.model.ts`, `services.model.ts` |
| `services/` | Use cases and orchestration | `import.service.ts`, `send-notification.service.ts`, `export.service.ts`, `health.service.ts` |
| `controllers/` | Thin HTTP to service mapping | `import.controller.ts`, `regenerate.controller.ts`, `send-notification.controller.ts`, `export.controller.ts`, `health.controller.ts`, `provider.controller.ts` |
| `routes/` | Routers and per-route middleware | `health.route.ts`, `import.route.ts`, `regenerate.route.ts`, `send-notification.route.ts`, `export.route.ts`, `provider.route.ts` |

Mounted paths:

- `GET /api/v1/health`
- `GET /health` - legacy compatibility alias
- `GET /openapi.yaml`, `GET /docs`, `GET /docs/`
- `POST /api/v1/import`
- `POST /api/v1/regenerate`
- `POST /api/v1/send-notification`
- `GET /api/v1/export`
- `GET /api/v1/provider`, `PUT /api/v1/provider`

## Libraries (`libs/`)

| Area | Path | Purpose |
|------|------|---------|
| Firebase | `libs/firebase/admin.ts` | Admin app init from env |
| | `libs/firebase/realtime.ts` | Realtime Database repositories |
| | `libs/firebase/constants.ts` | FCM constants |
| | `libs/firebase/type.ts` | FCM payload types |
| | `libs/firebase/endpoint.ts` | FCM message construction |
| | `libs/firebase/client.ts` | `FirebaseNotifier` |
| | `libs/firebase/export.ts` | Public Firebase module exports |
| Langfuse | `libs/langfuse/client.ts` | Prompt fetch/list wrapper |
| LiteLLM | `libs/litellm/client.ts` | Provider discovery and OpenAI-compatible model calls |
| Workflow | `libs/workflow/tool-reasoning.ts` | Prompt-configured workflow planning |
| | `libs/workflow/step-executor.ts` | Workflow step execution |
| S3 / MinIO | `libs/s3/client.ts` | Bucket readiness, image upload, presigned URL generation |
| Config | `libs/configs/env.config.ts` | `ServerEnv`, `loadServerEnv`, topic/bucket resolution |
| Constants | `libs/constants/limits.contant.ts` | Export/import size limits (filename is spelled `contant` in the repo) |
| Utils | `libs/utils/http.util.ts` | `wrapAsync`, `mapRequestError` |
| | `libs/utils/api-error.util.ts` | `ApiError` |
| | `libs/utils/sort-by-created-at.util.ts` | `sortByCreatedAtDesc` |

`libs/*` imports types and ports from `api/v1/model/*` where those contracts are defined.

## Spec And Tests

- `backend/openapi.yaml` - HTTP contract referenced by Scalar and tests.
- `backend/test/` - Vitest + Supertest. `test/setup-env.ts` loads `backend/.env` before tests. Root tests build `createApp` with in-memory repositories and doubles from `test/test-utils.ts` / `test/in-memory-upload-repository.ts`.
- `test/unit-test/libs/**` mirrors `src/libs/**` and covers S3/MinIO, Firebase, Langfuse, LiteLLM, and workflow modules.

## Vendor Integration Write-Ups

- `docs/dependencies/` - S3/MinIO, LiteLLM/Langfuse, Scalar, and Firebase implementation notes.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend architecture (`backend/src/`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 6
