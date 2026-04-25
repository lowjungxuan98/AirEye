import { describe, expect, it } from "vitest";
import { getDatabase } from "firebase-admin/database";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";
import { getFirebaseAdminApp } from "../../../../src/libs/firebase/admin";
import { FirebaseUploadRepository, getRealtimeDb } from "../../../../src/libs/firebase/realtime";
import type { GrimUpload } from "../../../../src/api/v1/model/import.model";

function testUploadId(): string {
  return `vitest_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("getRealtimeDb", () => {
  it("returns a database client bound to the Firebase app", () => {
    const env = loadServerEnv();
    const app = getFirebaseAdminApp(env);
    const db = getRealtimeDb(app);
    expect(getDatabase(app)).toBe(db);
    expect(typeof db.ref).toBe("function");
  });
});

describe("FirebaseUploadRepository", () => {
  it("creates, updates, reads, and lists uploads against Realtime Database", async () => {
    const env = loadServerEnv();
    const app = getFirebaseAdminApp(env);
    const db = getRealtimeDb(app);
    const namespace = "development";
    const repo = new FirebaseUploadRepository(db, namespace);
    const id = testUploadId();
    const path = `${namespace}/uploads/${id}`;

    try {
      const base: GrimUpload = { createdAt: Date.now(), updatedAt: Date.now() };
      await repo.createPendingUpload(id, base);
      await expect(repo.getUpload(id)).resolves.toMatchObject({ id, createdAt: base.createdAt });

      await repo.updateUpload(id, { finalText: "integration" });
      await expect(repo.getUpload(id)).resolves.toMatchObject({ id, finalText: "integration" });

      const rows = await repo.listUploads(50);
      expect(rows.length).toBeGreaterThan(0);
      for (let i = 0; i < rows.length - 1; i += 1) {
        expect(rows[i].createdAt).toBeGreaterThanOrEqual(rows[i + 1].createdAt);
      }
    } finally {
      await db.ref(path).remove();
    }

    await expect(repo.getUpload(id)).resolves.toBeNull();
  });
});
