# Code Practice

Practices aligned with the current AirEye backend structure.

## Placement

- New HTTP surface: add a route factory in `api/v1/routes/`, a thin controller in `api/v1/controllers/`, orchestration in `api/v1/services/`, then register the router from `app.ts`.
- Shared types and ports: add to `api/v1/model/`. Keep `import.model.ts` for upload row/import request shapes, `export.model.ts` for list DTOs and mapping helpers, and `services.model.ts` for cross-cutting ports.
- Third-party adapters: put Firebase, Langfuse, LiteLLM, workflow, and S3/MinIO integrations under `libs/firebase/`, `libs/langfuse/`, `libs/litellm/`, `libs/workflow/`, and `libs/s3/`.
- Environment and limits: use `libs/configs/env.config.ts` for env loading and types; use `libs/constants/limits.contant.ts` for numeric limits consumed by routes/services.
- Small shared helpers: prefer `libs/utils/` with the `*.util.ts` suffix for cross-cutting helpers.

## Express And Errors

- Use `wrapAsync` from `libs/utils/http.util.ts` for async route handlers so errors reach the centralized error middleware in `app.ts`.
- Throw `ApiError` from `libs/utils/api-error.util.ts` for expected HTTP errors. Unknown errors are mapped to a generic 500 by `mapRequestError`.

## Composition And Testing

- `createApp` should stay the single factory for the HTTP app; pass dependencies via `AppDependencies` from `app.ts`.
- Follow `docs/code-rules/unit-test-rules.md`.
- For HTTP/app behavior, construct `createApp({ ... })` with test doubles.
- For `src/libs/` adapters, add mirrored tests under `backend/test/unit-test/libs/`; use live vendors only when the test is intentionally an adapter/integration check and cleanup is reliable.

## Documentation Accuracy

When changing paths, env vars, or HTTP behavior, update the relevant file under `docs/` and the matching vendor file under `docs/dependencies/`.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend code practice (`backend/src/`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 2
