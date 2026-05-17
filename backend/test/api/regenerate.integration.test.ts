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

describe("POST /api/v1/regenerate (HTTP integration)", () => {
  it("returns 200 text/event-stream and forwards emits from ImportService", async () => {
    const streamRegenerate = vi.fn(async (_req, emit) => {
      emit({ status: "extracting_text" });
      emit({ status: "analyzing_text" });
      emit({ status: "format_guard" });
      emit({ id: "upl_1", createdAt: 1, updatedAt: 2, finalText: "ok" });
    });
    const app = buildTestApp({
      importService: {
        streamImport: async () => {},
        streamRegenerate
      }
    });

    const res = await request(app)
      .post("/api/v1/regenerate")
      .send({ imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg", text: "old" })
      .expect(200);

    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(parseSseDataLines(res.text)).toEqual([
      { status: "extracting_text" },
      { status: "analyzing_text" },
      { status: "format_guard" },
      { id: "upl_1", createdAt: 1, updatedAt: 2, finalText: "ok" }
    ]);
    expect(streamRegenerate).toHaveBeenCalledWith(
      { imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg", text: "old" },
      expect.any(Function)
    );
  });

  it("wires JSON into ImportService with stubbed pipeline deps", async () => {
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
      .send({
        imageUrl: "https://storage.example.test/uploads/upl_integration-abc.jpg",
        text: "old"
      })
      .expect(200);

    const events = parseSseDataLines(res.text);
    expect(events[0]).toEqual({ status: "extracting_text" });
    expect(events[1]).toEqual({ data: { extractedText: "extracted" } });
    expect(events[2]).toEqual({ status: "analyzing_text" });
    expect(events[3]).toEqual({ data: { finalText: "final:extracted" } });
    expect(events[4]).toEqual({ status: "format_guard" });
    expect(events[5]).toEqual({ data: { guardedFinalText: "guarded:final:extracted" } });
    expect(events[6]).toMatchObject({
      id: "upl_integration",
      createdAt: 100,
      finalText: "guarded:final:extracted",
      bucket: "testing",
      objectKey: "uploads/upl_integration-abc.jpg",
      imageUrl: "https://storage.example.test/uploads/upl_integration-abc.jpg"
    });
  });

  it("returns 400 INVALID_REQUEST when body is invalid", async () => {
    const app = buildTestApp();
    const res = await request(app).post("/api/v1/regenerate").send({ imageUrl: "" }).expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "imageUrl must be a non-empty string" }
    });
  });

  it("maps ApiError from streamRegenerate through the global error handler when no bytes were sent", async () => {
    const app = buildTestApp({
      importService: {
        streamImport: async () => {},
        streamRegenerate: async () => {
          throw new ApiError(404, "NOT_FOUND", "upload not found");
        }
      }
    });
    const res = await request(app)
      .post("/api/v1/regenerate")
      .send({ imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" })
      .expect(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "upload not found" }
    });
  });
});
