import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";
import {
  ExportService,
  parseExportLimit
} from "../../../../../src/api/v1/services/export.service";
import { EXPORT_DEFAULT_LIMIT, EXPORT_MAX_LIMIT } from "../../../../../src/libs/constants/limits.contant";
import type { GrimUploadRow } from "../../../../../src/api/v1/model/import.model";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";

async function createUploadRepository(rows: GrimUploadRow[]): Promise<InMemoryUploadRepository> {
  const repository = new InMemoryUploadRepository();

  for (const { id, ...upload } of rows) {
    await repository.createPendingUpload(id, upload);
  }

  return repository;
}

describe("parseExportLimit", () => {
  it("returns default when limit is omitted", () => {
    expect(parseExportLimit(undefined)).toBe(EXPORT_DEFAULT_LIMIT);
  });

  it("parses a positive integer string", () => {
    expect(parseExportLimit("5")).toBe(5);
  });

  it("caps at EXPORT_MAX_LIMIT", () => {
    expect(parseExportLimit(String(EXPORT_MAX_LIMIT + 10))).toBe(EXPORT_MAX_LIMIT);
  });

  it("throws INVALID_REQUEST for non-numeric strings", () => {
    expect(() => parseExportLimit("abc")).toThrow(ApiError);
    try {
      parseExportLimit("abc");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("INVALID_REQUEST");
    }
  });

  it("throws for zero or negative values", () => {
    expect(() => parseExportLimit("0")).toThrow(ApiError);
    expect(() => parseExportLimit("-1")).toThrow(ApiError);
  });
});

describe("ExportService", () => {
  it("maps repository rows to public list items for page 1", async () => {
    const uploads = await createUploadRepository([
      { id: "a", createdAt: 10, updatedAt: 11, finalText: "t", imageUrl: "u" }
    ]);
    const listUploads = vi.spyOn(uploads, "listUploads");
    const service = new ExportService(uploads);
    const result = await service.listItemsPage(1, 1);
    expect(listUploads).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      data: [{ createdAt: 10, updatedAt: 11, finalText: "t", imageUrl: "u" }],
      page: 1,
      limit: 1,
      is_next: false
    });
  });

  it("requests page * limit + 1 rows and sets is_next when another page exists", async () => {
    const uploads = await createUploadRepository([
      { id: "new", createdAt: 30, updatedAt: 30, finalText: "n", imageUrl: "u3" },
      { id: "mid", createdAt: 20, updatedAt: 20, finalText: "m", imageUrl: "u2" },
      { id: "old", createdAt: 10, updatedAt: 10, finalText: "o", imageUrl: "u1" }
    ]);
    const listUploads = vi.spyOn(uploads, "listUploads");
    const service = new ExportService(uploads);
    const result = await service.listItemsPage(1, 2);
    expect(listUploads).toHaveBeenCalledWith(3);
    expect(result.data).toEqual([
      { createdAt: 30, updatedAt: 30, finalText: "n", imageUrl: "u3" },
      { createdAt: 20, updatedAt: 20, finalText: "m", imageUrl: "u2" }
    ]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.is_next).toBe(true);
  });

  it("returns second page slice", async () => {
    const uploads = await createUploadRepository([
      { id: "new", createdAt: 30, updatedAt: 30, finalText: "n", imageUrl: "u3" },
      { id: "mid", createdAt: 20, updatedAt: 20, finalText: "m", imageUrl: "u2" },
      { id: "old", createdAt: 10, updatedAt: 10, finalText: "o", imageUrl: "u1" }
    ]);
    const listUploads = vi.spyOn(uploads, "listUploads");
    const service = new ExportService(uploads);
    const result = await service.listItemsPage(2, 2);
    expect(listUploads).toHaveBeenCalledWith(5);
    expect(result.data).toEqual([
      { createdAt: 10, updatedAt: 10, finalText: "o", imageUrl: "u1" }
    ]);
    expect(result.is_next).toBe(false);
  });
});
