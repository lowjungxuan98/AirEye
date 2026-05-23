/** Default lifetime (seconds) for `GetObject` presigned URLs (7 days). */
export const DEFAULT_PRESIGN_TTL_SECONDS = 7 * 24 * 3600;

/** Folder prefix used for image object keys (`uploads/${publicId}-${suffix}.${ext}`). */
export const UPLOAD_OBJECT_PREFIX = "uploads";

/** Length of the random hex suffix appended to image object keys. */
export const OBJECT_KEY_SUFFIX_LENGTH = 8;

/** Default extension used when the MIME type is unknown and has no usable subtype. */
export const DEFAULT_IMAGE_EXTENSION = ".img";

export const IMAGE_EXTENSIONS_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/tiff": ".tiff",
  "image/webp": ".webp"
};
