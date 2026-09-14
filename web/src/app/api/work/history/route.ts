import type { NextRequest } from "next/server";
import { workHistoryQuery } from "@/features/team/contracts/work-history";
import { requireUser } from "@/shared/server/auth";
import { parseQuery } from "@/shared/server/query-handler";
import { json, failure } from "@/shared/server/responses";
import { readWorkHistory } from "@/services/work-history-service";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return json(
      await readWorkHistory(parseQuery(request, workHistoryQuery), user),
    );
  } catch (error) {
    return failure(error);
  }
}
