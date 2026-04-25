# Testing plan

Endpoints to test:

- `GET /api/v1/health`
- `POST /api/v1/capture`
- `POST /api/v1/import`
- `GET /api/v1/export`
- `GET /api/v1/prompts`
- `PUT /api/v1/prompts`

## Main rule

`POST /api/v1/import` returns **200** with **`text/event-stream`**. The response body is Server-Sent Events: synthetic status lines (`extracting_text`, `analyzing_text`, `format_guard`), then a terminal JSON object (success row or `error`).

The handler must wait for **S3/MinIO**, configured extract-stage LLM image text extraction, configured final-stage LLM text generation, the format guard LLM pass, **Realtime Database**, and (on success) **FCM** as part of that same request (stream ends after those steps).

## Unit tests

- request validation for `POST /api/v1/import`
- capture service/controller behavior for `POST /api/v1/capture`
- request validation for `GET /api/v1/export` (for example invalid `limit`)
- image text extraction provider behavior
- final text provider behavior
- format guard provider behavior
- S3 upload metadata (`ContentType`) and object key extension behavior
- Realtime DB read and write helpers
- FCM topic broadcasts (`broadcastNewResult`, `broadcastExportRefresh`) are invoked after a successful pipeline
- FCM capture broadcast (`broadcastCaptureRequest`) is invoked by the capture service
- pipeline completion persists `finalText` / `imageUrl` on success and error detail on failure
- import stream emits status events in order and a terminal success or error payload

## Integration tests

- `GET /api/v1/health` returns **200** with the integration report body
- `POST /api/v1/capture` returns **200** `{ "ok": true }` when the notifier accepts the request
- `POST /api/v1/import` returns **200** `text/event-stream` with the expected SSE `data:` sequence when the pipeline is stubbed
- `GET /api/v1/export` returns `data` ordered newest-first with pagination metadata
- after a successful mocked pipeline, export includes `finalText` and `imageUrl` on the matching row
- after a failing mocked pipeline, export includes `errorMessage` on the matching row

## E2E tests

- import image → SSE stream completes → terminal payload includes `finalText` and `imageUrl` → export includes the same row
- import image → provider failure → SSE terminal `error` and export includes `errorMessage` on the matching row
- receiver calls capture → backend sends silent `capture_request` FCM → sender foreground camera imports a photo
- import image → after a successful pipeline, receiver FCM topic broadcasts run (`new_result`, `export_refresh`) → export still returns the canonical list from the HTTP API

## Tooling

The backend uses Vitest and Supertest (`backend/package.json`).

---

**Updated:** 2026-04-25
**Applies to:** grim backend tests (`backend/test/`, `backend/package.json` -> version `0.1.8`)
**Doc version:** 5
