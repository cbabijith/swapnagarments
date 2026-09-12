import type { NextRequest } from "next/server";
import { commandSchema } from "@/shared/contracts/command";
import { setupStatus } from "@/services/auth-service";
import {
  readWorkspace,
  executeWorkspaceCommand,
} from "@/services/workspace-service";
import { ownerSession, requireOwner, checkOrigin } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";
import { readBody } from "@/shared/server/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retained for existing clients while feature reads migrate to resource APIs. */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL)
      return json(
        {
          error:
            "The website’s Railway database connection has not been configured.",
        },
        503,
      );
    const owner = await ownerSession(request);
    if (!owner)
      return json({ error: "Please sign in.", ...(await setupStatus()) }, 401);
    return json({ ...(await readWorkspace()), owner });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const owner = await requireOwner(request);
    const input = await readBody(request, commandSchema);
    return json(await executeWorkspaceCommand(input, owner));
  } catch (error) {
    return failure(error);
  }
}
