import type { NextRequest } from "next/server";
import { readWorkHistoryDetail } from "@/services/work-history-service";
import { workHistoryId } from "@/features/team/contracts/work-history";
import { requireUser } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";
import { WorkspaceError } from "@/shared/errors";

export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const id = workHistoryId.safeParse((await params).id);
    if (!id.success) throw new WorkspaceError("Completed work not found.", 404);
    return json(await readWorkHistoryDetail(id.data, user));
  } catch (error) {
    return failure(error);
  }
}
