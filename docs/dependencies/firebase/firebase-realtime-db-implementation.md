# Firebase Realtime Database (Admin SDK, Node.js) - implementation notes

Key references:

- [Admin SDK start (Node.js)](https://firebase.google.com/docs/database/admin/start#node.js_1)
- [Structure data](https://firebase.google.com/docs/database/admin/structure-data)
- [Save data (Node.js)](https://firebase.google.com/docs/database/admin/save-data#node.js)
- [Retrieve data (Node.js)](https://firebase.google.com/docs/database/admin/retrieve-data#node.js)

Verified against the official docs on 2026-04-18.

## Current repo status

The backend uses Firebase Admin with Realtime Database via `FirebaseUploadRepository` (`backend/src/libs/firebase/realtime.ts`).

## Install

```bash
cd backend
npm i firebase-admin
```

## Initialize

```ts
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const credential = base64
    ? cert(JSON.parse(Buffer.from(base64, "base64").toString("utf8")))
    : applicationDefault();

  return initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export function getRealtimeDb() {
  return getDatabase(getFirebaseAdminApp());
}
```

Firebase documents `databaseAuthVariableOverride` if you later want limited privileges, but you do not need that for the first pass.

## Simple data shape for Grim

Keep it flat under one tree node per image:

```json
{
  "uploads": {
    "upl_xyz": {
      "extractedText": "raw OCR-like text",
      "finalText": "final processed answer",
      "imageUrl": "https://minio.example.test/grim-development/uploads/upl_xyz-a1b2c3d4.jpg?X-Amz-...",
      "bucket": "grim-development",
      "objectKey": "uploads/upl_xyz-a1b2c3d4.jpg",
      "createdAt": 1744930000000,
      "updatedAt": 1744930005000
    }
  }
}
```

Why this is enough:

- one JSON object per image under `uploads/…`
- timestamps support ordering and freshness
- `finalText` and `imageUrl` are what the mobile client needs when the pipeline succeeds
- `bucket` and `objectKey` preserve the durable S3/MinIO object location
- `errorMessage` appears when the pipeline fails

**When import writes:** `ImportService` does **not** touch Realtime Database until after **S3/MinIO** image storage, configured LLM image text extraction, configured LLM final text generation, and the format guard pass have completed. It then performs a single **`set`** on `uploads/{id}` with the full success payload (or a single **`set`** with `errorMessage` if the pipeline failed). The client receives progress and the final row (or terminal error) over the same **HTTP 200** `text/event-stream` response before this write completes from the client’s perspective (the stream’s last `data:` line reflects the persisted outcome).

For hosted deploys, Grim can read Firebase Admin credentials from **`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`** instead of requiring a local file path in **`GOOGLE_APPLICATION_CREDENTIALS`**.

## Write data

Firebase documents `set`, `update`, `push`, and `transaction`.

For Grim, `set` or `update` on a known path is enough.

```ts
import type { App } from "firebase-admin/app";
import { getRealtimeDb } from "../libs/firebase/realtime";

export async function saveUploadNode(app: App, pathKey: string, payload: unknown) {
  const db = getRealtimeDb(app);
  await db.ref(`uploads/${pathKey}`).set(payload);
}
```

Use `update()` for partial changes:

```ts
const db = getRealtimeDb(app);
await db.ref(`uploads/${pathKey}`).update({
  finalText: "final processed answer",
  imageUrl: "https://minio.example.test/grim-development/uploads/upl_xyz-a1b2c3d4.jpg?X-Amz-...",
  bucket: "grim-development",
  objectKey: "uploads/upl_xyz-a1b2c3d4.jpg",
  updatedAt: Date.now()
});
```

Use `push()` when you need Firebase to generate the key. Use `transaction()` only for true concurrent updates such as counters.

## Read data

For normal HTTP handlers, a one-time read is the simplest option.

```ts
const db = getRealtimeDb(app);
const snapshot = await db.ref(`uploads/${pathKey}`).once("value");
const value = snapshot.val();
```

## Query data

`FirebaseUploadRepository.listUploads` (see `backend/src/libs/firebase/realtime.ts`) queries:

```ts
this.database.ref("uploads").orderByChild("createdAt").limitToLast(limit).once("value");
```

Without a matching **rules index**, the client logs a warning and may download more data than necessary:

> `FIREBASE WARNING: Using an unspecified index … Consider adding ".indexOn": "createdAt" at /uploads`

### Fix: declare `.indexOn` on `/uploads`

Add **`createdAt`** to **`.indexOn` on the `uploads` node itself** (not under a `$child` wildcard). Example you can merge into your existing Realtime Database rules in the [Firebase console](https://console.firebase.google.com/) (**Build → Realtime Database → Rules**) or into `database.rules.json` before `firebase deploy`:

```json
{
  "rules": {
    "uploads": {
      ".indexOn": ["createdAt"]
    }
  }
}
```

If you already have a `"uploads"` block (for `.read` / `.write` / `$uid`, etc.), **merge** only the **`.indexOn`** line into that object. Do not replace your whole rules file with the snippet above unless `uploads` is the only path you secure.

A copy-paste template for new projects lives at **`backend/database.rules.json.example`** (adjust `.read` / `.write` to your security model; the Firebase Admin SDK bypasses these rules for server-side access, but clients and the emulator still honor them).

After the deployed rules include this index, republish once; the warning should stop on the next `orderByChild("createdAt")` query.

## Important Firebase notes

- Realtime Database is a JSON tree.
- Avoid deep nesting because reading a node reads all children under it.
- Keep each stored object small and straightforward.

---

**Updated:** 2026-04-25
**Applies to:** grim backend Realtime Database (`backend/src/libs/firebase/realtime.ts`, `backend/package.json` -> version `0.1.8`)
**Doc version:** 4
**Upstream refs:**
- https://firebase.google.com/docs/database/admin/start#node.js_1
- https://firebase.google.com/docs/database/admin/structure-data
- https://firebase.google.com/docs/database/admin/save-data#node.js
- https://firebase.google.com/docs/database/admin/retrieve-data#node.js
