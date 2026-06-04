# Backend API Specification (v1)

- `GET /api/v1/health`
- `POST /api/v1/send-notification`
- `POST /api/v1/import`
- `POST /api/v1/regenerate`
- `GET /api/v1/export`
- `GET /api/v1/provider`
- `PUT /api/v1/provider`

Authoritative request/response shapes: `backend/openapi.yaml` (served at `GET /openapi.yaml` when the server runs).

## `GET /api/v1/health`

Integration checks cover Firebase Realtime Database, LiteLLM model discovery, and S3 bucket readiness. The response body matches OpenAPI schema `IntegrationHealthReport` with top-level keys `ok`, `firebase`, `llm`, and `s3`.

Production public URL: `https://lowjungxuan.dpdns.org/backend/api/v1/health`. The backend still serves `GET /health` as a legacy compatibility alias.

## `POST /api/v1/send-notification`

- `200` with `{ "ok": true }` after Firebase accepts the send request.
- Sends a silent FCM topic data message for sender devices: `kind: capture_request`, `notificationType: silent`, `notification_type: silent`, `role: sender`, `targetRole: sender`.
- Topic resolution is `AIREYE_FCM_TOPIC`, then the AirEye default `aireye_new_result`.

## `POST /api/v1/import`

- `multipart/form-data`, required field `image`.
- `202` with `{ "status": "queued", "jobId": "...", "uploadId": "upl_..." }`.
- Import and regenerate share one Redis-backed BullMQ FIFO queue with concurrency one.
- Flow: S3/MinIO image upload -> Realtime Database pending row -> FCM `export_refresh` -> queue background job -> `202` response -> worker runs Langfuse tool-reasoning/LiteLLM workflow -> Realtime Database final update or `errorMessage` -> FCM `export_refresh`.
- Queue jobs reference stored image metadata (`uploadId`, `imageUrl`, `bucket`, `objectKey`), not image bytes.
- Langfuse is the prompt source. There are no prompt HTTP routes.

Typical errors: `400`, `413`, `415`, `500`.

## `POST /api/v1/regenerate`

- JSON body with `imageUrl` and `text`.
- Reruns the same prompt-configured workflow for an existing upload row.
- Returns `202` queued JSON, waits in the same BullMQ FIFO queue, and updates the existing export row in the background.

## `GET /api/v1/export`

- Optional query `page` and `limit` (defaults and max: OpenAPI).
- `200` with `{ "data": [ ... ], "page", "limit", "is_next" }`.
- Rows are newest-first. Pending rows can include `imageUrl`; completed rows add `finalText`; failed rows add `errorMessage`.

## `GET /api/v1/provider`, `PUT /api/v1/provider`

- Reads or switches the active LLM provider stored in Realtime Database at `provider_state/current_provide`.
- Available values are discovered from LiteLLM model routes. A provider is listed only when both `<provider>-image` and `<provider>-reasoning` exist.

---

**Updated:** 2026-06-03
**Applies to:** AirEye backend API (`backend/openapi.yaml`, `backend/package.json` -> version `0.2.14`)
**Doc version:** 7
