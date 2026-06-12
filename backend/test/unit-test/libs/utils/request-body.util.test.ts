import { describe, expect, it } from "vitest";
import {
  readBoolean,
  readJsonObjectBody,
  readNonEmptyString
} from "../../../../src/libs/utils/request-body.util";

describe("request body helpers", () => {
  it("accepts plain JSON object bodies", () => {
    const body = { imageUrl: " https://example.test/image.jpg " };
    expect(readJsonObjectBody(body)).toBe(body);
    expect(readNonEmptyString(body, "imageUrl")).toBe("https://example.test/image.jpg");
  });

  it("rejects null, arrays, and scalar bodies", () => {
    for (const body of [null, [], "text", 1, false]) {
      expect(() => readJsonObjectBody(body)).toThrow("Expected a JSON object body");
    }
  });

  it("rejects empty string fields", () => {
    expect(() => readNonEmptyString({ imageUrl: " " }, "imageUrl")).toThrow(
      "imageUrl must be a non-empty string"
    );
  });

  it("reads boolean fields", () => {
    expect(readBoolean({ auto_analyse: false }, "auto_analyse")).toBe(false);
    expect(() => readBoolean({ auto_analyse: "false" }, "auto_analyse")).toThrow(
      "auto_analyse must be a boolean"
    );
  });
});
