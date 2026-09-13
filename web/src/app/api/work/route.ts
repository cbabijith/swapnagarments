import type { NextRequest } from "next/server";
import { workQuery, workCommandSchema } from "@/features/team/contracts/team";
import { requireUser } from "@/shared/server/auth";
import { commandHandler } from "@/shared/server/command-handler";
import { parseQuery } from "@/shared/server/query-handler";
import { json, failure } from "@/shared/server/responses";
import { readWork } from "@/services/team-read-service";
export const runtime = "nodejs";
export const POST = commandHandler(workCommandSchema, 10000, true);
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return json(await readWork(parseQuery(request, workQuery), user));
  } catch (error) {
    return failure(error);
  }
}
