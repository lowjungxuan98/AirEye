# Unit and integration test rules (backend)

These rules apply to **`backend/test/`** (Vitest). Grim splits tests into three bands: **HTTP app integration** under **`test/api/`** (no vendors, no secrets), **API/unit tests** under **`test/unit-test/api/`** (pure or mocked), and **`src/libs` adapter tests** under **`test/unit-test/libs/`** (real S3/MinIO, Firebase, and configured LLM provider checks where applicable, **`backend/.env`**).

**Folder intent:** **`test/unit-test/libs/`** mirrors **`src/libs/`**; relative imports into **`src/`** use **`../../../../src/`** from a typical nested file. **`test/api/`** holds Supertest + **`createApp`** suites only—do not put them under **`test/unit-test/libs/`**.

## Storage and database (non-negotiable)

- **Do not mock** real **object storage** (e.g. S3/MinIO) or **databases** (e.g. Firebase Realtime Database) in **`test/unit-test/libs/**`** when you are testing those adapters. Use the **real** SDK and **`backend/.env`** credentials so behavior matches production.
- **You must delete (or destroy) every piece of test data** your test creates (uploads, RTDB nodes, etc.). Use **unique synthetic keys** (`vitest_${Date.now()}_…`) and **`try` / `finally`** (or equivalent) so **cleanup runs even when an assertion fails** partway through the test.
- **Do not** leave orphaned blobs, rows, or folders that accumulate cost, clutter dashboards, or confuse operators. If cleanup fails, fix the test or the teardown—do not silence it without a documented reason.

## Prerequisites (every developer)

- **Vendor / lib adapter tests** under `test/unit-test/libs/`: before `npm test`, copy **`backend/.env.example`** to **`backend/.env`** and fill every required variable (same bar as **`npm run dev`**). Vitest loads that file via **`backend/test/setup-env.ts`** (see **`backend/vitest.config.ts`** → `setupFiles`). If `.env` is incomplete, failures will look like vendor **401 / 403**, timeouts, or client errors—not always a clear “missing env” message.
- **HTTP integration tests** under `test/api/` (`*.integration.test.ts`): they **must not** depend on a filled `.env` or live vendors. They use **`createApp({ ... })`** with in-memory repositories and stubs (`test/test-utils.ts`, `test/in-memory-upload-repository.ts`). Run only that slice with **`npm run test:integration`** (uses **`backend/vitest.integration.config.ts`**).
- Human-facing reminder also lives under **`backend/README.md`** → **Testing**.

## Layout and naming

- **Mirror `src/libs` under `test/unit-test/libs`.** For each TypeScript file under **`backend/src/libs/`**, add or maintain a matching test file under **`backend/test/unit-test/libs/`** with the same relative path and a **`.test.ts`** suffix.

  | Source | Test |
  |--------|------|
  | `src/libs/s3/s3.util.ts` | `test/unit-test/libs/s3/s3.util.test.ts` |
  | `src/libs/llm/text-processor.ts` | `test/unit-test/libs/llm/text-processor.test.ts` |
  | `src/libs/firebase/realtime.ts` | `test/unit-test/libs/firebase/realtime.test.ts` |

- **HTTP app integration (Supertest + `createApp`)** — files under **`backend/test/api/`**, named **`*.integration.test.ts`**. Covers routes mounted from **`app.ts`**, global error JSON, stable middleware (e.g. **`OPTIONS /openapi.yaml`** CORS), **`GET /health`**, **`POST /api/v1/import`**, **`GET /api/v1/export`**, and **404** behavior. Use **Supertest** (already a dev dependency).

- **Shared test doubles at the `test/` root** — **`test/test-utils.ts`**, **`test/in-memory-upload-repository.ts`**, **`test/setup-env.ts`**. Do not tuck these under **`test/unit-test/libs/`**.

- **Unit tests for controllers/services** may live under **`test/unit-test/api/`** (see existing **`controllers/*.test.ts`**). They are not a substitute for **`test/api/`** HTTP wiring tests.
- **Controller handler tests** only need a minimal **`Response`** double (`status` / `json` as **`vi.fn()`**, with **`mockReturnThis`** when the handler chains). Do **not** add shared **`Response`** mock modules: **`backend/.env`** applies to **vendor adapter** suites under **`test/unit-test/libs/`**, not to Express stubs. For image payloads, prefer a small committed asset such as **`backend/test/unit-test/test-image.png`** over opaque placeholder buffers.

## Three categories of tests (do not conflate them)

### 1. HTTP app integration (`test/api/*.integration.test.ts`, `test/test-utils.ts`, `test/in-memory-upload-repository.ts`)

- **Goal:** Exercise routes, **`express.json`**, multer on import, **`wrapAsync`**, and the centralized error middleware **without** S3/MinIO, Firebase, or a live LLM provider unless you explicitly opt in.
- **How:** Build the app with **`createApp({ ... })`** from **`src/app.ts`**. Inject doubles: in-memory **`UploadRepository`**, a stable **`runHealthChecks`** returning **`HealthReport`**, **`silentLogger`**, stubbed **`ImportService`** (the **`ImportService` port** in **`api/v1/model/services.model.ts`**) and/or the **`ImportService`** class with stubbed **`ImportServiceDependencies`**, **`ExportService`** backed by the in-memory repo. See **`test/test-utils.ts`** (**`buildTestApp`**, **`createImportServiceWithStubbedPipeline`**).
- **Do not** require **`backend/.env`** secrets for these tests. They should pass in CI with only Node + npm install.
- **Commands:** **`npm run test:integration`** (scoped config). Avoid using the CLI filter **`vitest run test/api`** alone—it can also match paths under **`test/unit-test/api/`** (substring **`test/api`**). Prefer **`test:integration`** or list explicit files.

### 2. Library adapters (`test/unit-test/libs/**` mirroring `src/libs/**`)

- **Goal:** Prove that adapter behavior for S3/MinIO, Firebase Admin (Realtime Database + FCM), and the OpenAI-compatible LLM layer still matches expectations for the code in **`src/libs/`**.
- **How:** Call **`loadServerEnv()`** from **`libs/configs/env.config.ts`** after dotenv has run; use production-shaped APIs (upload, ping, RTDB writes, topic send, chat completion) with **reasonable timeouts** (Vitest defaults are too low for cold network calls—keep **`testTimeout` / `hookTimeout`** elevated in **`vitest.config.ts`** when needed).
- **Cleanup (required):** **Always** remove or destroy data the test created—**`finally`** blocks are mandatory when writes can succeed before an assertion throws. Examples: **`DeleteObjectCommand`** after **`uploadImage`**; **`getDatabase(app).ref("uploads/" + id).remove()`** (or equivalent) after RTDB writes. Use **unique ids** so parallel workers do not collide. (See also **Storage and database** above.)
- **Do not** mock **S3 storage clients**, **`firebase-admin/*`** (including the Realtime Database client), or **storage-shaped behavior** for these suites. Model-provider request-shape tests may inject an OpenAI-compatible client double when they are validating pure request construction instead of live network behavior. Exceptions need a written note in the PR or docs.

### 3. Pure logic, ports, and env validation

- **Pure helpers** under **`src/libs/utils/`** (e.g. **`mapRequestError`**, **`sortByCreatedAtDesc`**, **`ApiError`**) and **constants** may be tested with **no network** and no vendor SDK.
- **`loadServerEnv` edge cases** (invalid `PORT`, missing required keys, optional trimming) **must** keep using **`vi.stubEnv` / `vi.unstubAllEnvs`** (or equivalent) so expectations do not depend on a developer’s personal `.env`. Do not remove that isolation in **`test/unit-test/libs/configs/env.config.test.ts`** without replacing it with another deterministic strategy.

## Assertions and stability

- Prefer asserting **contracts** (HTTP status, JSON shape, stable error **codes**, ordering invariants like **`createdAt` descending**) over brittle full string matches on model prose from LLMs.
- When model providers return **assistant `content` in multiple shapes** (string vs array parts), assert on the adapter’s normalized output or on **`choices` / `message` presence** rather than brittle full prose.

## Security and hygiene

- **Do not** commit **`backend/.env`**, service account JSON, or API keys. **Do not** `console.log` secrets or print full `ServerEnv` in tests.
- **Do not** use production customer data paths for throwaway integration writes; keep test data obviously synthetic.

## When you add a new file under `src/libs/`

1. Add the mirrored **`.test.ts`** under **`test/unit-test/libs/`**.
2. Decide **category (1), (2), or (3)**; if it touches a vendor SDK, default to **(2)** with `.env` and cleanup unless the new code is a pure function extracted to **`libs/utils/`**.
3. If you introduce a **new required env var**, update **`env.config.ts`**, **`.env.example`**, **`backend/README.md`**, and any test that calls **`loadServerEnv()`** without stubs.
4. If you add a **new HTTP route**, extend **`createApp`** (or a router factory) and add **`test/api/`** coverage for status codes, error **`code`**, and any stable middleware headers.

## Related docs

- **`docs/code-rules/code-practice.md`** — where tests sit relative to **`createApp`** and **`libs/`**.
- **`docs/code-rules/project-architecture.md`** — high-level map of **`backend/test/`**.
- **`docs/code-rules/restriction.md`** — things not to do in product code (env and limits still apply during tests).

---

**Updated:** 2026-04-25
**Applies to:** grim backend tests (`backend/test/`, `backend/package.json` -> version `0.1.7`)
**Doc version:** 1
