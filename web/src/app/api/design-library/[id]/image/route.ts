import type { NextRequest } from "next/server";
import { requireUser } from "@/shared/server/auth";
import { failure } from "@/shared/server/responses";
import { readAccessibleWorkImage } from "@/services/work-image-service";
import { assetId } from "@/features/design-library/contracts";
import { WorkspaceError } from "@/shared/errors";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const parsed = assetId.safeParse((await params).id);
    if (!parsed.success) throw new WorkspaceError("Image not found.", 404);
    const bytes = await readAccessibleWorkImage(
      parsed.data,
      request.nextUrl.searchParams.get("size") !== "full",
      request.nextUrl.searchParams.get("work"),
      user,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
