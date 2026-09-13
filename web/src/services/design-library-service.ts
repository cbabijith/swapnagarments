import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, eq, ilike, inArray, sql } from "drizzle-orm";
import { db, ensureSchema, type DatabaseTransaction } from "@/db";
import { designAssets } from "@/db/schema/design-library";
import {
  builtinAssets,
  builtinById,
} from "@/features/design-library/domain/registry";
import type { AssetMap } from "@/features/design-library/domain/designs";
import {
  assetUpdateSchema,
  uploadMetadataSchema,
  type DesignAsset,
  type LibraryPage,
  type LibraryQuery,
} from "@/features/design-library/contracts";
import type { z } from "zod";
import { WorkspaceError } from "@/shared/errors";
import {
  getDesignImage,
  processDesignImage,
  putDesignImages,
} from "@/integrations/storage/design-images";

type Row = typeof designAssets.$inferSelect;
const publicAsset = (row: Row): DesignAsset => ({
  id: row.id,
  label: row.label,
  kind: row.kind,
  view: row.view,
  source: row.source,
  family: builtinById[row.id]?.family ?? "my-images",
  aliases: builtinById[row.id]?.aliases ?? [],
  active: row.active,
  favourite: row.favourite,
  revision: row.revision,
});
export async function resolveDesignAssets(
  tx: DatabaseTransaction,
  ids: string[],
): Promise<AssetMap> {
  const unique = [...new Set(ids)];
  if (unique.length > 2500)
    throw new WorkspaceError("Too many image references in one update.");
  const result: AssetMap = { ...builtinById };
  if (unique.length) {
    const rows = await tx
      .select()
      .from(designAssets)
      .where(
        and(eq(designAssets.workspaceId, 1), inArray(designAssets.id, unique)),
      )
      .for("share");
    for (const row of rows) result[row.id] = publicAsset(row);
  }
  return result;
}
// Only permanent image IDs are accepted. Client URLs and labels never authorize a file.
export function collectDesignIds(value: unknown): string[] {
  if (typeof value === "string")
    return /^(garment-|detail-|upload-)/.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectDesignIds);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(collectDesignIds);
  return [];
}
export async function browseDesignLibrary(
  query: LibraryQuery,
): Promise<LibraryPage> {
  await ensureSchema();
  return db().transaction(async (tx) => {
    const prefs = await tx
      .select()
      .from(designAssets)
      .where(
        and(
          eq(designAssets.workspaceId, 1),
          eq(designAssets.source, "builtin"),
        ),
      );
    const overrides = new Map(prefs.map((r) => [r.id, publicAsset(r)]));
    const q = query.q.trim().toLowerCase();
    const ids = query.ids ? query.ids.split(",").slice(0, 40) : null;
    const builtins = (query.source === "upload" ? [] : builtinAssets)
      .map((a) => overrides.get(a.id) ?? a)
      .filter(
        (a) =>
          (!ids || ids.includes(a.id)) &&
          (query.kind === "all" || a.kind === query.kind) &&
          (!query.family || a.family === query.family) &&
          (query.source === "archived" ? !a.active : a.active) &&
          (query.source !== "favourite" || a.favourite) &&
          (!q || `${a.label} ${a.aliases.join(" ")}`.toLowerCase().includes(q)),
      );
    const where = and(
      eq(designAssets.workspaceId, 1),
      eq(designAssets.source, "upload"),
      eq(designAssets.active, query.source !== "archived"),
      query.kind === "all" ? undefined : eq(designAssets.kind, query.kind),
      query.source === "favourite"
        ? eq(designAssets.favourite, true)
        : undefined,
      ids ? inArray(designAssets.id, ids) : undefined,
      q
        ? ilike(designAssets.label, `%${q.replace(/[\\%_]/g, "\\$&")}%`)
        : undefined,
      query.family && query.family !== "my-images" ? sql`false` : undefined,
    );
    const [customCount] = await tx
      .select({ value: count() })
      .from(designAssets)
      .where(where);
    const total = builtins.length + customCount.value,
      pageCount = Math.max(1, Math.ceil(total / 12)),
      page = Math.min(query.page, pageCount),
      start = (page - 1) * 12;
    const items = builtins.slice(start, start + 12);
    if (items.length < 12)
      items.push(
        ...(
          await tx
            .select()
            .from(designAssets)
            .where(where)
            .orderBy(asc(designAssets.label), asc(designAssets.id))
            .offset(Math.max(0, start - builtins.length))
            .limit(12 - items.length)
        ).map(publicAsset),
      );
    return { items, total, page, pageCount };
  });
}
export async function updateDesignAsset(
  input: z.infer<typeof assetUpdateSchema>,
) {
  await ensureSchema();
  return db().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${input.id}))`);
    const [row] = await tx
      .select()
      .from(designAssets)
      .where(
        and(eq(designAssets.workspaceId, 1), eq(designAssets.id, input.id)),
      );
    const current = row ? publicAsset(row) : builtinById[input.id];
    if (!current) throw new WorkspaceError("Image not found.", 404);
    if (current.revision !== input.revision) {
      if (
        (input.active === undefined || current.active === input.active) &&
        (input.favourite === undefined || current.favourite === input.favourite)
      )
        return current;
      throw new WorkspaceError(
        "This image changed on another device. Refresh and try again.",
        409,
      );
    }
    const next = {
      active: input.active ?? current.active,
      favourite: input.favourite ?? current.favourite,
      revision: current.revision + 1,
    };
    const [saved] = row
      ? await tx
          .update(designAssets)
          .set(next)
          .where(
            and(
              eq(designAssets.workspaceId, 1),
              eq(designAssets.id, current.id),
            ),
          )
          .returning()
      : await tx
          .insert(designAssets)
          .values({
            id: current.id,
            label: current.label,
            kind: current.kind,
            view: current.view,
            source: "builtin",
            ...next,
          })
          .returning();
    return publicAsset(saved);
  });
}
export async function uploadDesignAsset(
  input: z.infer<typeof uploadMetadataSchema>,
  bytes: Buffer,
) {
  await ensureSchema();
  const id = `upload-${input.id}`,
    checksum = createHash("sha256")
      .update(bytes)
      .update(JSON.stringify(input))
      .digest("hex");
  const processed = await processDesignImage(bytes);
  return db().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);
    const [existing] = await tx
      .select()
      .from(designAssets)
      .where(and(eq(designAssets.workspaceId, 1), eq(designAssets.id, id)));
    if (existing) {
      if (existing.checksum !== checksum)
        throw new WorkspaceError(
          "This upload ID was already used. Choose the image again.",
          409,
        );
      return publicAsset(existing);
    }
    // Deterministic immutable keys make interrupted uploads retryable without duplicate records.
    const keys = await putDesignImages(id, checksum, processed);
    const [saved] = await tx
      .insert(designAssets)
      .values({
        id,
        label: input.label,
        kind: input.kind,
        view: input.view,
        source: "upload",
        checksum,
        ...keys,
      })
      .returning();
    return publicAsset(saved);
  });
}
export async function readDesignImage(id: string, thumbnail: boolean) {
  await ensureSchema();
  const [row] = await db()
    .select()
    .from(designAssets)
    .where(
      and(
        eq(designAssets.workspaceId, 1),
        eq(designAssets.id, id),
        eq(designAssets.source, "upload"),
      ),
    );
  if (!row) throw new WorkspaceError("Image not found.", 404);
  return getDesignImage((thumbnail ? row.thumbnailKey : row.storageKey)!);
}
