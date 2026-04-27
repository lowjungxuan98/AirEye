# Firebase Cloud Messaging (FCM) - notification implementation

Backend implementation guide for Grim FCM topic messages.

## Current repo status

The backend sends FCM topic messages through `FirebaseNotifier` in `backend/src/libs/firebase/fcm.ts`.

Shared payload construction lives in `backend/src/libs/utils/notification.util.ts`:

- notification type: `silent`
- target role: `sender` or `receiver`
- notification kind: `capture_request` or `export_refresh`

The configured topic defaults to `grim_new_result`; override with server env `GRIM_FCM_TOPIC`. Mobile must subscribe to the same topic.

## Runtime messages

| Trigger | FCM kind | Type | Role | Visible notification | Purpose |
|---------|----------|------|------|----------------------|---------|
| `POST /api/v1/capture` | `capture_request` | `silent` | `sender` | No | Sender camera should capture and call import. |
| Pending row written during `POST /api/v1/import` | `export_refresh` | `silent` | `receiver` | No | Receiver should call its existing export endpoint function. |
| Successful final row update during `POST /api/v1/import` | `export_refresh` | `silent` | `receiver` | No | Receiver should call its existing export endpoint function again. |

Every payload includes string data values for:

- `kind`
- `notificationType`
- `notification_type`
- `role`
- `targetRole`

## Silent delivery

`silent` messages are data-only FCM messages. The backend does not attach a top-level `notification` payload. It sets high-priority Android delivery and APNs content-available metadata.

## Firebase setup

Prereqs:

- Enable the FCM HTTP v1 API for the Firebase project.
- Make service account credentials available to the backend.

Typical local setup:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_DATABASE_URL="https://DATABASE_NAME.firebaseio.com"
```

Hosted deployments can use **`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`** instead of a filesystem path.

The backend initializes one Firebase Admin app for both FCM and Realtime Database in `backend/src/libs/firebase/admin.ts`.

## Admin SDK send shape

Firebase Admin SDK topic sends use `getMessaging(app).send(message)`. Firebase documents that successful sends return a message ID string; Grim does not expose that ID in API responses today.

Representative Grim silent capture payload:

```ts
buildFcmTopicNotificationMessage("grim_new_result", {
  kind: "capture_request",
  type: "silent",
  role: "sender"
});
```

Representative Grim receiver refresh payload:

```ts
buildFcmTopicNotificationMessage("grim_new_result", {
  kind: "export_refresh",
  type: "silent",
  role: "receiver"
});
```

## REST option

Grim currently uses `firebase-admin`, not direct REST calls. If REST is needed later, the FCM HTTP v1 endpoint is:

```text
POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
```

The REST API requires OAuth2 authorization. The Admin SDK handles credential loading and token exchange for the current backend.

---

**Updated:** 2026-04-24
**Applies to:** grim backend FCM (`backend/src/libs/firebase/fcm.ts`, `backend/src/libs/utils/notification.util.ts`)
**Doc version:** 3
**Upstream refs:**
- https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
- https://firebase.google.com/docs/cloud-messaging/send-message
