import type { NextRequest } from "next/server";
import { requireOwner } from "@/shared/server/auth";
import { failure } from "@/shared/server/responses";
import { readDesignImage } from "@/services/design-library-service";
import { assetId } from "@/features/design-library/contracts";
import { WorkspaceError } from "@/shared/errors";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireOwner(request);
    const parsed = assetId.safeParse((await params).id);
    if (!parsed.success) throw new WorkspaceError("Image not found.", 404);
    const bytes = await readDesignImage(
      parsed.data,
      request.nextUrl.searchParams.get("size") !== "full",
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
