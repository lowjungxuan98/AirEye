import { UPLOAD_OBJECT_PREFIX } from "./constants";

/**
 * S3 / S3-compatible storage endpoints.
 *
 * Object operations go through the AWS SDK (`PutObjectCommand`,
 * `GetObjectCommand`, etc.), so signed URLs are not built here. Anything
 * involving an object key path lives in this file so callers don't repeat
 * the `uploads/${...}` prefix.
 */

/** Build the S3 object key for an uploaded image. */
export function buildUploadObjectKey(publicId: string, suffix: string, extension: string): string {
  return `${UPLOAD_OBJECT_PREFIX}/${publicId}-${suffix}${extension}`;
}

/** Extract the upload id (`upl_xxx`) from an object key like `uploads/upl_abc-1234.jpg`. */
export function extractPublicIdFromObjectKey(objectKey: string): string | null {
  const match = new RegExp(`^${UPLOAD_OBJECT_PREFIX}/(upl_[A-Za-z0-9]+)`).exec(objectKey);
  return match ? match[1]! : null;
}
