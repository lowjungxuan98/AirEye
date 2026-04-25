import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import type { ServerEnv } from "../configs/env.config";

export function getFirebaseAdminApp(env: ServerEnv): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }
  return initializeApp({
    credential: resolveFirebaseCredential(env),
    projectId: env.FIREBASE_PROJECT_ID,
    databaseURL: env.FIREBASE_DATABASE_URL
  });
}

function resolveFirebaseCredential(env: ServerEnv) {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) {
    return cert(parseServiceAccountFromBase64(env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64));
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS && looksLikeBase64Json(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return cert(parseServiceAccountFromBase64(env.GOOGLE_APPLICATION_CREDENTIALS));
  }

  return applicationDefault();
}

function looksLikeBase64Json(value: string): boolean {
  return value.trim().startsWith("ew");
}

function parseServiceAccountFromBase64(base64: string) {
  try {
    const json = Buffer.from(base64, "base64").toString("utf8");
    const parsed = JSON.parse(json) as {
      project_id?: unknown;
      client_email?: unknown;
      private_key?: unknown;
    };

    if (
      typeof parsed.project_id !== "string" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      throw new Error("missing required service account fields");
    }

    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Invalid Firebase service account base64: ${reason}`);
  }
}
