import { describe, expect, it } from "vitest";
import { ApiError } from "../../../../src/libs/utils/api-error.util";

describe("ApiError", () => {
  it("sets statusCode, code, message, and name", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("missing");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});
