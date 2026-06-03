# Redis / BullMQ - Implementation Notes

AirEye serializes `POST /api/v1/import` and `POST /api/v1/regenerate` through BullMQ backed by Redis. The production implementation is `BullMqImportWorkflowQueue` in `backend/src/api/v1/services/import-workflow.queue.ts`.

## Current Repo Status

The backend uses:

- `bullmq` for the Redis queue, worker, global queue events, and global concurrency.
- `REDIS_URL` from `backend/src/libs/configs/env.config.ts` for the Redis connection.
- BullMQ global concurrency set to `1`, so only one import/regenerate workflow runs at a time across workers sharing the queue.

## SSE Behavior

The HTTP request remains open. If a job is waiting behind active work, the backend first emits:

```json
{"status":"queued","data":{"position":1}}
```

`position` is the count of jobs ahead at enqueue time. Workflow events and terminal result/error payloads continue to use the existing SSE stream.

Queued jobs that fail preflight after emitting `queued` are converted into terminal SSE error payloads. Jobs that fail before any SSE payload still flow through the normal JSON HTTP error path.

## Notes

- Queue persistence and ordering are Redis-backed, but no separate job status endpoint exists.
- Import image buffers are serialized to base64 in the BullMQ job data so a worker in another backend process can execute the workflow.
- Completed and failed BullMQ jobs are retained briefly with bounded count/age so request waiters can observe terminal events, then BullMQ removes them from Redis.

---

**Updated:** 2026-06-03
**Applies to:** AirEye backend queueing (`backend/src/api/v1/services/import-workflow.queue.ts`, `backend/src/production.ts`)
**Doc version:** 1
