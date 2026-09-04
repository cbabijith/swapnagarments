import type { createAuth } from "../auth";

export type Auth = ReturnType<typeof createAuth>;

/** Shape returned by `auth.api.getSession` — { session, user }. */
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

/** Hono environment typed for the whole backend. */
export interface AppEnv {
  Variables: {
    session: AuthSession;
  };
}
