import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { database, ensureSchema } from "@/lib/server/database";
import {
  checkOrigin,
  hashPassword,
  secureEqual,
  createSession,
  COOKIE,
  hashToken,
  checkRateLimit,
} from "@/lib/server/auth";
import { json, failure } from "@/lib/server/responses";
import { WorkspaceError } from "@/lib/workspace-mutations";
export const runtime = "nodejs";
const credentials = z.object({
  action: z.enum(["setup", "signin"]),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(150),
  password: z.string().min(12).max(128),
  setupToken: z.string().max(200).optional(),
});
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await ensureSchema();
    await checkRateLimit(request);
    const body = await request.text();
    if (body.length > 4096)
      throw new WorkspaceError("Invalid sign-in request.");
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new WorkspaceError("Invalid sign-in request.");
    }
    const parsed = credentials.safeParse(payload);
    if (!parsed.success)
      throw new WorkspaceError(
        "Enter a valid email and a password of at least 12 characters.",
      );
    const input = parsed.data;
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
      const client = await database().connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT id FROM sg_workspace WHERE id = 1 FOR UPDATE",
        );
        const exists = await client.query(
          "SELECT id FROM sg_owner WHERE id = 1",
        );
        if (exists.rowCount)
          throw new WorkspaceError(
            "The owner account is already set up. Please sign in.",
            409,
          );
        await client.query(
          "INSERT INTO sg_owner (id, name, email, password_hash, salt) VALUES (1, $1, $2, $3, $4)",
          [
            input.name ?? "Shop owner",
            input.email.toLowerCase(),
            passwordHash,
            salt,
          ],
        );
        await client.query(
          "UPDATE sg_workspace SET data = jsonb_set(data, '{staff}', $1::jsonb), revision = revision + 1 WHERE id = 1",
          [
            JSON.stringify([
              {
                id: "owner",
                name: input.name ?? "Shop owner",
                role: "Shop owner",
                station: "All stations",
                color: "sage",
              },
            ]),
          ],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else {
      const result = await database().query<{
        email: string;
        password_hash: string;
        salt: string;
      }>("SELECT email, password_hash, salt FROM sg_owner WHERE id = 1");
      const owner = result.rows[0];
      const passwordHash = await hashPassword(
        input.password,
        owner?.salt ?? "invalid-account-fixed-salt",
      );
      if (
        !owner ||
        !secureEqual(passwordHash, owner.password_hash) ||
        owner.email !== input.email.toLowerCase()
      )
        throw new WorkspaceError("The email or password is incorrect.", 401);
    }
    const token = await createSession();
    const response = json({ success: true });
    response.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    const token = request.cookies.get(COOKIE)?.value;
    if (token) {
      await ensureSchema();
      await database().query("DELETE FROM sg_sessions WHERE token_hash = $1", [
        hashToken(token),
      ]);
    }
    const response = json({ success: true });
    response.cookies.set(COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
