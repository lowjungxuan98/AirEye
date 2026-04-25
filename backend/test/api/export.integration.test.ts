import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ExportService } from "../../src/api/v1/services/export.service";
import { ApiError } from "../../src/libs/utils/api-error.util";
import { EXPORT_MAX_LIMIT } from "../../src/libs/constants/limits.contant";
import { buildTestApp, silentLogger } from "../test-utils";
import { InMemoryUploadRepository } from "../in-memory-upload-repository";

type ExportResponseBody = {
  data: Array<{ createdAt: number }>;
  page: number;
  limit: number;
  is_next: boolean;
};

async function buildExportApp(createdAts: number[]): Promise<ReturnType<typeof buildTestApp>> {
  const repo = new InMemoryUploadRepository();

  for (const [index, createdAt] of createdAts.entries()) {
    await repo.createPendingUpload(`id_${index}`, { createdAt, updatedAt: createdAt });
  }

  return buildTestApp({ exportService: new ExportService(repo) });
}

function responseCreatedAts(body: ExportResponseBody): number[] {
  return body.data.map(({ createdAt }) => createdAt);
}

describe("GET /api/v1/export (HTTP integration)", () => {
  it("returns 200 with empty data and pagination fields when there are no uploads", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/v1/export").expect(200);
    expect(res.body).toEqual({
      data: [],
      page: 1,
      limit: 20,
      is_next: false
    });
  });

  it("returns rows sorted by createdAt descending (newest first)", async () => {
    const app = await buildExportApp([100, 300, 200]);
    const res = await request(app).get("/api/v1/export").expect(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body).toMatchObject({ page: 1, limit: 20, is_next: false });
    expect(responseCreatedAts(res.body)).toEqual([300, 200, 100]);
  });

  it("caps limit at EXPORT_MAX_LIMIT", async () => {
    const app = await buildExportApp(
      Array.from({ length: EXPORT_MAX_LIMIT + 5 }, (_, index) => index + 1)
    );
    const res = await request(app).get(`/api/v1/export?limit=${EXPORT_MAX_LIMIT + 10}`).expect(200);
    expect(res.body.data).toHaveLength(EXPORT_MAX_LIMIT);
    expect(res.body).toMatchObject({ page: 1, limit: EXPORT_MAX_LIMIT, is_next: true });
  });

  it("returns page 2 slice and is_next when more rows exist", async () => {
    const app = await buildExportApp([100, 200, 300, 400]);
    const res = await request(app).get("/api/v1/export?page=2&limit=2").expect(200);
    expect(responseCreatedAts(res.body)).toEqual([200, 100]);
    expect(res.body).toMatchObject({ page: 2, limit: 2, is_next: false });
  });

  it("sets is_next true on page 1 when a further page exists", async () => {
    const app = await buildExportApp([100, 200, 300]);
    const res = await request(app).get("/api/v1/export?page=1&limit=2").expect(200);
    expect(responseCreatedAts(res.body)).toEqual([300, 200]);
    expect(res.body.is_next).toBe(true);
  });

  it("returns 400 for a non-numeric limit query", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/v1/export?limit=not-a-number").expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "limit must be a positive integer" }
    });
  });

  it("returns 400 for a non-numeric page query", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/v1/export?page=not-a-number").expect(400);
    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "page must be a positive integer" }
    });
  });

  it("returns a stable ApiError payload when listUploads rejects with ApiError", async () => {
    const repo = new InMemoryUploadRepository();
    vi.spyOn(repo, "listUploads").mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE", "storage offline"));
    const app = buildTestApp({ exportService: new ExportService(repo) });
    const res = await request(app).get("/api/v1/export").expect(503);
    expect(res.body).toEqual({
      error: { code: "UNAVAILABLE", message: "storage offline" }
    });
  });

  it("returns 500 INTERNAL_ERROR and logs for unexpected errors", async () => {
    const logger = { ...silentLogger, error: vi.fn() };
    const repo = new InMemoryUploadRepository();
    vi.spyOn(repo, "listUploads").mockRejectedValueOnce(new Error("unexpected boom"));
    const app = buildTestApp({ exportService: new ExportService(repo), logger });
    const res = await request(app).get("/api/v1/export").expect(500);
    expect(res.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" }
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
