import { describe, expect, it } from "vitest";
import { toPublicExportListItem } from "../../../../../src/api/v1/model/export.model";
import type { GrimUploadRow } from "../../../../../src/api/v1/model/import.model";

describe("toPublicExportListItem", () => {
  it("returns base fields when row has no error and no completed image", () => {
    const row: GrimUploadRow = {
      id: "upl_1",
      createdAt: 1,
      updatedAt: 2
    };
    expect(toPublicExportListItem(row)).toEqual({ createdAt: 1 });
  });

  it("includes error path when errorMessage is set", () => {
    const row: GrimUploadRow = {
      id: "upl_1",
      createdAt: 1,
      updatedAt: 2,
      errorMessage: "boom"
    };
    expect(toPublicExportListItem(row)).toEqual({
      createdAt: 1,
      updatedAt: 2,
      errorMessage: "boom"
    });
  });

  it("includes finalText and imageUrl when both are defined", () => {
    const row: GrimUploadRow = {
      id: "upl_1",
      createdAt: 1,
      updatedAt: 2,
      imageUrl: "https://example.com/x",
      finalText: "hello"
    };
    expect(toPublicExportListItem(row)).toEqual({
      createdAt: 1,
      updatedAt: 2,
      finalText: "hello",
      imageUrl: "https://example.com/x"
    });
  });
});
