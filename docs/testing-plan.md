# Testing Plan

Endpoints to test:

- `GET /api/v1/health`
- `POST /api/v1/send-notification`
- `POST /api/v1/import`
- `POST /api/v1/regenerate`
- `GET /api/v1/export`
- `GET /api/v1/provider`
- `PUT /api/v1/provider`

## Main Rule

`POST /api/v1/import` and `POST /api/v1/regenerate` return `202` with `{ "status": "queued", "jobId": "...", "uploadId": "upl_..." }`.

The import handler waits only for image storage, pending row creation, best-effort initial FCM refresh, and queue submission. Langfuse prompt reads, LiteLLM workflow step execution, final row updates, and failure persistence happen in the background worker.

## Unit Tests

- request validation for `POST /api/v1/import`
- send-notification service/controller behavior for `POST /api/v1/send-notification`
- request validation for `POST /api/v1/regenerate`
- request validation for `GET /api/v1/export`
- Langfuse prompt fetch/list behavior
- LiteLLM provider discovery and step calls
- workflow planning from tool-reasoning output
- step execution order, prompt caching, and first-step model validation
- S3 upload metadata and object key extension behavior
- Realtime Database read and write helpers
- FCM endpoint payload construction and notifier broadcasts
- workflow completion persists `finalText` / `imageUrl` on success and error detail on failure
- import/regenerate queue submission returns job id and upload id
- background worker persists `finalText` / `imageUrl` on success and `errorMessage` on failure

## Integration Tests

- `GET /api/v1/health` returns the integration report body
- `POST /api/v1/send-notification` returns `{ "ok": true }` when the notifier accepts the request
- `POST /api/v1/import` returns `202 application/json` when the workflow is stubbed
- `POST /api/v1/regenerate` returns `202 application/json` and reruns the workflow for an existing row in the background when the workflow is stubbed
- `GET /api/v1/export` returns `data` ordered newest-first with pagination metadata
- after a successful mocked workflow, export includes `finalText` and `imageUrl` on the matching row
- after a failing mocked workflow, export includes `errorMessage` on the matching row

## E2E Tests

- import image -> `202` queued response -> FCM/export refresh -> export includes `finalText` and `imageUrl` on the same row
- import image -> provider failure in worker -> FCM/export refresh -> export includes `errorMessage` on the matching row
- receiver calls send-notification -> backend sends silent `capture_request` FCM -> sender foreground camera imports a photo
- import image -> pending row write sends receiver FCM topic broadcast (`export_refresh`) -> successful final update sends another `export_refresh` -> export still returns the canonical list from the HTTP API

## Tooling

The backend uses Vitest and Supertest (`backend/package.json`).

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend tests (`backend/test/`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 6
