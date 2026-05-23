# Unit And Integration Test Rules (Backend)

These rules apply to `backend/test/` (Vitest). AirEye splits tests into three bands:

- HTTP app integration under `test/api/` with no live vendors or secrets.
- API/unit tests under `test/unit-test/api/` with pure logic or mocked collaborators.
- `src/libs` adapter tests under `test/unit-test/libs/` for S3/MinIO, Firebase, Langfuse, LiteLLM, and workflow modules.

## Storage And Database

- Do not mock real object storage or databases when testing those adapters under `test/unit-test/libs/**`.
- Delete every piece of test data created by adapter tests. Use unique synthetic keys and `try` / `finally` when writes can succeed before an assertion fails.
- Do not leave orphaned blobs, rows, or folders.

## Prerequisites

- Vendor/lib adapter tests load `backend/.env` via `backend/test/setup-env.ts`. Copy `backend/.env.example` to `backend/.env` and fill required variables before running those tests.
- HTTP integration tests under `test/api/` must not depend on a filled `.env` or live vendors. They use `createApp({ ... })` with in-memory repositories and stubs.
- Run only the HTTP integration slice with `npm run test:integration`.

## Layout And Naming

Mirror `src/libs` under `test/unit-test/libs`.

| Source | Test |
|--------|------|
| `src/libs/s3/client.ts` | `test/unit-test/libs/s3/client.test.ts` |
| `src/libs/firebase/client.ts` | `test/unit-test/libs/firebase/client.test.ts` |
| `src/libs/firebase/endpoint.ts` | `test/unit-test/libs/firebase/endpoint.test.ts` |
| `src/libs/litellm/client.ts` | `test/unit-test/libs/litellm/client.test.ts` |
| `src/libs/langfuse/client.ts` | `test/unit-test/libs/langfuse/client.test.ts` |
| `src/libs/workflow/tool-reasoning.ts` | `test/unit-test/libs/workflow/tool-reasoning.test.ts` |
| `src/libs/workflow/step-executor.ts` | `test/unit-test/libs/workflow/step-executor.test.ts` |

HTTP app integration files live under `backend/test/api/` and are named `*.integration.test.ts`.

## Test Categories

### 1. HTTP App Integration

- Goal: exercise routes, `express.json`, multer on import, `wrapAsync`, and the centralized error middleware without live vendors.
- Build the app with `createApp({ ... })` from `src/app.ts`.
- Use doubles from `test/test-utils.ts` and `test/in-memory-upload-repository.ts`.

### 2. Library Adapters

- Goal: prove adapter behavior still matches expectations for code in `src/libs/`.
- S3/MinIO and Firebase Realtime Database adapter tests use real services with cleanup.
- Langfuse, LiteLLM, and workflow request-shape tests may inject client doubles when validating pure request construction or parsing.

### 3. Pure Logic, Ports, And Env Validation

- Pure helpers under `src/libs/utils/` and constants may be tested with no network.
- `loadServerEnv` edge cases must keep using `vi.stubEnv` / `vi.unstubAllEnvs` so expectations do not depend on a developer's personal `.env`.

## When Adding A New File Under `src/libs/`

1. Add the mirrored `.test.ts` under `test/unit-test/libs/`.
2. Decide whether it is a live adapter test, a request-shape test with doubles, or pure logic.
3. If you introduce a new required env var, update `env.config.ts`, `.env.example`, `backend/README.md`, and deterministic env tests.
4. If you add a new HTTP route, extend `createApp` or a router factory and add `test/api/` coverage.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend tests (`backend/test/`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 3
