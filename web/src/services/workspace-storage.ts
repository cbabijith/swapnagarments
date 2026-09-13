import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db";
import {
  customers,
  measurementVersions,
  orders,
  orderItems,
  payments,
  staff,
  activity,
  dayReports,
  closedDays,
  workspaces,
  workflowHistory,
} from "@/db/schema";
import { iso, stableJson } from "@/db/workspace-validation";
import type { Workspace } from "@/shared/workspace";
import type { WorkspaceMutation } from "@/shared/contracts/command";
import {
  readStoredCatalogue,
  writeCatalogue,
  attachProfiles,
  writeProfiles,
} from "./catalogue-storage";

export type StorageHeader = typeof workspaces.$inferSelect;

/** Caller holds the singleton row lock so all component reads describe one revision. */
export async function readRelationalWorkspace(
  tx: DatabaseTransaction,
  hasDayReports: boolean,
): Promise<Workspace> {
  const [
    customerRows,
    versions,
    orderRows,
    items,
    paymentRows,
    people,
    activities,
    days,
    reports,
  ] = [
    await tx.select().from(customers).orderBy(asc(customers.position)),
    await tx
      .select()
      .from(measurementVersions)
      .orderBy(asc(measurementVersions.version)),
    await tx.select().from(orders).orderBy(asc(orders.position)),
    await tx.select().from(orderItems).orderBy(asc(orderItems.position)),
    await tx.select().from(payments).orderBy(asc(payments.position)),
    await tx.select().from(staff).orderBy(asc(staff.position)),
    await tx.select().from(activity).orderBy(asc(activity.position)),
    await tx.select().from(closedDays).orderBy(asc(closedDays.position)),
    await tx.select().from(dayReports).orderBy(asc(dayReports.position)),
  ];
  function group<T>(rows: T[], key: (row: T) => string) {
    const result = new Map<string, T[]>();
    for (const row of rows) {
      const id = key(row);
      if (!result.has(id)) result.set(id, []);
      result.get(id)!.push(row);
    }
    return result;
  }
  const versionsByCustomer = group(versions, (row) => row.customerId),
    itemsByOrder = group(items, (row) => row.orderId),
    paymentsByOrder = group(paymentRows, (row) => row.orderId);
  const catalogue = await readStoredCatalogue(tx);
  const data: Workspace = {
    ...(catalogue ? { catalogue } : {}),
    customers: customerRows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      measurements: c.measurements,
      ...(c.hasProfiles ? { profiles: [] } : {}),
      ...(c.hasMeasurementHistory
        ? {
            measurementHistory: (versionsByCustomer.get(c.id) ?? []).map(
              (v) => ({ date: iso(v.recordedAt), values: v.values }),
            ),
          }
        : {}),
    })),
    orders: orderRows.map((o) => ({
      id: o.id,
      number: o.number,
      customerId: o.customerId,
      priority: o.priority,
      dueDate: o.dueDate,
      createdAt: iso(o.createdAt),
      status: o.status,
      notes: o.notes,
      ...(o.deliveredAt ? { deliveredAt: iso(o.deliveredAt) } : {}),
      items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
        id: i.id,
        garment: i.garment,
        material: i.material,
        station: i.station,
        price: i.price,
        ...(i.measurement ? { measurement: i.measurement } : {}),
        ...(i.design ? { design: i.design } : {}),
        ...(i.measurementHistory
          ? { measurementHistory: i.measurementHistory }
          : {}),
      })),
      payments: (paymentsByOrder.get(o.id) ?? []).map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        date: iso(p.paidAt),
      })),
    })),
    staff: people.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      station: p.station,
      color: p.color,
    })),
    activity: activities.map((a) => ({
      id: a.id,
      orderId: a.orderId,
      title: a.title,
      detail: a.detail,
      time: iso(a.time),
      ...(a.actor !== null ? { actor: a.actor } : {}),
    })),
    closedDays: days.map((d) => d.date),
    ...(hasDayReports
      ? {
          dayReports: reports.map((r) => ({
            date: r.date,
            reviewedBy: r.reviewedBy,
            reviewedAt: iso(r.reviewedAt),
            delivered: r.delivered,
            ready: r.ready,
            unfinished: r.unfinished,
            collected: r.collected,
            pending: r.pending,
          })),
        }
      : {}),
  };
  await attachProfiles(tx, data.customers);
  return data;
}

export function readStoredWorkspace(
  tx: DatabaseTransaction,
  header: Pick<StorageHeader, "data" | "storageModel" | "hasDayReports">,
) {
  return header.storageModel === "relational"
    ? readRelationalWorkspace(tx, header.hasDayReports)
    : Promise.resolve(header.data);
}

function rowsFor(data: Workspace) {
  return {
    customers: data.customers.map((c, position) => ({
      id: c.id,
      position,
      name: c.name,
      phone: c.phone,
      phoneKey: c.phone.replace(/\D/g, ""),
      email: c.email,
      notes: c.notes,
      measurements: c.measurements,
      hasMeasurementHistory: c.measurementHistory !== undefined,
      hasProfiles: c.profiles !== undefined,
    })),
    versions: data.customers.flatMap((c) =>
      (c.measurementHistory ?? []).map((v, version) => ({
        customerId: c.id,
        version,
        recordedAt: iso(v.date),
        values: v.values,
      })),
    ),
    orders: data.orders.map((o, position) => ({
      id: o.id,
      position,
      number: o.number,
      customerId: o.customerId,
      priority: o.priority,
      dueDate: o.dueDate,
      createdAt: iso(o.createdAt),
      status: o.status,
      notes: o.notes,
      deliveredAt: o.deliveredAt ? iso(o.deliveredAt) : null,
    })),
    items: data.orders.flatMap((o) =>
      o.items.map((i, position) => ({ ...i, orderId: o.id, position })),
    ),
    payments: data.orders.flatMap((o) =>
      o.payments.map((p, position) => ({
        id: p.id,
        orderId: o.id,
        position,
        amount: p.amount,
        method: p.method,
        paidAt: iso(p.date),
      })),
    ),
    staff: data.staff.map((p, position) => ({ ...p, position })),
    activity: data.activity.map((a, position) => ({
      ...a,
      actor: a.actor ?? null,
      time: iso(a.time),
      position,
    })),
    days: data.closedDays.map((date, position) => ({ date, position })),
    reports: (data.dayReports ?? []).map((r, position) => ({
      ...r,
      reviewedAt: iso(r.reviewedAt),
      position,
    })),
  };
}

/** Current commands never delete records. Refuse unexpected removal instead of losing history. */
function changed<T>(
  before: T[],
  after: T[],
  key: (row: T) => string,
  label: string,
) {
  const previous = new Map(before.map((row) => [key(row), row])),
    next = new Set(after.map(key));
  for (const id of previous.keys())
    if (!next.has(id))
      throw new Error(
        `Refusing to remove existing ${label} during storage migration.`,
      );
  return after.filter(
    (row) => stableJson(previous.get(key(row))) !== stableJson(row),
  );
}

/** Write changed domain rows; no table truncation and no replacement of the old JSON backup. */
export async function writeRelationalWorkspace(
  tx: DatabaseTransaction,
  before: Workspace,
  after: Workspace,
) {
  await writeCatalogue(tx, before, after);
  const a = rowsFor(before),
    b = rowsFor(after);
  const byId = <T extends { id: string }>(row: T) => row.id;
  const byDate = <T extends { date: string }>(row: T) => row.date;
  for (const row of changed(a.customers, b.customers, byId, "customers"))
    await tx
      .insert(customers)
      .values(row)
      .onConflictDoUpdate({ target: customers.id, set: row });
  for (const row of changed(
    a.versions,
    b.versions,
    (v) => JSON.stringify([v.customerId, v.version]),
    "measurement versions",
  ))
    await tx
      .insert(measurementVersions)
      .values(row)
      .onConflictDoUpdate({
        target: [measurementVersions.customerId, measurementVersions.version],
        set: row,
      });
  await writeProfiles(tx, before, after);
  for (const row of changed(a.orders, b.orders, byId, "orders"))
    await tx
      .insert(orders)
      .values(row)
      .onConflictDoUpdate({ target: orders.id, set: row });
  for (const row of changed(a.items, b.items, byId, "garments"))
    await tx
      .insert(orderItems)
      .values(row)
      .onConflictDoUpdate({ target: orderItems.id, set: row });
  for (const row of changed(a.payments, b.payments, byId, "payments"))
    await tx
      .insert(payments)
      .values(row)
      .onConflictDoUpdate({ target: payments.id, set: row });
  for (const row of changed(a.staff, b.staff, byId, "staff"))
    await tx
      .insert(staff)
      .values(row)
      .onConflictDoUpdate({ target: staff.id, set: row });
  for (const row of changed(a.activity, b.activity, byId, "activity"))
    await tx
      .insert(activity)
      .values(row)
      .onConflictDoUpdate({ target: activity.id, set: row });
  for (const row of changed(a.days, b.days, byDate, "closed days"))
    await tx
      .insert(closedDays)
      .values(row)
      .onConflictDoUpdate({ target: closedDays.date, set: row });
  for (const row of changed(a.reports, b.reports, byDate, "reports"))
    await tx
      .insert(dayReports)
      .values(row)
      .onConflictDoUpdate({ target: dayReports.date, set: row });
}

export async function persistStoredWorkspace(
  tx: DatabaseTransaction,
  header: StorageHeader,
  before: Workspace,
  after: Workspace,
) {
  if (header.storageModel === "relational")
    await writeRelationalWorkspace(tx, before, after);
  const [updated] = await tx
    .update(workspaces)
    .set({
      ...(header.storageModel === "json" ? { data: after } : {}),
      hasDayReports: after.dayReports !== undefined,
      revision: sql`${workspaces.revision} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(workspaces.id, 1))
    .returning({ revision: workspaces.revision });
  return updated;
}

/** History is committed with the command and its retry record, never inferred from activity text. */
export async function recordWorkflowHistory(
  tx: DatabaseTransaction,
  action: WorkspaceMutation,
  before: Workspace,
  after: Workspace,
  mutationId: string,
  actor: string,
  occurredAt: string,
) {
  if (action.type === "order.create" || action.type === "order.intake") {
    const oldIds = new Set(before.orders.map((o) => o.id));
    const order = after.orders.find((o) => !oldIds.has(o.id));
    if (!order) throw new Error("Created order missing from transaction.");
    for (const item of order.items)
      await tx.insert(workflowHistory).values({
        id: crypto.randomUUID(),
        orderId: order.id,
        pieceId: item.id,
        mutationId,
        kind: "created",
        fromStation: null,
        toStation: item.station,
        reason: "",
        actor,
        occurredAt,
      });
  } else if (
    action.type === "piece.advance" ||
    action.type === "piece.rework"
  ) {
    const oldPiece = before.orders
      .find((o) => o.id === action.orderId)
      ?.items.find((i) => i.id === action.pieceId);
    const newPiece = after.orders
      .find((o) => o.id === action.orderId)
      ?.items.find((i) => i.id === action.pieceId);
    if (!oldPiece || !newPiece)
      throw new Error("Workflow garment missing from transaction.");
    await tx.insert(workflowHistory).values({
      id: crypto.randomUUID(),
      orderId: action.orderId,
      pieceId: action.pieceId,
      mutationId,
      kind: action.type === "piece.advance" ? "advance" : "rework",
      fromStation: oldPiece.station,
      toStation: newPiece.station,
      reason: action.type === "piece.rework" ? action.reason : "",
      actor,
      occurredAt,
    });
  }
}
