import "server-only";
import type { NextRequest } from "next/server";
import { WorkspaceError } from "@/shared/errors";
import { getOwnerSession } from "@/services/auth-service";

export const COOKIE = "swapna_session";
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new WorkspaceError(
      "This request did not come from the website.",
      403,
    );
}
export const ownerSession = (request: NextRequest) =>
  getOwnerSession(request.cookies.get(COOKIE)?.value);
export async function requireOwner(request: NextRequest) {
  const owner = await ownerSession(request);
  if (!owner) throw new WorkspaceError("Please sign in again.", 401);
  return owner;
}
