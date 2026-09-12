import "server-only";
import type { z } from "zod";
import { WorkspaceError } from "@/shared/errors";

export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maximum = 100_000,
): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new WorkspaceError("Invalid request.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new WorkspaceError("This request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new WorkspaceError("Invalid request.");
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues[0]?.message ?? "Invalid request.",
    );
  return parsed.data;
}
