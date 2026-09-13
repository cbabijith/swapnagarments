import {
  collectDesignIds,
  resolveDesignAssets,
} from "./design-library-service";
import "server-only";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, ensureSchema } from "@/db";
import { workspaces, mutations, domainEvents } from "@/db/schema";
import {
  mutationSchema,
  type WorkspaceMutation,
} from "@/shared/contracts/command";
import { WorkspaceError } from "@/shared/errors";
import { shopDate, type Workspace } from "@/shared/workspace";
import { customerService } from "./customer-service";
import { orderService } from "./order-service";
import { workflowService } from "./workflow-service";
import { billingService } from "./billing-service";
import { reportService } from "./report-service";
import { settingsService } from "./settings-service";
import { measurementService } from "./measurement-service";
import { intakeService } from "./intake-service";
import {
  readStoredWorkspace,
  persistStoredWorkspace,
  recordWorkflowHistory,
} from "./workspace-storage";

export async function readWorkspace() {
  await ensureSchema();
  return db().transaction(async (tx) => {
    const [header] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, 1))
      .for("share");
    if (!header) throw new Error("Workspace missing after migration.");
    return {
      revision: header.revision,
      data: await readStoredWorkspace(tx, header),
    };
  });
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, val]) => JSON.stringify(key) + ":" + canonical(val))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}

/** Compatibility transaction coordinator. Feature services own the actual rules. */
export async function executeWorkspaceCommand(
  input: { mutationId: string; action: WorkspaceMutation },
  owner: { name: string; email: string },
) {
  await ensureSchema();
  const action = mutationSchema.parse(input.action);
  const fingerprint = createHash("sha256")
    .update(canonical(action))
    .digest("hex");
  return db().transaction(async (tx) => {
    const [header] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, 1))
      .for("update");
    const snapshot = {
      revision: header.revision,
      data: await readStoredWorkspace(tx, header),
    };
    const [existing] = await tx
      .select()
      .from(mutations)
      .where(eq(mutations.id, input.mutationId));
    if (existing) {
      if (existing.fingerprint && existing.fingerprint !== fingerprint)
        throw new WorkspaceError(
          "This request code was already used for a different change.",
          409,
        );
      return { ...snapshot, resultId: existing.resultId ?? undefined };
    }
    const data = structuredClone(snapshot.data);
    const now = new Date();
    const assets =
      action.type === "settings.save" || action.type === "order.intake"
        ? await resolveDesignAssets(tx, [
            ...collectDesignIds(action),
            ...collectDesignIds(data.catalogue),
          ])
        : undefined;
    const context = {
      assets,
      data,
      actor: owner.name,
      timestamp: now.toISOString(),
      today: shopDate(now),
      event: (orderId: string, title: string, detail: string) => {
        data.activity.unshift({
          id: crypto.randomUUID(),
          orderId,
          title,
          detail,
          time: now.toISOString(),
          actor: owner.name,
        });
      },
    };
    let result: { data: Workspace; resultId?: string };
    switch (action.type) {
      case "settings.save":
        result = settingsService({ ...context, action });
        break;
      case "order.intake":
        result = intakeService({ ...context, action });
        break;
      case "measurement.save":
      case "piece.measurements":
        result = measurementService({ ...context, action });
        break;
      case "customer.save":
        result = customerService({ ...context, action });
        break;
      case "order.create":
      case "order.deliver":
        result = orderService({ ...context, action });
        break;
      case "piece.advance":
      case "piece.rework":
        result = workflowService({ ...context, action });
        break;
      case "payment.record":
        result = billingService({ ...context, action });
        break;
      case "day.close":
        result = reportService({ ...context, action });
        break;
    }
    const updated = await persistStoredWorkspace(
      tx,
      header,
      snapshot.data,
      result.data,
    );
    await tx.insert(mutations).values({
      id: input.mutationId,
      resultId: result.resultId ?? null,
      fingerprint,
    });
    // Durable event identity commits with the state and retry receipt. No external side effects here.
    const eventType =
      action.type === "order.intake" || action.type === "order.create"
        ? "order.created"
        : action.type;
    await tx.insert(domainEvents).values({
      id: crypto.randomUUID(),
      mutationId: input.mutationId,
      type: eventType,
      resultId: result.resultId ?? null,
    });
    if (header.storageModel === "relational")
      await recordWorkflowHistory(
        tx,
        action,
        snapshot.data,
        result.data,
        input.mutationId,
        owner.name,
        now.toISOString(),
      );
    return { ...result, revision: updated.revision };
  });
}
