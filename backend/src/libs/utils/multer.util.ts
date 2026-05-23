import { extname } from "node:path";
import multer from "multer";
import { API_ERROR_MESSAGES, unsupportedFileType } from "./api-error.util";

const IMAGE_MIME_TYPES_BY_EXTENSION: Partial<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff"
};

/** When the multipart part omits a real image/* type (common: application/octet-stream + .jpg). */
export function inferImageMimeTypeFromFilename(originalname: string): string | null {
  return IMAGE_MIME_TYPES_BY_EXTENSION[extname(originalname).toLowerCase()] ?? null;
}

export function createImportImageMulter(maxFileSizeBytes: number): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const inferred = inferImageMimeTypeFromFilename(file.originalname);
      const mt = (file.mimetype ?? "").toLowerCase();

      if (mt === "image/jpg") {
        file.mimetype = "image/jpeg";
        cb(null, true);
        return;
      }

      if (mt.startsWith("image/")) {
        cb(null, true);
        return;
      }

      if (
        (mt === "application/octet-stream" || mt === "binary/octet-stream" || mt === "") &&
        inferred
      ) {
        file.mimetype = inferred;
        cb(null, true);
        return;
      }

      cb(unsupportedFileType(API_ERROR_MESSAGES.unsupportedImageUpload));
    }
  });
}
