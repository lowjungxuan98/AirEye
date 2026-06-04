# Firebase Cloud Messaging (FCM) - Notification Implementation

Backend implementation guide for AirEye FCM topic messages.

## Current Repo Status

The backend sends FCM topic messages through `FirebaseNotifier` in `backend/src/libs/firebase/client.ts`.

Firebase notification modules:

- `backend/src/libs/firebase/constants.ts` - default topic and allowed payload values
- `backend/src/libs/firebase/type.ts` - payload types
- `backend/src/libs/firebase/endpoint.ts` - FCM message construction
- `backend/src/libs/firebase/client.ts` - Firebase Admin Messaging sender
- `backend/src/libs/firebase/export.ts` - public module exports

The configured topic resolves from `AIREYE_FCM_TOPIC`, then falls back to the AirEye default `aireye_new_result`. Mobile subscribes to the same topic.

## Runtime Messages

| Trigger | FCM kind | Type | Role | Visible notification | Purpose |
|---------|----------|------|------|----------------------|---------|
| `POST /api/v1/send-notification` | `capture_request` | `silent` | `sender` | No | Sender camera should capture and call import. |
| Pending row written during `POST /api/v1/import` | `export_refresh` | `silent` | `receiver` | No | Receiver should call its existing export endpoint function. |
| Successful final row update by the import worker | `export_refresh` | `silent` | `receiver` | No | Receiver should call its existing export endpoint function again. |
| Regenerate worker row refreshes | `export_refresh` | `silent` | `receiver` | No | Receiver should refresh export rows. |

Every payload includes string data values for:

- `kind`
- `notificationType`
- `notification_type`
- `role`
- `targetRole`

## Silent Delivery

`silent` messages are data-only FCM messages. The backend does not attach a top-level `notification` payload. It sets high-priority Android delivery and APNs content-available metadata.

## Firebase Setup

Prereqs:

- Enable the FCM HTTP v1 API for the Firebase project.
- Make service account credentials available to the backend.

Typical local setup:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_DATABASE_URL="https://DATABASE_NAME.firebaseio.com"
```

Hosted deployments can use `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` instead of a filesystem path.

The backend initializes one Firebase Admin app for both FCM and Realtime Database in `backend/src/libs/firebase/admin.ts`.

## Admin SDK Send Shape

Firebase Admin SDK topic sends use `getMessaging(app).send(message)`. Firebase documents that successful sends return a message ID string; AirEye does not expose that ID in API responses today.

Representative silent capture payload:

```ts
buildFcmTopicNotificationMessage("aireye_new_result", {
  kind: "capture_request",
  type: "silent",
  role: "sender"
});
```

Representative receiver refresh payload:

```ts
buildFcmTopicNotificationMessage("aireye_new_result", {
  kind: "export_refresh",
  type: "silent",
  role: "receiver"
});
```

## REST Option

AirEye currently uses `firebase-admin`, not direct REST calls. If REST is needed later, the FCM HTTP v1 endpoint is:

```text
POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
```

The REST API requires OAuth2 authorization. The Admin SDK handles credential loading and token exchange for the current backend.

---

**Updated:** 2026-05-23
**Applies to:** AirEye backend FCM (`backend/src/libs/firebase/`)
**Doc version:** 4
**Upstream refs:**
- https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
- https://firebase.google.com/docs/cloud-messaging/send-message
