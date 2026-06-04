# Redis / BullMQ - Implementation Notes

AirEye serializes `POST /api/v1/import` and `POST /api/v1/regenerate` through BullMQ backed by Redis. The production implementation is `BullMqImportWorkflowQueue` in `backend/src/api/v1/services/import-workflow.queue.ts`.

## Current Repo Status

The backend uses:

- `bullmq` for the Redis queue, worker, global queue events, and global concurrency.
- `REDIS_URL` from `backend/src/libs/configs/env.config.ts` for the Redis connection.
- BullMQ global concurrency set to `1`, so only one import/regenerate workflow runs at a time across workers sharing the queue.

## HTTP Behavior

Import and regenerate HTTP requests return after queue submission:

```json
{"status":"queued","jobId":"...","uploadId":"upl_..."}
```

Workflow result and failure state is persisted to the Realtime Database export row. Clients learn about row changes through `export_refresh` FCM hints and `GET /api/v1/export`.

## Notes

- Queue persistence and ordering are Redis-backed, but no separate job status endpoint exists.
- Import image buffers are uploaded before enqueue. BullMQ job data references stored image metadata (`uploadId`, `imageUrl`, `bucket`, `objectKey`) and does not store base64 image bytes.
- Completed and failed BullMQ jobs are retained briefly with bounded count/age, then BullMQ removes them from Redis.

---

**Updated:** 2026-06-03
**Applies to:** AirEye backend queueing (`backend/src/api/v1/services/import-workflow.queue.ts`, `backend/src/production.ts`)
**Doc version:** 1
