# Code practice (should do)

Practices aligned with the **current** Grim backend structure. Prefer these when adding or changing code.

## Placement

- **New HTTP surface** — Add route factory in `api/v1/routes/`, thin controller in `api/v1/controllers/`, orchestration in `api/v1/services/`, then register the router from `app.ts` (mirror existing import/export/health pattern).
- **Shared types and ports** — Add to `api/v1/model/` (either extend an existing `*.model.ts` or add a new model file if the domain is distinct). Keep `import.model.ts` for upload row / import request shapes; `export.model.ts` for list DTOs and mapping helpers; `services.model.ts` for cross-cutting ports (`UploadRepository`, `ImportService`, etc.).
- **Third-party adapters** — Put Firebase, OpenAI-compatible LLM, and S3/MinIO integration under `libs/firebase/`, `libs/llm/`, `libs/s3/` respectively. LLM calls should use the official `openai` SDK and provider selection should happen through env-driven `baseURL` / API key config instead of provider-specific service branches.
- **Environment and limits** — Use `libs/configs/env.config.ts` for env loading and types; use `libs/constants/limits.contant.ts` for numeric limits consumed by routes/services.
- **Small shared helpers** — Prefer `libs/utils/` with the `*.util.ts` suffix for cross-cutting helpers (`http.util.ts`, `api-error.util.ts`, `sort-by-created-at.util.ts`).

## Express and errors

- Use **`wrapAsync`** from `libs/utils/http.util.ts` for async route handlers so errors reach the centralized error middleware in `app.ts`.
- Throw **`ApiError`** from `libs/utils/api-error.util.ts` for expected HTTP errors (4xx/controlled messages). Unknown errors are mapped to a generic 500 by `mapRequestError`.

## Composition and testing

- **`createApp`** should stay the single factory for the HTTP app; pass dependencies via `AppDependencies` from `app.ts`.
- **Tests** — Follow **`docs/code-rules/unit-test-rules.md`**. For **HTTP / app** behavior, construct **`createApp({ ... })`** with test doubles (see **`backend/test/test-utils.ts`** and **`backend/test/in-memory-upload-repository.ts`**); those tests must not depend on a filled **`.env`**. For **`src/libs/`** adapters, add mirrored tests under **`backend/test/unit-test/libs/`** that use **`backend/.env`** and real vendor calls, with cleanup for side effects.

## Documentation accuracy

- When you change paths, env vars, or HTTP behavior, update the relevant file under `docs/` (e.g. `specification.md`, `workflow.md`) and, for vendor integrations, the matching file under **`docs/dependencies/`** (see **`docs/dependencies/README.md`**) so examples and file paths stay consistent with the repo.

## Naming consistency

- When adding new util modules under `libs/utils/`, follow the existing **`*.util.ts`** pattern unless there is a strong repo-wide convention to the contrary.

---

**Updated:** 2026-04-25
**Applies to:** grim backend code practice (`backend/src/`, `backend/package.json` -> version `0.1.7`)
**Doc version:** 1
