import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db, ensureSchema } from "@/db";
import { owners, sessions, authLimits, workspaces } from "@/db/schema";
import { workerAccounts, workerSessions } from "@/db/schema/team";
import type { SessionUser } from "@/features/team/contracts/team";
import { hashPassword, hashToken, secureEqual } from "@/shared/server/crypto";
import { WorkspaceError } from "@/shared/errors";
import type { Credentials } from "@/features/auth/contracts/credentials";
import {
  readStoredWorkspace,
  persistStoredWorkspace,
} from "./workspace-storage";

export async function getOwnerSession(token?: string) {
  await ensureSchema();
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [owner] = await db()
    .select({ name: owners.name, email: owners.email })
    .from(sessions)
    .innerJoin(owners, eq(owners.id, sessions.ownerId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, sql`now()`),
      ),
    );
  return owner ?? null;
}

export async function setupStatus() {
  await ensureSchema();
  const existing = await db()
    .select({ id: owners.id })
    .from(owners)
    .where(eq(owners.id, 1));
  return {
    setupRequired: existing.length === 0,
    setupAvailable: Boolean(process.env.SETUP_TOKEN),
  };
}

export async function getUserSession(
  token?: string,
): Promise<SessionUser | null> {
  const owner = await getOwnerSession(token);
  if (owner) return owner;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [worker] = await db()
    .select({
      name: workerAccounts.name,
      email: workerAccounts.email,
      staffId: workerAccounts.staffId,
    })
    .from(workerSessions)
    .innerJoin(
      workerAccounts,
      eq(workerAccounts.staffId, workerSessions.staffId),
    )
    .where(
      and(
        eq(workerSessions.tokenHash, hashToken(token)),
        gt(workerSessions.expiresAt, sql`now()`),
        eq(workerAccounts.active, true),
      ),
    );
  return worker ? { ...worker, role: "worker" } : null;
}

export async function checkRateLimit() {
  await ensureSchema();
  const bucket = `owner-login-${Math.floor(Date.now() / 900_000)}`;
  const [limit] = await db()
    .insert(authLimits)
    .values({
      bucket,
      attempts: 1,
      expiresAt: sql`now() + interval '20 minutes'`,
    })
    .onConflictDoUpdate({
      target: authLimits.bucket,
      set: { attempts: sql`${authLimits.attempts} + 1` },
    })
    .returning({ attempts: authLimits.attempts });
  if (limit.attempts > 20)
    throw new WorkspaceError(
      "Too many sign-in attempts. Please try again in 15 minutes.",
      429,
    );
  await db()
    .delete(authLimits)
    .where(lt(authLimits.expiresAt, sql`now()`));
}

export async function authenticate(input: Credentials) {
  await ensureSchema();
  if (input.action === "setup") {
    if (
      !process.env.SETUP_TOKEN ||
      !secureEqual(
        hashToken(input.setupToken ?? ""),
        hashToken(process.env.SETUP_TOKEN),
      )
    )
      throw new WorkspaceError("The setup code is invalid.", 403);
    const salt = randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(input.password, salt);
    await db().transaction(async (tx) => {
      const [workspace] = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, 1))
        .for("update");
      const exists = await tx
        .select({ id: owners.id })
        .from(owners)
        .where(eq(owners.id, 1));
      if (exists.length)
        throw new WorkspaceError(
          "The owner account is already set up. Please sign in.",
          409,
        );
      const name = input.name ?? "Shop owner";
      const before = await readStoredWorkspace(tx, workspace);
      await tx.insert(owners).values({
        id: 1,
        name,
        email: input.email.toLowerCase(),
        passwordHash,
        salt,
      });
      const data = {
        ...before,
        staff: [
          {
            id: "owner",
            name,
            role: "Shop owner",
            station: "All stations",
            color: "sage",
          },
        ],
      };
      await persistStoredWorkspace(tx, workspace, before, data);
    });
  } else {
    const [owner] = await db().select().from(owners).where(eq(owners.id, 1));
    if (owner?.email.toLowerCase() !== input.email.toLowerCase()) {
      const [worker] = await db()
        .select()
        .from(workerAccounts)
        .where(eq(workerAccounts.email, input.email.toLowerCase()));
      const passwordHash = await hashPassword(
        input.password,
        worker?.salt ?? "invalid-account-fixed-salt",
      );
      if (
        !worker ||
        !worker.active ||
        !secureEqual(passwordHash, worker.passwordHash)
      )
        throw new WorkspaceError("The email or password is incorrect.", 401);
      const token = randomBytes(32).toString("hex");
      await db()
        .insert(workerSessions)
        .values({
          tokenHash: hashToken(token),
          staffId: worker.staffId,
          expiresAt: sql`now() + interval '7 days'`,
        });
      return token;
    }
    const passwordHash = await hashPassword(
      input.password,
      owner?.salt ?? "invalid-account-fixed-salt",
    );
    if (
      !owner ||
      !secureEqual(passwordHash, owner.passwordHash) ||
      owner.email !== input.email.toLowerCase()
    )
      throw new WorkspaceError("The email or password is incorrect.", 401);
  }
  const token = randomBytes(32).toString("hex");
  await db()
    .insert(sessions)
    .values({
      tokenHash: hashToken(token),
      ownerId: 1,
      expiresAt: sql`now() + interval '7 days'`,
    });
  return token;
}

export async function revokeSession(token?: string) {
  if (!token) return;
  await ensureSchema();
  await db()
    .delete(workerSessions)
    .where(eq(workerSessions.tokenHash, hashToken(token)));
  await db()
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)));
}
