import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import { database, ensureSchema } from "./database";
import { WorkspaceError } from "../workspace-mutations";
const deriveKey = promisify(scrypt);
export const COOKIE = "swapna_session";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(password: string, salt: string) {
  return ((await deriveKey(password, salt, 64)) as Buffer).toString("hex");
}
export function secureEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new WorkspaceError(
      "This request did not come from the website.",
      403,
    );
}
export async function ownerSession(request: NextRequest) {
  await ensureSchema();
  const token = request.cookies.get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await database().query<{ name: string; email: string }>(
    "SELECT o.name, o.email FROM sg_sessions s JOIN sg_owner o ON o.id = s.owner_id WHERE s.token_hash = $1 AND s.expires_at > now()",
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}
export async function createSession() {
  const token = randomBytes(32).toString("hex");
  await database().query(
    "INSERT INTO sg_sessions(token_hash, owner_id, expires_at) VALUES ($1, 1, now() + interval '7 days')",
    [hashToken(token)],
  );
  return token;
}
export async function checkRateLimit(request: NextRequest) {
  // Account-level ceiling is shared by every instance and cannot be bypassed with a forged proxy header.
  const bucket = `owner-login-${Math.floor(Date.now() / 900_000)}`;
  const result = await database().query<{ attempts: number }>(
    "INSERT INTO sg_auth_limits(bucket, attempts, expires_at) VALUES ($1, 1, now() + interval '20 minutes') ON CONFLICT (bucket) DO UPDATE SET attempts = sg_auth_limits.attempts + 1 RETURNING attempts",
    [bucket],
  );
  if (result.rows[0].attempts > 20)
    throw new WorkspaceError(
      "Too many sign-in attempts. Please try again in 15 minutes.",
      429,
    );
  await database().query("DELETE FROM sg_auth_limits WHERE expires_at < now()");
  void request;
}
