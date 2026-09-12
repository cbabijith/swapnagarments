import "server-only";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

export function storageConfigured() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL &&
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function storage() {
  if (!storageConfigured()) throw new Error("STORAGE_NOT_CONFIGURED");
  client ??= new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_DEFAULT_REGION || "auto",
    forcePathStyle: process.env.AWS_S3_URL_STYLE === "path",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    maxAttempts: 2,
    requestHandler: { connectionTimeout: 5_000, requestTimeout: 8_000 },
  });
  return client;
}

/** Read-only verification: no files are created, modified, or listed. */
export async function checkStorage() {
  await storage().send(
    new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME! }),
    { abortSignal: AbortSignal.timeout(10_000) },
  );
}
