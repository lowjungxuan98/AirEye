import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../src/libs/utils/api-error.util";
import {
  buildPaginatedSlice,
  listUploadsFetchSize,
  parsePage
} from "../../../../src/libs/utils/pagination.util";

describe("parsePage", () => {
  it("returns 1 when page is omitted", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it("parses a positive integer string", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("throws INVALID_REQUEST for non-numeric strings", () => {
    expect(() => parsePage("abc")).toThrow(ApiError);
  });

  it("throws for zero", () => {
    expect(() => parsePage("0")).toThrow(ApiError);
  });
});

describe("buildPaginatedSlice", () => {
  it("returns the page slice and sets is_next when another page exists", () => {
    expect(buildPaginatedSlice([4, 3, 2], 1, 2)).toEqual({
      data: [4, 3],
      is_next: true
    });
  });

  it("returns an empty slice when the page starts beyond the data", () => {
    expect(buildPaginatedSlice([4, 3, 2], 3, 2)).toEqual({
      data: [],
      is_next: false
    });
  });
});

describe("listUploadsFetchSize", () => {
  it("requests enough rows for the target page plus one lookahead row", () => {
    expect(listUploadsFetchSize(3, 2)).toBe(7);
  });
});
