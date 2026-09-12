import { type NextRequest } from "next/server";
import { z } from "zod";
import { database, ensureSchema } from "@/lib/server/database";
import { ownerSession, checkOrigin } from "@/lib/server/auth";
import { json, failure } from "@/lib/server/responses";
import { applyMutation, WorkspaceError } from "@/lib/workspace-mutations";
import type { Workspace } from "@/lib/workspace";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    await ensureSchema();
    const owner = await ownerSession(request);
    if (!owner) {
      const result = await database().query(
        "SELECT id FROM sg_owner WHERE id = 1",
      );
      return json(
        {
          error: "Please sign in.",
          setupRequired: result.rowCount === 0,
          setupAvailable: Boolean(process.env.SETUP_TOKEN),
        },
        401,
      );
    }
    const result = await database().query(
      "SELECT revision, data FROM sg_workspace WHERE id = 1",
    );
    return json({ ...result.rows[0], owner });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const owner = await ownerSession(request);
    if (!owner) throw new WorkspaceError("Please sign in again.", 401);
    const body = await request.text();
    if (body.length > 100_000)
      throw new WorkspaceError("This request is too large.", 413);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new WorkspaceError("Invalid request.");
    }
    const parsed = z
      .object({ mutationId: z.uuid(), action: z.unknown() })
      .safeParse(payload);
    if (!parsed.success) throw new WorkspaceError("Invalid request.");
    const client = await database().connect();
    try {
      await client.query("BEGIN");
      const snapshot = await client.query<{
        revision: number;
        data: Workspace;
      }>("SELECT revision, data FROM sg_workspace WHERE id = 1 FOR UPDATE");
      const existing = await client.query<{ result_id: string }>(
        "SELECT result_id FROM sg_mutations WHERE id = $1",
        [parsed.data.mutationId],
      );
      if (existing.rowCount) {
        await client.query("COMMIT");
        return json({
          ...snapshot.rows[0],
          resultId: existing.rows[0].result_id,
        });
      }
      const result = applyMutation(
        snapshot.rows[0].data,
        parsed.data.action,
        owner.name,
      );
      const updated = await client.query<{ revision: number }>(
        "UPDATE sg_workspace SET data = $1::jsonb, revision = revision + 1, updated_at = now() WHERE id = 1 RETURNING revision",
        [JSON.stringify(result.data)],
      );
      await client.query(
        "INSERT INTO sg_mutations(id, result_id) VALUES ($1, $2)",
        [parsed.data.mutationId, result.resultId ?? null],
      );
      await client.query("COMMIT");
      return json({
        data: result.data,
        revision: updated.rows[0].revision,
        resultId: result.resultId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return failure(error);
  }
}
