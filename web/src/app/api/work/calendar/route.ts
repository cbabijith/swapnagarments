import type { NextRequest } from "next/server";
import { workCalendarMonthQuery } from "@/features/team/contracts/work-calendar";
import { requireUser } from "@/shared/server/auth";
import { parseQuery } from "@/shared/server/query-handler";
import { json, failure } from "@/shared/server/responses";
import { readWorkCalendarMonth } from "@/services/work-calendar-service";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return json(
      await readWorkCalendarMonth(
        parseQuery(request, workCalendarMonthQuery),
        user,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
