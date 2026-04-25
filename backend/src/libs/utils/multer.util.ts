import { extname } from "node:path";
import multer from "multer";
import { PROMPT_FILE_MAX_BYTES } from "../constants/limits.contant";
import { ApiError } from "./api-error.util";

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

      cb(new ApiError(415, "UNSUPPORTED_FILE_TYPE", "Only image uploads are supported"));
    }
  });
}

/**
 * Multipart upload for `PUT /api/v1/prompts`: optional file parts **`extract_text`**, **`analyzing_text`**,
 * and **`format_guard`**
 * (UTF-8 `.txt` or `text/*`). At least one part must be supplied in the handler (file buffer or text field).
 */
export function createPromptFilesMulter(): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: PROMPT_FILE_MAX_BYTES, files: 3 },
    fileFilter: (_req, file, cb) => {
      const mt = (file.mimetype ?? "").toLowerCase();
      const ext = extname(file.originalname || "").toLowerCase();

      if (mt.startsWith("text/") || mt === "application/octet-stream" || ext === ".txt" || mt === "") {
        cb(null, true);
        return;
      }

      cb(new ApiError(415, "UNSUPPORTED_FILE_TYPE", "Prompt files must be text/plain, text/*, or .txt"));
    }
  });
}
