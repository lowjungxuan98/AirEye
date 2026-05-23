# Restrictions

Rules derived from decisions already reflected in the AirEye backend repo.

## Layout And Dead Structure

- Do not recreate removed top-level `src/` buckets for this service unless there is a deliberate new design and a doc update: there is no `src/domain/`, `src/errors/`, `src/config/`, `src/providers/`, `src/repositories/`, `src/services/`, `src/http/`, or `src/lib/` in the current tree.
- Do not leave empty directories after moves.

## Types And Contracts

- Do not define a second parallel home for shapes that already live in `api/v1/model/`. Extend or import from the model layer.
- Do not move `ApiError` back under `src/errors/`; the canonical file is `libs/utils/api-error.util.ts`.

## Application Wiring

- Do not bypass `createApp` for the main server path.
- Production dependency construction lives in `production.ts`, called from `server.ts`.

## HTTP Layers

- Do not put import workflow orchestration or export listing logic only inside routes/controllers when it belongs in services.
- Do not skip `wrapAsync` on new async handlers attached to the same error middleware unless you handle errors another explicit way.

## Configuration

- Do not read required process env ad hoc in random modules for values already defined on `ServerEnv`.
- Do not hardcode export/import byte limits outside `libs/constants/limits.contant.ts`.

## Accuracy

- Do not document file paths or behaviors in `docs/` that contradict `backend/src/` or `backend/openapi.yaml`.
- Do not reintroduce prompt HTTP route docs unless those routes are restored in code.

## Tests

- Do not treat `backend/test/unit-test/libs/**` as optional when you add or change `backend/src/libs/**`.
- Do not make app-level HTTP tests depend on real `LITELLM_API_KEY`, Langfuse, Firebase, or S3/MinIO unless that is an explicit documented exception.
- Do not leave integration test data in S3/MinIO or Realtime Database; always delete what the test created.

## Note On Constants Filename

The limits module is currently named `limits.contant.ts` (typo). Do not silently fix the filename in one place without updating all imports and documentation that reference the path.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend restrictions (`backend/src/`, `backend/test/`)
**Doc version:** 2
