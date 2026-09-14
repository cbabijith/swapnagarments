import type { NextRequest } from "next/server";
import { workCalendarDayQuery } from "@/features/team/contracts/work-calendar";
import { requireUser } from "@/shared/server/auth";
import { parseQuery } from "@/shared/server/query-handler";
import { json, failure } from "@/shared/server/responses";
import { readWorkCalendarDay } from "@/services/work-calendar-service";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return json(
      await readWorkCalendarDay(
        parseQuery(request, workCalendarDayQuery),
        user,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
