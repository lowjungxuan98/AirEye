# S3 / MinIO - implementation notes

Grim stores imported images in an S3-compatible bucket through the AWS SDK for JavaScript v3. The production implementation is `S3ImageStore` in `backend/src/libs/s3/s3.util.ts`.

## Current Repo Status

The backend uses:

- `@aws-sdk/client-s3` for `S3Client`, bucket checks, object uploads, object metadata reads in tests, and cleanup.
- `@aws-sdk/s3-request-presigner` for `getSignedUrl(...)` on uploaded objects.
- `forcePathStyle: true` so MinIO-compatible endpoints work with bucket names in the URL path.

Required environment variables live in `backend/src/libs/configs/env.config.ts`:

- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_REGION`
- `S3_BUCKET_DEVELOPMENT`
- `S3_BUCKET_PRODUCTION`
- `S3_BUCKET_TESTING`
- `S3_PRESIGN_TTL_SECONDS`

`resolveS3Bucket(...)` selects the bucket from `NODE_ENV`: `production` uses `S3_BUCKET_PRODUCTION`, `test` uses `S3_BUCKET_TESTING`, and every other value uses `S3_BUCKET_DEVELOPMENT`.

## Import Upload Behavior

`POST /api/v1/import` accepts a multipart file part named `image`. Multer normalizes common image MIME types in `backend/src/libs/utils/multer.util.ts`, including `.jpg` uploads sent as `application/octet-stream`.

`ImportService` passes the normalized MIME type to `S3ImageStore.uploadImage(...)`. The store:

1. Ensures the bucket exists with `HeadBucketCommand` and `CreateBucketCommand`.
2. Uploads the object with `PutObjectCommand`.
3. Sets `ContentType` from the import MIME type so MinIO/S3 serves the object with the right response header.
4. Adds a MIME-derived extension to new object keys, such as `uploads/upl_abc-a1b2c3d4.jpg`.
5. Returns a presigned `GetObjectCommand` URL using `S3_PRESIGN_TTL_SECONDS`.

Objects uploaded before version `0.1.7` may have no extension and may be missing useful `Content-Type` metadata. Re-upload or rewrite object metadata if an existing object needs corrected headers.

## Persisted Fields

On a successful import, Realtime Database stores:

```json
{
  "imageUrl": "https://minio.example.test/grim-development/uploads/upl_abc-a1b2c3d4.jpg?X-Amz-...",
  "bucket": "grim-development",
  "objectKey": "uploads/upl_abc-a1b2c3d4.jpg"
}
```

`imageUrl` is for client display while the presigned URL is valid. `bucket` and `objectKey` are the durable location for server-side follow-up work.

## Tests And Cleanup

The S3 adapter test is `backend/test/unit-test/libs/s3/s3.util.test.ts`. It uses real credentials from `backend/.env`, creates a real object, verifies `ContentType` with `HeadObjectCommand`, and deletes the object with `DeleteObjectCommand` in `afterAll`.

---

**Updated:** 2026-04-25
**Applies to:** grim backend S3/MinIO storage (`backend/src/libs/s3/s3.util.ts`, `backend/package.json` -> version `0.1.7`)
**Doc version:** 1
**Upstream refs:**
- https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
- https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- https://min.io/docs/minio/linux/reference/s3-api-compatibility.html
