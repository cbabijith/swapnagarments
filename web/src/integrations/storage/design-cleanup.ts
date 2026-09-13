import "server-only";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { storage } from "./index";
const Bucket = () => process.env.AWS_S3_BUCKET_NAME!;
// Only this feature's immutable upload paths can become cleanup candidates.
export const designObjectPattern =
  /^designs\/1\/(upload-[a-f0-9-]{36})\/([a-f0-9]{64})\/(image|thumbnail)\.webp$/;
export async function oldDesignObjects(cutoff: Date, token?: string) {
  const page = await storage().send(
    new ListObjectsV2Command({
      Bucket: Bucket(),
      Prefix: "designs/1/",
      MaxKeys: 500,
      ContinuationToken: token,
    }),
    { abortSignal: AbortSignal.timeout(15000) },
  );
  return {
    keys: (page.Contents ?? [])
      .filter(
        (o) =>
          o.Key &&
          designObjectPattern.test(o.Key) &&
          o.LastModified &&
          o.LastModified < cutoff,
      )
      .map((o) => o.Key!),
    next: page.NextContinuationToken,
  };
}
export async function deleteOldDesignObject(key: string, cutoff: Date) {
  if (!designObjectPattern.test(key))
    throw new Error("Invalid design cleanup path");
  const current = await storage().send(
    new HeadObjectCommand({ Bucket: Bucket(), Key: key }),
    { abortSignal: AbortSignal.timeout(15000) },
  );
  if (!current.LastModified || current.LastModified >= cutoff) return false;
  await storage().send(
    new DeleteObjectCommand({ Bucket: Bucket(), Key: key }),
    { abortSignal: AbortSignal.timeout(15000) },
  );
  return true;
}
