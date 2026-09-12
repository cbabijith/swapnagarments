import "server-only";
import { StorageMigrationError } from "./migration-error";
import { createHash } from "node:crypto";
import { z } from "zod";
import { date, id } from "@/shared/contracts/fields";
import { total, paid, type Workspace } from "@/shared/workspace";

const timestamp = z.iso.datetime({ offset: true }).refine((value) => {
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1];
  return !fraction || /^0*$/.test(fraction.slice(3));
}, "Sub-millisecond timestamps need a lossless migration before cutover.");
const values = z.record(z.string(), z.string());
const money = z.number().int().min(1).max(100_000_000);
const count = z.number().int().min(0).max(2_147_483_647);
const reportMoney = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const workspaceSchema = z.strictObject({
  customers: z.array(
    z.strictObject({
      id,
      name: z.string(),
      phone: z.string(),
      email: z.string(),
      notes: z.string(),
      measurements: values,
      measurementHistory: z
        .array(z.strictObject({ date: timestamp, values }))
        .optional(),
    }),
  ),
  orders: z.array(
    z.strictObject({
      id,
      number: z.string().min(1),
      customerId: id,
      priority: z.enum(["normal", "high", "urgent"]),
      dueDate: date,
      createdAt: timestamp,
      status: z.enum([
        "received",
        "in_progress",
        "ready",
        "delivered",
        "cancelled",
      ]),
      notes: z.string(),
      deliveredAt: timestamp.optional(),
      items: z
        .array(
          z.strictObject({
            id,
            garment: z.string(),
            material: z.string(),
            station: z.number().int().min(0).max(5),
            price: money,
          }),
        )
        .min(1),
      payments: z.array(
        z.strictObject({
          id,
          amount: money,
          method: z.string(),
          date: timestamp,
        }),
      ),
    }),
  ),
  staff: z.array(
    z.strictObject({
      id,
      name: z.string(),
      role: z.string(),
      station: z.string(),
      color: z.string(),
    }),
  ),
  activity: z.array(
    z.strictObject({
      id,
      orderId: id,
      title: z.string(),
      detail: z.string(),
      time: timestamp,
      actor: z.string().optional(),
    }),
  ),
  closedDays: z.array(date),
  dayReports: z
    .array(
      z.strictObject({
        date,
        reviewedBy: z.string(),
        reviewedAt: timestamp,
        delivered: count,
        ready: count,
        unfinished: count,
        collected: reportMoney,
        pending: reportMoney,
      }),
    )
    .optional(),
});

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, v]) => JSON.stringify(key) + ":" + stableJson(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export const iso = (value: string) => new Date(value).toISOString();

/** Reject unknown/unmappable data. UTC normalization preserves timestamp instants. */
export function validateWorkspace(source: unknown): Workspace {
  const parsed = workspaceSchema.safeParse(source);
  if (!parsed.success)
    throw new StorageMigrationError(
      `Workspace validation failed at ${parsed.error.issues[0]?.path.join(".") || "root"}.`,
    );
  const data = parsed.data;
  function unique(keys: string[], label: string) {
    if (new Set(keys).size !== keys.length)
      throw new StorageMigrationError(`Workspace contains duplicate ${label}.`);
  }
  unique(
    data.customers.map((c) => c.id),
    "customer IDs",
  );
  unique(
    data.customers.map((c) => c.phone.replace(/\D/g, "")),
    "customer phone numbers",
  );
  unique(
    data.orders.map((o) => o.id),
    "order IDs",
  );
  unique(
    data.orders.map((o) => o.number),
    "order numbers",
  );
  unique(
    data.orders.flatMap((o) => o.items.map((i) => i.id)),
    "piece IDs",
  );
  unique(
    data.orders.flatMap((o) => o.payments.map((p) => p.id)),
    "payment IDs",
  );
  unique(
    data.staff.map((p) => p.id),
    "staff IDs",
  );
  unique(
    data.activity.map((a) => a.id),
    "activity IDs",
  );
  unique(data.closedDays, "closed days");
  unique(
    (data.dayReports ?? []).map((r) => r.date),
    "report dates",
  );
  const customerIds = new Set(data.customers.map((c) => c.id)),
    orderIds = new Set(data.orders.map((o) => o.id));
  for (const order of data.orders) {
    if (!customerIds.has(order.customerId))
      throw new StorageMigrationError(
        "Workspace has an order without its customer.",
      );
    const quoted = total(order),
      collected = paid(order);
    if (
      !Number.isSafeInteger(quoted) ||
      !Number.isSafeInteger(collected) ||
      collected > quoted
    )
      throw new StorageMigrationError(
        "Workspace has inconsistent order totals.",
      );
    if (
      ["ready", "delivered"].includes(order.status) &&
      order.items.some((item) => item.station !== 5)
    )
      throw new StorageMigrationError(
        "Workspace has an unfinished order marked ready or delivered.",
      );
    if (
      order.status === "delivered" &&
      (collected !== quoted || !order.deliveredAt)
    )
      throw new StorageMigrationError(
        "Workspace has an incomplete delivery record.",
      );
    order.createdAt = iso(order.createdAt);
    if (order.deliveredAt) order.deliveredAt = iso(order.deliveredAt);
    order.payments.forEach((payment) => {
      payment.date = iso(payment.date);
    });
  }
  for (const customer of data.customers)
    customer.measurementHistory?.forEach((version) => {
      version.date = iso(version.date);
    });
  for (const entry of data.activity) {
    if (!orderIds.has(entry.orderId))
      throw new StorageMigrationError(
        "Workspace has activity without its order.",
      );
    entry.time = iso(entry.time);
  }
  for (const report of data.dayReports ?? []) {
    if (!data.closedDays.includes(report.date))
      throw new StorageMigrationError(
        "Workspace has a report without its closed day.",
      );
    report.reviewedAt = iso(report.reviewedAt);
  }
  return data;
}

export function workspaceManifest(source: unknown) {
  const data = validateWorkspace(source);
  const billed = data.orders.reduce((sum, order) => sum + total(order), 0);
  const collected = data.orders.reduce((sum, order) => sum + paid(order), 0);
  const pending = data.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, order) => sum + total(order) - paid(order), 0);
  if (![billed, collected, pending].every(Number.isSafeInteger))
    throw new StorageMigrationError(
      "Workspace totals exceed safe integer precision.",
    );
  return {
    checksum: createHash("sha256").update(stableJson(data)).digest("hex"),
    counts: {
      customers: data.customers.length,
      measurementVersions: data.customers.reduce(
        (n, c) => n + (c.measurementHistory?.length ?? 0),
        0,
      ),
      orders: data.orders.length,
      pieces: data.orders.reduce((n, o) => n + o.items.length, 0),
      payments: data.orders.reduce((n, o) => n + o.payments.length, 0),
      staff: data.staff.length,
      activity: data.activity.length,
      closedDays: data.closedDays.length,
      reports: data.dayReports?.length ?? 0,
    },
    totals: { billed, collected, pending },
  };
}
