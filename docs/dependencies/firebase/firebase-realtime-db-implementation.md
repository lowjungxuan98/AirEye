# Firebase Realtime Database (Admin SDK, Node.js) - Implementation Notes

The AirEye backend uses Firebase Admin with Realtime Database via `FirebaseUploadRepository` in `backend/src/libs/firebase/realtime.ts`.

## Runtime Shape

Rows are stored under namespace-prefixed paths such as `development/uploads/{id}` or `production/uploads/{id}`.

```json
{
  "development": {
    "uploads": {
      "upl_xyz": {
        "extractedText": "raw workflow output",
        "finalText": "formatted result",
        "imageUrl": "https://minio.example.test/document-images/uploads/upl_xyz-a1b2c3d4.jpg?X-Amz-...",
        "bucket": "document-images",
        "objectKey": "uploads/upl_xyz-a1b2c3d4.jpg",
        "createdAt": 1744930000000,
        "updatedAt": 1744930005000
      }
    },
    "provider_state": {
      "current_provide": "openai"
    }
  }
}
```

Why this is enough:

- one JSON object per image under `uploads`
- timestamps support ordering and freshness
- `finalText` and `imageUrl` are what the client needs when the workflow succeeds
- `bucket` and `objectKey` preserve the durable S3/MinIO object location
- `errorMessage` appears when the workflow fails

For hosted deploys, AirEye can read Firebase Admin credentials from `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` instead of requiring a local file path in `GOOGLE_APPLICATION_CREDENTIALS`.

## Write Data

Firebase documents `set`, `update`, `push`, and `transaction`. For AirEye, `set` or `update` on a known path is enough.

```ts
import type { App } from "firebase-admin/app";
import { getRealtimeDb } from "../libs/firebase/realtime";

export async function saveUploadNode(app: App, namespace: string, id: string, payload: unknown) {
  const db = getRealtimeDb(app);
  await db.ref(`${namespace}/uploads/${id}`).set(payload);
}
```

Use `update()` for partial changes:

```ts
const db = getRealtimeDb(app);
await db.ref(`${namespace}/uploads/${id}`).update({
  finalText: "formatted result",
  imageUrl: "https://minio.example.test/document-images/uploads/upl_xyz-a1b2c3d4.jpg?X-Amz-...",
  bucket: "document-images",
  objectKey: "uploads/upl_xyz-a1b2c3d4.jpg",
  updatedAt: Date.now()
});
```

Use `push()` when you need Firebase to generate the key. Use `transaction()` only for true concurrent updates such as counters.

## Read And Query Data

For normal HTTP handlers, a one-time read is the simplest option.

```ts
const db = getRealtimeDb(app);
const snapshot = await db.ref(`${namespace}/uploads/${id}`).once("value");
const value = snapshot.val();
```

`FirebaseUploadRepository.listUploads` queries by `createdAt`:

```ts
this.database
  .ref(`${namespace}/uploads`)
  .orderByChild("createdAt")
  .limitToLast(limit)
  .once("value");
```

Without a matching rules index, the client logs a warning and may download more data than necessary. Add `createdAt` to `.indexOn` on each `uploads` node you query:

```json
{
  "rules": {
    "development": {
      "uploads": {
        ".indexOn": ["createdAt"]
      }
    },
    "production": {
      "uploads": {
        ".indexOn": ["createdAt"]
      }
    }
  }
}
```

A copy-paste template for new projects lives at `backend/database.rules.json.example`.

## Important Firebase Notes

- Realtime Database is a JSON tree.
- Avoid deep nesting because reading a node reads all children under it.
- Keep each stored object small and straightforward.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend Realtime Database (`backend/src/libs/firebase/realtime.ts`, `backend/package.json` -> version `0.2.8`)
**Doc version:** 5
**Upstream refs:**
- https://firebase.google.com/docs/database/admin/start#node.js_1
- https://firebase.google.com/docs/database/admin/structure-data
- https://firebase.google.com/docs/database/admin/save-data#node.js
- https://firebase.google.com/docs/database/admin/retrieve-data#node.js
