import { Hono } from "hono";
import { cors } from "hono/cors";
import { getContainer } from "@/core/container";
import { jsonError, jsonOk, toErrorResponse } from "@/core/http";
import { requireSession, type AppEnv } from "@/features/auth";
import { ordersRouter } from "@/features/orders";

/**
 * Hono application assembly: cross-cutting middleware, Better Auth mounting,
 * the versioned API, and the health endpoint.
 */
export function createApp() {
  const { env, eventBus, auth } = getContainer();

  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: [env.WEB_ORIGIN],
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.onError((error, _c) => toErrorResponse(error));
  app.notFound((c) => {
    const url = new URL(c.req.url);
    return jsonError("NOT_FOUND", `No route for ${c.req.method} ${url.pathname}.`, 404);
  });

  app.get("/health", (c) =>
    jsonOk({
      status: "ok",
      app: env.APP_NAME,
      environment: env.NODE_ENV,
      time: new Date().toISOString(),
    }),
  );

  // Better Auth owns /auth/** — sign-up, sign-in, sign-out, session, ...
  const authHandler = (c: { req: { raw: Request } }) => auth.handler(c.req.raw);
  app.on(["POST", "GET"], "/auth/**", authHandler);
  app.on(["POST", "GET"], "/auth", authHandler);

  // Versioned API — every route below requires an authenticated session.
  const api = new Hono<AppEnv>();
  api.use("*", requireSession);

  api.get("/me", (c) => jsonOk(c.get("session").user));

  api.route("/orders", ordersRouter);

  api.get("/events", (c) => {
    const requested = Number.parseInt(c.req.query("limit") ?? "50", 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 50 : requested, 1), 200);
    return jsonOk(eventBus.recentEvents(limit));
  });

  app.route("/api/v1", api);

  return app;
}
