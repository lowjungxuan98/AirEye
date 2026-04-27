#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/notification.sh [kind] [topic] [--dry-run]

Kinds:
  capture_request Silent sender capture request
  export_refresh  Silent receiver export refresh (default)
  all             Send both test messages in order

Examples:
  ./scripts/notification.sh
  ./scripts/notification.sh all
  ./scripts/notification.sh capture_request grim_new_result
  ./scripts/notification.sh export_refresh --dry-run

Environment:
  Reads backend/.env for FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS,
  and GRIM_FCM_TOPIC. GOOGLE_APPLICATION_CREDENTIALS may be a service-account
  JSON path, raw JSON, or base64-encoded JSON.
USAGE
}

kind="export_refresh"
topic=""
dry_run="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --dry-run)
      dry_run="true"
      shift
      ;;
    capture_request|export_refresh|all)
      kind="$1"
      shift
      ;;
    *)
      if [[ -z "$topic" ]]; then
        topic="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      ;;
  esac
done

if [[ ! -d "$BACKEND_DIR/node_modules/firebase-admin" ]]; then
  echo "Missing backend dependencies. Run: cd backend && npm install" >&2
  exit 1
fi

cd "$BACKEND_DIR"

GRIM_NOTIFICATION_KIND="$kind" \
GRIM_NOTIFICATION_TOPIC="$topic" \
GRIM_NOTIFICATION_DRY_RUN="$dry_run" \
node <<'NODE'
const fs = require("node:fs");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const kind = process.env.GRIM_NOTIFICATION_KIND || "export_refresh";
const topic = process.env.GRIM_NOTIFICATION_TOPIC || process.env.GRIM_FCM_TOPIC || "grim_new_result";
const dryRun = process.env.GRIM_NOTIFICATION_DRY_RUN === "true";

const validKinds = new Set(["capture_request", "export_refresh", "all"]);
if (!validKinds.has(kind)) {
  throw new Error(`Invalid kind: ${kind}`);
}

function stringifyData(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}

function buildMessage(options) {
  const data = stringifyData({
    ...options.data,
    kind: options.kind,
    notificationType: options.type,
    notification_type: options.type,
    role: options.role,
    targetRole: options.role
  });

  const message = {
    topic,
    data,
    android: {
      priority: "high"
    },
    apns: {
      headers: { "apns-priority": "5" },
      payload: {
        aps: { contentAvailable: true }
      }
    }
  };

  return message;
}

const messageOptions = {
  capture_request: {
    kind: "capture_request",
    type: "silent",
    role: "sender"
  },
  export_refresh: {
    kind: "export_refresh",
    type: "silent",
    role: "receiver"
  }
};

const selectedKinds = kind === "all" ? ["capture_request", "export_refresh"] : [kind];
const messages = selectedKinds.map((selectedKind) => buildMessage(messageOptions[selectedKind]));

if (dryRun) {
  console.log(JSON.stringify({ topic, messages }, null, 2));
  process.exit(0);
}

function parseServiceAccount(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }

  if (fs.existsSync(trimmed)) {
    return JSON.parse(fs.readFileSync(trimmed, "utf8"));
  }

  const json = trimmed.startsWith("{")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8");
  return JSON.parse(json);
}

function resolveCredential() {
  const { applicationDefault, cert } = require("firebase-admin/app");
  const configuredCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (configuredCredentials) {
    return cert(parseServiceAccount(configuredCredentials));
  }
  return applicationDefault();
}

async function main() {
  const { getApps, initializeApp } = require("firebase-admin/app");
  const { getMessaging } = require("firebase-admin/messaging");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID in backend/.env");
  }

  const app = getApps()[0] || initializeApp({
    credential: resolveCredential(),
    projectId,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  for (const message of messages) {
    const messageId = await getMessaging(app).send(message);
    console.log(`Sent ${message.data.kind} to topic ${topic}: ${messageId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
NODE
