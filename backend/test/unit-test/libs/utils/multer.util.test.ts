import { describe, expect, it } from "vitest";
import { inferImageMimeTypeFromFilename } from "../../../../src/libs/utils/multer.util";

describe("inferImageMimeTypeFromFilename", () => {
  it("maps common extensions", () => {
    expect(inferImageMimeTypeFromFilename("a.JPG")).toBe("image/jpeg");
    expect(inferImageMimeTypeFromFilename("b.jpeg")).toBe("image/jpeg");
    expect(inferImageMimeTypeFromFilename("c.png")).toBe("image/png");
    expect(inferImageMimeTypeFromFilename("d.webp")).toBe("image/webp");
  });

  it("returns null when there is no known image extension", () => {
    expect(inferImageMimeTypeFromFilename("readme")).toBeNull();
    expect(inferImageMimeTypeFromFilename("x.pdf")).toBeNull();
  });
});
