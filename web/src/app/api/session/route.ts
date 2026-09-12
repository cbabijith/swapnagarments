import type { NextRequest } from "next/server";
import { setupStatus } from "@/services/auth-service";
import { ownerSession } from "@/shared/server/auth";
import { json, failure } from "@/shared/server/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authenticate the browser without downloading the shop's records. */
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
    return json({ owner });
  } catch (error) {
    return failure(error);
  }
}
