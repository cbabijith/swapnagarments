import "server-only";
import { eq, sql, count } from "drizzle-orm";
import { db, ensureSchema, type DatabaseTransaction } from "@/db";
import {
  workspaces,
  workspaceBackups,
  customers,
  measurementVersions,
  orders,
  orderItems,
  payments,
  staff,
  activity,
  closedDays,
  dayReports,
  workflowHistory,
  owners,
  shopSettings,
  garments,
  customerProfiles,
} from "@/db/schema";
import {
  validateWorkspace,
  workspaceManifest,
  stableJson,
} from "@/db/workspace-validation";
import { StorageMigrationError } from "@/db/migration-error";
import {
  readRelationalWorkspace,
  readStoredWorkspace,
  writeRelationalWorkspace,
} from "./workspace-storage";
import type { Workspace } from "@/shared/workspace";

export async function verifyRelationalWorkspace(
  tx: DatabaseTransaction,
  source: Workspace,
) {
  const expected = workspaceManifest(source);
  const rebuilt = await readRelationalWorkspace(
    tx,
    source.dayReports !== undefined,
  );
  const actual = workspaceManifest(rebuilt);
  const tables = {
    shopSettings,
    garments,
    customerProfiles,
    customers,
    measurementVersions,
    orders,
    pieces: orderItems,
    payments,
    staff,
    activity,
    closedDays,
    reports: dayReports,
  };
  const physicalCounts: Record<string, number> = {};
  for (const [name, table] of Object.entries(tables)) {
    const [row] = await tx.select({ value: count() }).from(table);
    physicalCounts[name] = row.value;
  }
  if (
    expected.checksum !== actual.checksum ||
    stableJson(expected.counts) !== stableJson(physicalCounts) ||
    stableJson(expected.totals) !== stableJson(actual.totals)
  ) {
    throw new StorageMigrationError(
      "Relational reconciliation failed. The storage switch was not applied.",
    );
  }
  return actual;
}

export async function storageStatus() {
  return db().transaction(async (tx) => {
    // Inspect the pre-migration schema too, without adding columns/tables on a status request.
    const result = await tx.execute<{
      revision: number;
      data: Workspace;
      storageModel: "json" | "relational";
      hasDayReports: boolean;
    }>(sql`
      SELECT w.revision, w.data,
        coalesce(to_jsonb(w)->>'storage_model', 'json') AS "storageModel",
        coalesce((to_jsonb(w)->>'has_day_reports')::boolean, w.data ? 'dayReports') AS "hasDayReports"
      FROM sg_workspace w WHERE w.id = 1 FOR SHARE
    `);
    const header = result.rows[0];
    if (!header) throw new StorageMigrationError("Workspace not found.");
    if (!["json", "relational"].includes(header.storageModel))
      throw new StorageMigrationError("Unrecognized workspace storage model.");
    const data = await readStoredWorkspace(tx, header);
    return {
      storageModel: header.storageModel,
      revision: header.revision,
      ...workspaceManifest(data),
    };
  });
}

type TransitionOptions = {
  direction: "cutover" | "rollback";
  dryRun?: boolean;
  expectedRevision?: number;
  expectedChecksum?: string;
  backupReference?: string;
};
type TransitionResult = Awaited<ReturnType<typeof storageStatus>> & {
  changed: boolean;
  committed: boolean;
  backupId?: string;
  projectedRevision?: number;
};
class RehearsalComplete extends Error {
  constructor(public result: TransitionResult) {
    super("Rehearsal complete");
  }
}

/** Called only by the operator CLI. Normal startup never switches the source of truth. */
export async function transitionWorkspaceStorage(
  options: TransitionOptions,
): Promise<TransitionResult> {
  if (
    !options.dryRun &&
    (!Number.isSafeInteger(options.expectedRevision) ||
      options.expectedRevision! < 0 ||
      !/^[a-f0-9]{64}$/.test(options.expectedChecksum ?? "") ||
      !options.backupReference?.trim() ||
      options.backupReference.length > 500)
  ) {
    throw new StorageMigrationError(
      "A verified backup reference, expected revision and rehearsal checksum are required.",
    );
  }
  await ensureSchema();
  try {
    return await db().transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '120s'`);
      const [header] = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, 1))
        .for("update");
      if (!header) throw new StorageMigrationError("Workspace not found.");
      const source = await readStoredWorkspace(tx, header);
      const manifest = workspaceManifest(source);
      const target = options.direction === "cutover" ? "relational" : "json";
      if (header.storageModel === target)
        return {
          storageModel: target,
          revision: header.revision,
          ...manifest,
          changed: false,
          committed: false,
        };
      if (
        options.expectedRevision !== undefined &&
        options.expectedRevision !== header.revision
      )
        throw new StorageMigrationError(
          "Workspace revision changed since rehearsal. Rehearse the current data before retrying.",
        );
      if (
        options.expectedChecksum !== undefined &&
        options.expectedChecksum !== manifest.checksum
      )
        throw new StorageMigrationError(
          "Workspace checksum changed since rehearsal. Rehearse the current data before retrying.",
        );
      const ownerRows = await tx
        .select({ id: owners.id })
        .from(owners)
        .where(eq(owners.id, 1));
      if (!ownerRows.length)
        throw new StorageMigrationError(
          "Create the owner account before migrating shop storage.",
        );
      const backupId = crypto.randomUUID();
      await tx.insert(workspaceBackups).values({
        id: backupId,
        workspaceId: 1,
        revision: header.revision,
        sourceModel: header.storageModel,
        data: source,
        checksum: manifest.checksum,
        backupReference: options.backupReference ?? "isolated-rehearsal",
      });
      const normalized = validateWorkspace(source);
      if (target === "relational") {
        // Existing relational rows may be an archive from a previous rollback. Preserve their history.
        const archived = await readRelationalWorkspace(tx, true);
        await writeRelationalWorkspace(tx, archived, normalized);
        await verifyRelationalWorkspace(tx, normalized);
        const observedAt = new Date().toISOString();
        for (const order of normalized.orders)
          for (const item of order.items) {
            await tx.insert(workflowHistory).values({
              id: crypto.randomUUID(),
              orderId: order.id,
              pieceId: item.id,
              mutationId: null,
              kind: "baseline",
              fromStation: null,
              toStation: item.station,
              reason: `State observed at cutover ${backupId}; earlier transitions remain in legacy activity.`,
              actor: "Storage migration",
              occurredAt: observedAt,
            });
          }
      } else {
        // Roll back the CURRENT relational state, including every post-cutover order/payment.
        await verifyRelationalWorkspace(tx, normalized);
      }
      const [updated] = await tx
        .update(workspaces)
        .set({
          storageModel: target,
          hasDayReports: normalized.dayReports !== undefined,
          ...(target === "json" ? { data: normalized } : {}),
          revision: sql`${workspaces.revision} + 1`,
          updatedAt: sql`now()`,
        })
        .where(eq(workspaces.id, 1))
        .returning();
      const readBack = await readStoredWorkspace(tx, updated);
      if (workspaceManifest(readBack).checksum !== manifest.checksum)
        throw new StorageMigrationError("Final storage reconciliation failed.");
      const result: TransitionResult = {
        storageModel: target,
        revision: options.dryRun ? header.revision : updated.revision,
        ...manifest,
        changed: true,
        committed: !options.dryRun,
        ...(options.dryRun
          ? { projectedRevision: updated.revision }
          : { backupId }),
      };
      if (options.dryRun) throw new RehearsalComplete(result);
      return result;
    });
  } catch (error) {
    if (error instanceof RehearsalComplete) return error.result;
    if (error instanceof StorageMigrationError) throw error;
    throw new StorageMigrationError(
      "Storage migration failed and its transaction was rolled back. Check the database schema and server logs; no shop records were printed.",
    );
  }
}
