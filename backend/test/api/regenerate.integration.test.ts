import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/libs/utils/api-error.util";
import {
  AIREYE_API_KEY,
  API_KEY_HEADER,
  buildTestApp,
  createImportServiceWithStubbedPipeline
} from "../test-utils";
import { InMemoryUploadRepository } from "../in-memory-upload-repository";

async function waitFor(predicate: () => boolean | Promise<boolean>): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Timed out waiting for condition");
}

describe("POST /api/v1/regenerate (HTTP integration)", () => {
  it("returns 202 application/json and forwards JSON to ImportService", async () => {
    const queueRegenerate = vi.fn(async () => ({
      status: "queued" as const,
      jobId: "job_1",
      uploadId: "upl_1"
    }));
    const app = buildTestApp({
      importService: {
        queueImport: async () => ({ status: "queued", jobId: "unused", uploadId: "unused" }),
        queueRegenerate
      }
    });

    const res = await request(app)
      .post("/api/v1/regenerate")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg", text: "old" })
      .expect(202);

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: "queued", jobId: "job_1", uploadId: "upl_1" });
    expect(queueRegenerate).toHaveBeenCalledWith({
      imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg",
      text: "old"
    });
  });

  it("wires JSON into ImportService with stubbed background pipeline deps", async () => {
    const repo = new InMemoryUploadRepository();
    await repo.createPendingUpload("upl_integration", {
      createdAt: 100,
      updatedAt: 101,
      finalText: "old",
      imageUrl: "https://storage.example.test/uploads/upl_integration-abc.jpg",
      bucket: "testing",
      objectKey: "uploads/upl_integration-abc.jpg"
    });
    const importService = createImportServiceWithStubbedPipeline({ uploadRepository: repo });
    const app = buildTestApp({ importService });

    const res = await request(app)
      .post("/api/v1/regenerate")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({
        imageUrl: "https://storage.example.test/uploads/upl_integration-abc.jpg",
        text: "old"
      })
      .expect(202);

    expect(res.body).toEqual({
      status: "queued",
      jobId: expect.any(String),
      uploadId: "upl_integration"
    });

    await waitFor(async () => {
      const row = await repo.getUpload("upl_integration");
      return row?.finalText === "reasoned:extracted";
    });

    expect(await repo.getUpload("upl_integration")).toMatchObject({
      id: "upl_integration",
      createdAt: 100,
      finalText: "reasoned:extracted",
      bucket: "testing",
      objectKey: "uploads/upl_integration-abc.jpg",
      imageUrl: "https://storage.example.test/uploads/upl_integration-abc.jpg"
    });
  });

  it("returns 400 INVALID_REQUEST when body is invalid", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/v1/regenerate")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ imageUrl: "" })
      .expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "imageUrl must be a non-empty string" }
    });
  });

  it("maps ApiError from queueRegenerate through the global error handler", async () => {
    const app = buildTestApp({
      importService: {
        queueImport: async () => ({ status: "queued", jobId: "unused", uploadId: "unused" }),
        queueRegenerate: async () => {
          throw new ApiError(404, "NOT_FOUND", "upload not found");
        }
      }
    });
    const res = await request(app)
      .post("/api/v1/regenerate")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" })
      .expect(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "upload not found" }
    });
  });
});
