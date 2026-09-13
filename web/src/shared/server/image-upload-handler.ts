import "server-only";
import type { NextRequest } from "next/server";
import { checkOrigin, requireOwner } from "./auth";
import { failure, json } from "./responses";
import { WorkspaceError } from "@/shared/errors";
import { uploadMetadataSchema } from "@/features/design-library/contracts";
import { uploadDesignAsset } from "@/services/design-library-service";

export async function imageUploadHandler(request: NextRequest) {
  try {
    checkOrigin(request);
    await requireOwner(request);
    const reader = request.body?.getReader();
    if (!reader) throw new WorkspaceError("Choose an image.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8 * 1024 * 1024 + 16000) {
          await reader.cancel();
          throw new WorkspaceError("Choose an image smaller than 8 MB.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      throw new WorkspaceError("Invalid image upload.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new WorkspaceError("Choose an image.");
    const parsed = uploadMetadataSchema.safeParse({
      id: form.get("id"),
      label: form.get("label"),
      kind: form.get("kind"),
      view: form.get("view"),
    });
    if (!parsed.success)
      throw new WorkspaceError(parsed.error.issues[0].message);
    return json(
      {
        asset: await uploadDesignAsset(
          parsed.data,
          Buffer.from(await file.arrayBuffer()),
        ),
      },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
