import sharp from "sharp";
import { IMPORT_STORAGE_MAX_IMAGE_BYTES } from "../constants/limits.contant";
import { API_ERROR_MESSAGES, invalidRequest } from "./api-error.util";

export type NormalizedImportImage = {
  imageBuffer: Buffer;
  imageMimeType: string;
};

export type NormalizeImportImageOptions = {
  maxBytes?: number;
};

const OUTPUT_MIME_TYPE = "image/jpeg";
const OUTPUT_QUALITIES = [85, 75, 65, 55, 45, 35, 25, 15];
const SCALE_FACTOR = 0.75;
const MIN_LONG_EDGE_PX = 512;

export async function normalizeImportImage(
  imageBuffer: Buffer,
  imageMimeType: string,
  options: NormalizeImportImageOptions = {}
): Promise<NormalizedImportImage> {
  const maxBytes = options.maxBytes ?? IMPORT_STORAGE_MAX_IMAGE_BYTES;
  if (imageBuffer.length < maxBytes) {
    return { imageBuffer, imageMimeType };
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(imageBuffer).metadata();
  } catch {
    throw invalidRequest(API_ERROR_MESSAGES.unsupportedImageUpload);
  }
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdge = Math.max(width, height);
  let scale = 1;
  let smallest: Buffer | null = null;

  while (scale === 1 || Math.round(longEdge * scale) >= MIN_LONG_EDGE_PX) {
    for (const quality of OUTPUT_QUALITIES) {
      const output = await renderJpeg(imageBuffer, width, height, scale, quality);
      if (!smallest || output.length < smallest.length) {
        smallest = output;
      }
      if (output.length < maxBytes) {
        return { imageBuffer: output, imageMimeType: OUTPUT_MIME_TYPE };
      }
    }

    if (longEdge === 0) break;
    scale *= SCALE_FACTOR;
  }

  throw invalidRequest(API_ERROR_MESSAGES.imageReductionFailed);
}

async function renderJpeg(
  imageBuffer: Buffer,
  width: number,
  height: number,
  scale: number,
  quality: number
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer).rotate().flatten({ background: "#ffffff" });

  if (scale < 1 && width > 0 && height > 0) {
    pipeline = pipeline.resize({
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      fit: "inside",
      withoutEnlargement: true
    });
  }

  return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
}
