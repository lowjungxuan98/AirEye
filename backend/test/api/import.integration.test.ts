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

describe("POST /api/v1/import (HTTP integration)", () => {
  it("returns 202 application/json and forwards multipart data to ImportService", async () => {
    const queueImport = vi.fn(async () => ({
      status: "queued" as const,
      jobId: "job_1",
      uploadId: "upl_1"
    }));
    const app = buildTestApp({
      importService: {
        queueImport,
        queueRegenerate: async () => ({ status: "queued", jobId: "unused", uploadId: "unused" })
      }
    });

    const res = await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: "pixel.png",
        contentType: "image/png"
      })
      .expect(202);

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: "queued", jobId: "job_1", uploadId: "upl_1" });
    expect(queueImport).toHaveBeenCalledTimes(1);
    const arg = queueImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/png");
    expect(Buffer.isBuffer(arg.imageBuffer)).toBe(true);
  });

  it("accepts .jpg when the client sends application/octet-stream (infers image/jpeg)", async () => {
    const queueImport = vi.fn(async () => ({
      status: "queued" as const,
      jobId: "job_mime",
      uploadId: "upl_mime"
    }));
    const app = buildTestApp({
      importService: {
        queueImport,
        queueRegenerate: async () => ({ status: "queued", jobId: "unused", uploadId: "unused" })
      }
    });

    await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "photo.jpg",
        contentType: "application/octet-stream"
      })
      .expect(202);
    expect(queueImport).toHaveBeenCalledTimes(1);
    const arg = queueImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/jpeg");
  });

  it("wires multipart into ImportService with stubbed background pipeline deps (no vendors)", async () => {
    const repo = new InMemoryUploadRepository();
    const importService = createImportServiceWithStubbedPipeline({ uploadRepository: repo });
    const app = buildTestApp({ importService });

    const res = await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .attach("image", Buffer.from("fake-jpeg"), {
        filename: "x.jpg",
        contentType: "image/jpeg"
      })
      .expect(202);

    expect(res.body).toEqual({
      status: "queued",
      jobId: expect.any(String),
      uploadId: "integration_upload_id"
    });

    await waitFor(async () => {
      const row = await repo.getUpload("integration_upload_id");
      return row?.finalText === "reasoned:extracted";
    });

    const row = await repo.getUpload("integration_upload_id");
    expect(row).toMatchObject({
      id: "integration_upload_id",
      createdAt: 4242,
      updatedAt: 4242,
      extractedText: "extracted",
      finalText: "reasoned:extracted",
      bucket: "testing",
      objectKey: expect.any(String),
      imageUrl: expect.any(String)
    });
  });

  it("returns 400 INVALID_REQUEST when the image field is missing", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "image is required" }
    });
  });

  it("returns 415 when the file is not an image (multer fileFilter)", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .attach("image", Buffer.from("%PDF-1.4"), {
        filename: "x.pdf",
        contentType: "application/pdf"
      })
      .expect(415);
    expect(res.body).toEqual({
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "Only image uploads are supported" }
    });
  });

  it("maps ApiError from queueImport through the global error handler", async () => {
    const app = buildTestApp({
      importService: {
        queueImport: async () => {
          throw new ApiError(409, "CONFLICT", "upload id collision");
        },
        queueRegenerate: async () => ({ status: "queued", jobId: "unused", uploadId: "unused" })
      }
    });
    const res = await request(app)
      .post("/api/v1/import")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "m.jpg",
        contentType: "image/jpeg"
      })
      .expect(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: "upload id collision" }
    });
  });
});
