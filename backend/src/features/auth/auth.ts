import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { EventBus } from "@/core/events";
import type { AppEventMap } from "@/core/events/app-events";
import type { Logger } from "@/core/logging/logger";
import type { Env } from "@/core/config/env";
import type { DrizzleDb } from "./infrastructure/database";
import { AUTH_EVENTS } from "./domain/auth-events";

export interface CreateAuthDeps {
  db: DrizzleDb;
  bus: EventBus<AppEventMap>;
  logger: Logger;
  env: Env;
}

/**
 * Better Auth instance factory. Staff authentication (email + password,
 * sessions) for the API. Signup of a new user publishes `auth.user.created`
 * on the application event bus — auth changes join the same event-driven
 * flow as the rest of the system.
 */
export function createAuth(deps: CreateAuthDeps) {
  return betterAuth({
    secret: deps.env.BETTER_AUTH_SECRET,
    baseURL: deps.env.BETTER_AUTH_URL,
    trustedOrigins: [deps.env.WEB_ORIGIN],
    database: drizzleAdapter(deps.db, { provider: "sqlite" }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            deps.logger.info("Auth user created", { userId: user.id, email: user.email });
            await deps.bus.publish(
              AUTH_EVENTS.userCreated,
              { userId: user.id, name: user.name, email: user.email },
              { actorId: "system" },
            );
          },
        },
      },
    },
  });
}
