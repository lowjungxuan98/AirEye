import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/libs/utils/api-error.util";
import { buildTestApp, createImportServiceWithStubbedPipeline } from "../test-utils";
import { InMemoryUploadRepository } from "../in-memory-upload-repository";

function parseSseDataLines(body: string): unknown[] {
  return body
    .split(/\n\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const line = block.startsWith("data: ") ? block.slice(6) : block;
      return JSON.parse(line) as unknown;
    });
}

describe("POST /api/v1/import (HTTP integration)", () => {
  it("returns 200 text/event-stream and forwards emits from ImportService", async () => {
    const streamImport = vi.fn(async (_req, emit) => {
      emit({ status: "extracting_text" });
      emit({ status: "analyzing_text" });
      emit({ status: "format_guard" });
      emit({ id: "upl_1", createdAt: 1, updatedAt: 2, finalText: "ok" });
    });
    const app = buildTestApp({ importService: { streamImport } });
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: "pixel.png",
        contentType: "image/png"
      })
      .expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(parseSseDataLines(res.text)).toEqual([
      { status: "extracting_text" },
      { status: "analyzing_text" },
      { status: "format_guard" },
      { id: "upl_1", createdAt: 1, updatedAt: 2, finalText: "ok" }
    ]);
    expect(streamImport).toHaveBeenCalledTimes(1);
    const arg = streamImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/png");
    expect(Buffer.isBuffer(arg.imageBuffer)).toBe(true);
  });

  it("accepts .jpg when the client sends application/octet-stream (infers image/jpeg)", async () => {
    const streamImport = vi.fn(async (_req, emit) => {
      emit({ id: "upl_mime", createdAt: 0, updatedAt: 0, finalText: "ok" });
    });
    const app = buildTestApp({ importService: { streamImport } });
    await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "photo.jpg",
        contentType: "application/octet-stream"
      })
      .expect(200);
    expect(streamImport).toHaveBeenCalledTimes(1);
    const arg = streamImport.mock.calls[0]![0];
    expect(arg.imageMimeType).toBe("image/jpeg");
  });

  it("wires multipart into ImportService with stubbed pipeline deps (no vendors)", async () => {
    const repo = new InMemoryUploadRepository();
    const importService = createImportServiceWithStubbedPipeline({ uploadRepository: repo });
    const app = buildTestApp({ importService });
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from("fake-jpeg"), { filename: "x.jpg", contentType: "image/jpeg" })
      .expect(200);

    const events = parseSseDataLines(res.text);
    expect(events[0]).toEqual({ status: "extracting_text" });
    expect(events[1]).toEqual({ data: { extractedText: "extracted" } });
    expect(events[2]).toEqual({ status: "analyzing_text" });
    expect(events[3]).toEqual({ data: { finalText: "final:extracted" } });
    expect(events[4]).toEqual({ status: "format_guard" });
    expect(events[5]).toEqual({ data: { guardedFinalText: "guarded:final:extracted" } });
    expect(events[6]).toMatchObject({
      id: "integration_upload_id",
      createdAt: 4242,
      updatedAt: 4242,
      extractedText: "extracted",
      finalText: "guarded:final:extracted",
      bucket: "testing",
      objectKey: expect.any(String),
      imageUrl: expect.any(String)
    });

    const row = await repo.getUpload("integration_upload_id");
    expect(row).toMatchObject({
      id: "integration_upload_id",
      createdAt: 4242,
      updatedAt: 4242,
      finalText: "guarded:final:extracted"
    });
  });

  it("returns 400 INVALID_REQUEST when the image field is missing", async () => {
    const app = buildTestApp();
    const res = await request(app).post("/api/v1/import").expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "image is required" }
    });
  });

  it("returns 415 when the file is not an image (multer fileFilter)", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from("%PDF-1.4"), { filename: "x.pdf", contentType: "application/pdf" })
      .expect(415);
    expect(res.body).toEqual({
      error: { code: "UNSUPPORTED_FILE_TYPE", message: "Only image uploads are supported" }
    });
  });

  it("maps ApiError from streamImport through the global error handler when no bytes were sent", async () => {
    const app = buildTestApp({
      importService: {
        streamImport: async () => {
          throw new ApiError(409, "CONFLICT", "upload id collision");
        }
      }
    });
    const res = await request(app)
      .post("/api/v1/import")
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), { filename: "m.jpg", contentType: "image/jpeg" })
      .expect(409);
    expect(res.body).toEqual({
      error: { code: "CONFLICT", message: "upload id collision" }
    });
  });
});
