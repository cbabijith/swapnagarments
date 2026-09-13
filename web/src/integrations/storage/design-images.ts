import "server-only";
import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { storage } from "./index";
import { WorkspaceError } from "@/shared/errors";

export async function processDesignImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > 8 * 1024 * 1024)
    throw new WorkspaceError("Choose an image smaller than 8 MB.", 413);
  const validSignature =
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP");
  if (!validSignature)
    throw new WorkspaceError(
      "Use a valid, still JPG, PNG or WebP image, up to 20 megapixels.",
    );
  try {
    const source = sharp(bytes, {
      limitInputPixels: 20_000_000,
      failOn: "warning",
    });
    const meta = await source.metadata();
    if (
      !meta.format ||
      !["jpeg", "png", "webp"].includes(meta.format) ||
      (meta.pages ?? 1) > 1
    )
      throw new Error("Unsupported image");
    // Orientation is baked into pixels; EXIF/location metadata is not copied.
    const image = await source
      .rotate()
      .resize(1200, 1500, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    const thumbnail = await sharp(image)
      .resize(256, 320, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { image, thumbnail };
  } catch {
    throw new WorkspaceError(
      "Use a valid, still JPG, PNG or WebP image, up to 20 megapixels.",
    );
  }
}
export async function putDesignImages(
  id: string,
  checksum: string,
  images: { image: Buffer; thumbnail: Buffer },
) {
  const storageKey = `designs/1/${id}/${checksum}/image.webp`,
    thumbnailKey = `designs/1/${id}/${checksum}/thumbnail.webp`;
  try {
    for (const [Key, Body] of [
      [storageKey, images.image],
      [thumbnailKey, images.thumbnail],
    ] as const)
      await storage().send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key,
          Body,
          ContentType: "image/webp",
        }),
        { abortSignal: AbortSignal.timeout(15000) },
      );
    return { storageKey, thumbnailKey };
  } catch {
    throw new WorkspaceError(
      "The image could not be uploaded. Your file is still selected; retry when the connection is ready.",
      503,
    );
  }
}
export async function getDesignImage(key: string) {
  try {
    const result = await storage().send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      }),
      { abortSignal: AbortSignal.timeout(15000) },
    );
    if (!result.Body) throw new Error("Missing image");
    return result.Body.transformToByteArray();
  } catch {
    throw new WorkspaceError("This image could not be loaded. Try again.", 503);
  }
}
