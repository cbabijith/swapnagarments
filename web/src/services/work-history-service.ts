import "server-only";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db";
import { customers, orders, workCompletions } from "@/db/schema";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import type { Workspace } from "@/shared/workspace";
import type { SessionUser } from "@/features/team/contracts/team";
import type { WorkHistoryQuery } from "@/features/team/contracts/work-history";
import type {
  WorkHistoryRead,
  WorkHistoryDetailRead,
  CompletedWork,
} from "@/features/team/types/work-history";
import { completionSnapshot } from "@/features/team/domain/work-completion";
import { workHistoryId } from "@/features/team/contracts/work-history";
import { currentStepName } from "@/features/workflow/domain/templates";
import { WorkspaceError } from "@/shared/errors";
import {
  withRead,
  literalPattern,
  offset,
  pageInfo,
  type ReadContext,
} from "./read-context";

/** Resolve only contacts for the already-authorized, bounded receipt page. */
async function withCustomers<T extends CompletedWork & { orderId: string }>(
  { tx, legacy }: ReadContext,
  entries: T[],
) {
  const ids = [...new Set(entries.map((entry) => entry.orderId))];
  const contacts = new Map<string, NonNullable<CompletedWork["customer"]>>();
  if (ids.length && legacy) {
    const wanted = new Set(ids);
    const byId = new Map(
      legacy.customers.map((customer) => [customer.id, customer]),
    );
    for (const order of legacy.orders) {
      if (!wanted.has(order.id)) continue;
      const customer = byId.get(order.customerId);
      if (customer)
        contacts.set(order.id, { name: customer.name, phone: customer.phone });
    }
  } else if (ids.length) {
    const rows = await tx
      .select({
        orderId: orders.id,
        name: customers.name,
        phone: customers.phone,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(inArray(orders.id, ids));
    for (const { orderId, name, phone } of rows)
      contacts.set(orderId, { name, phone });
  }
  return entries.map(({ orderId, ...entry }) => ({
    ...entry,
    customer: contacts.get(orderId) ?? null,
  }));
}

function customerMatches(query: string, legacy?: Workspace) {
  if (legacy) {
    const term = query.toLowerCase();
    const matchingCustomers = new Set(
      legacy.customers
        .filter(
          (customer) =>
            customer.name.toLowerCase().includes(term) ||
            customer.phone.toLowerCase().includes(term),
        )
        .map((customer) => customer.id),
    );
    const ids = legacy.orders
      .filter((order) => matchingCustomers.has(order.customerId))
      .map((order) => order.id);
    return ids.length ? inArray(workCompletions.orderId, ids) : sql`false`;
  }
  const pattern = literalPattern(query);
  return sql`exists (
    select 1 from ${orders}
    inner join ${customers} on ${customers.id} = ${orders.customerId}
    where ${orders.id} = ${workCompletions.orderId}
      and (${customers.name} ilike ${pattern} or ${customers.phone} ilike ${pattern})
  )`;
}

/** Run after a successful transition, in the same transaction as its retry receipt. */
export async function recordWorkCompletion(
  tx: DatabaseTransaction,
  action: WorkspaceMutation,
  before: Workspace,
  mutationId: string,
  completedAt: string,
) {
  if (
    action.type !== "piece.advance" &&
    !(action.type === "work.update" && action.operation === "complete")
  )
    return;
  const order = before.orders.find((entry) => entry.id === action.orderId);
  const piece = order?.items.find((entry) => entry.id === action.pieceId);
  if (!order || !piece || !piece.work?.assigneeId || piece.station >= 5) return;
  await tx.insert(workCompletions).values({
    id: crypto.randomUUID(),
    mutationId,
    workerId: piece.work.assigneeId,
    orderId: order.id,
    orderNumber: order.number,
    pieceId: piece.id,
    garment: piece.garment,
    station: piece.station,
    stepName: currentStepName(piece),
    snapshot: completionSnapshot(order, piece),
    completedAt,
  });
}

export function readWorkHistoryDetail(id: string, user: SessionUser) {
  if (user.role !== "worker" || !user.staffId)
    throw new WorkspaceError(
      "Sign in with a worker account to view your work history.",
      403,
    );
  if (!workHistoryId.safeParse(id).success)
    throw new WorkspaceError("Completed work not found.", 404);
  const workerId = user.staffId;
  return withRead(async (context): Promise<WorkHistoryDetailRead> => {
    const { tx, revision } = context;
    const [entry] = await tx
      .select({
        id: workCompletions.id,
        orderId: workCompletions.orderId,
        orderNumber: workCompletions.orderNumber,
        pieceId: workCompletions.pieceId,
        garment: workCompletions.garment,
        station: workCompletions.station,
        stepName: workCompletions.stepName,
        completedAt: workCompletions.completedAt,
        snapshot: workCompletions.snapshot,
      })
      .from(workCompletions)
      .where(
        and(eq(workCompletions.id, id), eq(workCompletions.workerId, workerId)),
      )
      .limit(1);
    if (!entry) throw new WorkspaceError("Completed work not found.", 404);
    const [withCustomer] = await withCustomers(context, [entry]);
    return { revision, entry: withCustomer };
  });
}

export function readWorkHistory(input: WorkHistoryQuery, user: SessionUser) {
  if (user.role !== "worker" || !user.staffId)
    throw new WorkspaceError(
      "Sign in with a worker account to view your work history.",
      403,
    );
  const workerId = user.staffId;
  return withRead(async (context): Promise<WorkHistoryRead> => {
    const { tx, revision, legacy } = context;
    const where = and(
      eq(workCompletions.workerId, workerId),
      input.station === "all"
        ? undefined
        : eq(workCompletions.station, Number(input.station)),
      input.q
        ? or(
            ilike(workCompletions.orderNumber, literalPattern(input.q)),
            ilike(workCompletions.garment, literalPattern(input.q)),
            ilike(workCompletions.stepName, literalPattern(input.q)),
            customerMatches(input.q, legacy),
          )
        : undefined,
    );
    const [count] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(workCompletions)
      .where(where);
    const entries = await tx
      .select({
        id: workCompletions.id,
        orderId: workCompletions.orderId,
        orderNumber: workCompletions.orderNumber,
        pieceId: workCompletions.pieceId,
        garment: workCompletions.garment,
        station: workCompletions.station,
        stepName: workCompletions.stepName,
        completedAt: workCompletions.completedAt,
      })
      .from(workCompletions)
      .where(where)
      .orderBy(desc(workCompletions.completedAt), desc(workCompletions.id))
      .limit(input.pageSize)
      .offset(offset(input));
    return {
      revision,
      entries: await withCustomers(context, entries),
      page: pageInfo(input, count.total),
    };
  });
}
