import type { NextRequest } from "next/server";
import { requireOwner, checkOrigin } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";
import { readBody } from "@/shared/server/request";
import {
  libraryQuerySchema,
  assetUpdateSchema,
} from "@/features/design-library/contracts";
import {
  browseDesignLibrary,
  updateDesignAsset,
} from "@/services/design-library-service";
import { WorkspaceError } from "@/shared/errors";
export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const parsed = libraryQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) throw new WorkspaceError("Invalid image search.");
    return json(await browseDesignLibrary(parsed.data));
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    await requireOwner(request);
    return json({
      asset: await updateDesignAsset(
        await readBody(request, assetUpdateSchema),
      ),
    });
  } catch (error) {
    return failure(error);
  }
}
