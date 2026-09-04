import type { MiddlewareHandler } from "hono";
import { getContainer } from "@/core/container";
import { jsonError } from "@/core/http";
import type { AppEnv } from "./hono-env";

/**
 * Guards API routes: resolves the Better Auth session from the request
 * (cookie or bearer token) and rejects unauthenticated calls with 401.
 * Handlers access the session via `c.get("session")`.
 */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await getContainer().auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return jsonError("UNAUTHORIZED", "Authentication required. Please sign in.", 401);
  }
  c.set("session", session);
  await next();
};
