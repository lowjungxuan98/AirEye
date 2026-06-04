import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeImportImage } from "../../../../src/libs/utils/import-image-normalizer.util";

describe("normalizeImportImage", () => {
  it("leaves images below the target unchanged", async () => {
    const imageBuffer = Buffer.from("small");

    const normalized = await normalizeImportImage(imageBuffer, "image/png", { maxBytes: 10_000 });

    expect(normalized.imageBuffer).toBe(imageBuffer);
    expect(normalized.imageMimeType).toBe("image/png");
  });

  it("compresses oversized images below the target", async () => {
    const width = 900;
    const height = 900;
    const rawPixels = randomBytes(width * height * 3);
    const input = await sharp(rawPixels, {
      raw: { width, height, channels: 3 }
    })
      .png()
      .toBuffer();

    const normalized = await normalizeImportImage(input, "image/png", { maxBytes: 120_000 });
    const metadata = await sharp(normalized.imageBuffer).metadata();

    expect(input.length).toBeGreaterThan(120_000);
    expect(normalized.imageBuffer.length).toBeLessThan(120_000);
    expect(normalized.imageMimeType).toBe("image/jpeg");
    expect(metadata.format).toBe("jpeg");
  });
});
