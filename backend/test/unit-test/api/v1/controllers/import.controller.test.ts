import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createImportHandler } from "../../../../../src/api/v1/controllers/import.controller";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

const testImagePngPath = fileURLToPath(new URL("../../../test-image.png", import.meta.url));
const testImagePngBuffer = readFileSync(testImagePngPath);

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

describe("createImportHandler", () => {
  it("throws INVALID_REQUEST when image file is missing", async () => {
    const importService = { streamImport: vi.fn() };
    const handler = createImportHandler(importService);
    const res = { write: vi.fn(), end: vi.fn(), headersSent: false } as unknown as Response;
    await expect(handler({ file: undefined } as unknown as Request, res)).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });
    expect(importService.streamImport).not.toHaveBeenCalled();
  });

  it("streams SSE with service emits when file is present", async () => {
    const importService = {
      streamImport: vi.fn(async (_req, emit) => {
        emit({ status: "extracting_text" });
        emit({ status: "analyzing_text" });
        emit({ status: "format_guard" });
        emit({
          id: "upl_x",
          createdAt: 1,
          updatedAt: 2,
          extractedText: "e",
          finalText: "f",
          imageUrl: "https://i",
          bucket: "b",
          objectKey: "k"
        });
      })
    };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/png" };
    const writes: string[] = [];
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      write: vi.fn((chunk: string) => {
        writes.push(chunk);
        (res as { headersSent: boolean }).headersSent = true;
      }),
      end: vi.fn()
    } as unknown as Response;

    await handler({ file } as unknown as Request, res);

    expect(importService.streamImport).toHaveBeenCalledWith(
      {
        imageBuffer: testImagePngBuffer,
        imageMimeType: file.mimetype
      },
      expect.any(Function)
    );
    const body = writes.join("");
    expect(parseSseDataLines(body)).toEqual([
      { status: "extracting_text" },
      { status: "analyzing_text" },
      { status: "format_guard" },
      {
        id: "upl_x",
        createdAt: 1,
        updatedAt: 2,
        extractedText: "e",
        finalText: "f",
        imageUrl: "https://i",
        bucket: "b",
        objectKey: "k"
      }
    ]);
    expect(res.end).toHaveBeenCalled();
  });

  it("propagates ApiError from the service when headers were not sent", async () => {
    const err = new ApiError(409, "CONFLICT", "nope");
    const importService = { streamImport: vi.fn(async () => Promise.reject(err)) };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/jpeg" };
    const res = {
      headersSent: false,
      write: vi.fn(),
      end: vi.fn()
    } as unknown as Response;
    await expect(handler({ file } as unknown as Request, res)).rejects.toBe(err);
  });

  it("throws INTERNAL_ERROR when streamImport resolves without writing SSE", async () => {
    const importService = { streamImport: vi.fn(async () => {}) };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/jpeg" };
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn()
    } as unknown as Response;

    await expect(handler({ file } as unknown as Request, res)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: "Import produced no stream output"
    });
    expect(res.end).not.toHaveBeenCalled();
  });

  it("ends the response when streamImport throws after headers were sent", async () => {
    const importService = {
      streamImport: vi.fn(async (_req, emit) => {
        emit({ status: "extracting_text" });
        throw new Error("broken");
      })
    };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/jpeg" };
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      write: vi.fn(() => {
        (res as { headersSent: boolean }).headersSent = true;
      }),
      end: vi.fn()
    } as unknown as Response;

    await handler({ file } as unknown as Request, res);

    expect(res.end).toHaveBeenCalled();
  });
});
