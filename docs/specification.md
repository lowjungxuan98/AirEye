# Backend API specification (v1)

- `GET /health`
- `POST /api/v1/capture`
- `POST /api/v1/import`
- `GET /api/v1/export`
- `GET /api/v1/prompts`
- `PUT /api/v1/prompts`
- `GET /api/v1/provider`
- `PUT /api/v1/provider`

Authoritative request/response shapes: **`backend/openapi.yaml`** (served at `GET /openapi.yaml` when the server runs).

## `GET /health`

Integration checks (Firebase Realtime Database, extract/final LLM stage configs aggregated under `llm`, S3 bucket readiness). Returns **200** when `ok` is true, **503** when `ok` is false. Response body matches OpenAPI schema **`IntegrationHealthReport`** with top-level keys `ok`, `firebase`, `llm`, and `s3`.

## `POST /api/v1/capture`

- **200** with `{ "ok": true }` after Firebase accepts the send request.
- Sends a silent FCM topic data message for sender devices: `kind: capture_request`, `notificationType: silent`, `notification_type: silent`, `role: sender`, `targetRole: sender`.
- Topic defaults to `grim_new_result` (override with server env `GRIM_FCM_TOPIC`).

## `POST /api/v1/import`

- `multipart/form-data`, required field **`image`**
- **200** with **`Content-Type: text/event-stream`** — Server-Sent Events until the pipeline finishes. Each `data:` line is JSON: progress statuses (`extracting_text`, `analyzing_text`, `format_guard`), intermediate text payloads, then either the success row (`id`, `createdAt`, `updatedAt`, `extractedText`, `finalText`, `imageUrl`, `bucket`, `objectKey`) or a terminal `{"error":{"code","message"}}`.
- Pipeline order on the server: **S3/MinIO** image upload (`ContentType` metadata plus MIME-derived key extension) → **extract LLM config** (image text extraction) → **final LLM config** (final text) → **format guard LLM pass** → **Realtime Database** (one write under `uploads/{id}`) → **FCM** topic signals only after a successful DB write.
- Import success sends two receiver signals on topic `grim_new_result` by default: visible `kind: new_result`, `notificationType: notify`, `role: receiver`; silent `kind: export_refresh`, `notificationType: silent`, `role: receiver`, `url: /api/v1/export?page=1&limit=20`.

Typical errors: **400**, **413**, **415**, **500** — codes and messages match OpenAPI `ErrorBody` examples.

## `GET /api/v1/export`

- Optional query **`page`** and **`limit`** (defaults and max: OpenAPI)
- **200** with `{ "data": [ ... ], "page", "limit", "is_next" }` — ordering and per-item fields: OpenAPI **`ExportListItem`**

## `GET /api/v1/prompts`, `PUT /api/v1/prompts`

- Reads or overwrites the extract, analyzing, and format guard prompt templates.
- `PUT` accepts JSON keys `extractTextPrompt` / `analyzingTextPrompt` / `formatGuardPrompt` or multipart fields `extract_text` / `analyzing_text` / `format_guard`.
- When `GRIM_PROMPT_ADMIN_SECRET` is configured, callers must send `X-Grim-Prompt-Secret`.

## `GET /api/v1/provider`, `PUT /api/v1/provider`

- Reads or switches the active LLM provider stored in Realtime Database at `provider_state/current_provide`.
- Accepted values: `openrouter`, `openai`, `nvidia_nim`.

---

**Updated:** 2026-04-25
**Applies to:** grim backend API (`backend/openapi.yaml`, `backend/package.json` -> version `0.1.7`)
**Doc version:** 4
