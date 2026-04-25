import { describe, expect, it } from "vitest";
import { getFirebaseAdminApp } from "../../../../src/libs/firebase/admin";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";

describe("getFirebaseAdminApp", () => {
  it("returns a stable Firebase Admin app for the loaded environment", () => {
    const env = loadServerEnv();
    const first = getFirebaseAdminApp(env);
    const second = getFirebaseAdminApp(env);
    expect(second).toBe(first);
    expect(first.name).toBeDefined();
  });
});
