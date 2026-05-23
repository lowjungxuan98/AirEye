import { describe, expect, it } from "vitest";
import {
  EXPORT_DEFAULT_LIMIT,
  EXPORT_MAX_LIMIT,
  IMPORT_MAX_IMAGE_BYTES
} from "../../../../src/libs/constants/limits.contant";

describe("limits constants", () => {
  it("exports expected numeric limits", () => {
    expect(EXPORT_DEFAULT_LIMIT).toBe(20);
    expect(EXPORT_MAX_LIMIT).toBe(50);
    expect(IMPORT_MAX_IMAGE_BYTES).toBe(500 * 1024 * 1024);
  });
});
