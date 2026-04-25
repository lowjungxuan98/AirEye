import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createExportHandler } from "../../../../../src/api/v1/controllers/export.controller";

describe("createExportHandler", () => {
  it("lists items with parsed page and limit from query", async () => {
    const exportService = {
      listItemsPage: vi.fn(async () => ({
        data: [{ createdAt: 1 }],
        page: 2,
        limit: 3,
        is_next: false
      }))
    };
    const handler = createExportHandler(exportService);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    await handler({ query: { page: "2", limit: "3" } } as unknown as Request, res);
    expect(exportService.listItemsPage).toHaveBeenCalledWith(2, 3);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ createdAt: 1 }],
      page: 2,
      limit: 3,
      is_next: false
    });
  });

  it("defaults page to 1 when omitted", async () => {
    const exportService = {
      listItemsPage: vi.fn(async () => ({
        data: [],
        page: 1,
        limit: 20,
        is_next: false
      }))
    };
    const handler = createExportHandler(exportService);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    await handler({ query: {} } as unknown as Request, res);
    expect(exportService.listItemsPage).toHaveBeenCalledWith(1, 20);
  });

  it("propagates invalid limit as ApiError", async () => {
    const exportService = { listItemsPage: vi.fn() };
    const handler = createExportHandler(exportService);
    await expect(
      handler({
        query: { limit: "nope" }
      } as unknown as Request, { status: vi.fn(), json: vi.fn() } as unknown as Response)
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(exportService.listItemsPage).not.toHaveBeenCalled();
  });

  it("propagates invalid page as ApiError", async () => {
    const exportService = { listItemsPage: vi.fn() };
    const handler = createExportHandler(exportService);
    await expect(
      handler({
        query: { page: "0" }
      } as unknown as Request, { status: vi.fn(), json: vi.fn() } as unknown as Response)
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(exportService.listItemsPage).not.toHaveBeenCalled();
  });
});
