import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, ensureSchema } from "@/db";
import { designAssets } from "@/db/schema/design-library";
import {
  designObjectPattern,
  oldDesignObjects,
  deleteOldDesignObject,
} from "@/integrations/storage/design-cleanup";

/** Operator-only maintenance. Active AND archived library records protect their media forever. */
export async function cleanupDesignUploads(apply = false, now = new Date()) {
  await ensureSchema();
  const cutoff = new Date(now.getTime() - 7 * 86400000);
  let token: string | undefined,
    candidates = 0,
    deleted = 0;
  do {
    const page = await oldDesignObjects(cutoff, token);
    token = page.next;
    for (const key of page.keys) {
      const id = designObjectPattern.exec(key)![1];
      await db().transaction(async (tx) => {
        // The same lock as upload/retry prevents cleanup racing with an in-flight save.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);
        const [asset] = await tx
          .select()
          .from(designAssets)
          .where(and(eq(designAssets.workspaceId, 1), eq(designAssets.id, id)));
        if (asset && (asset.storageKey === key || asset.thumbnailKey === key))
          return;
        candidates++;
        if (apply && (await deleteOldDesignObject(key, cutoff))) deleted++;
      });
    }
  } while (token);
  return {
    mode: apply ? "cleanup" : "check",
    graceDays: 7,
    candidates,
    deleted,
  };
}
