import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, ensureBucketExists, S3ImageStore } from "../../../../src/libs/s3/s3.util";
import { loadServerEnv, resolveS3Bucket } from "../../../../src/libs/configs/env.config";

describe("S3 util (MinIO)", () => {
  const env = loadServerEnv();
  const bucket = resolveS3Bucket(env);
  const client = createS3Client({
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION
  });

  const createdKeys: string[] = [];

  afterAll(async () => {
    await Promise.all(
      createdKeys.map((Key) =>
        client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key
          })
        )
      )
    );
  });

  it("ensures the testing bucket exists", async () => {
    await expect(ensureBucketExists(client, bucket)).resolves.toBeUndefined();
  });

  it("uploads an image and returns a presigned URL", async () => {
    await ensureBucketExists(client, bucket);
    const store = new S3ImageStore(
      {
        endpoint: env.S3_ENDPOINT,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        region: env.S3_REGION,
        bucket,
        presignTtlSeconds: env.S3_PRESIGN_TTL_SECONDS
      },
      client
    );

    const out = await store.uploadImage(
      Buffer.from("test"),
      `upl_${randomUUID().slice(0, 8)}`,
      "image/jpeg"
    );
    createdKeys.push(out.objectKey);
    expect(out.bucket).toBe(bucket);
    expect(out.objectKey).toMatch(/^uploads\/.+\.jpg$/);
    expect(out.imageUrl).toMatch(/^https?:\/\//);
    await expect(
      client.send(new HeadObjectCommand({ Bucket: bucket, Key: out.objectKey }))
    ).resolves.toMatchObject({
      ContentType: "image/jpeg"
    });
  });
});
