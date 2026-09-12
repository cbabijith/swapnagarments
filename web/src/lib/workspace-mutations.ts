import { z } from "zod";
import {
  STATIONS,
  GARMENTS,
  type Workspace,
  type Order,
  type Customer,
  shopDate,
  total,
  paid,
  balance,
  isOpen,
} from "./workspace";

const id = z.string().min(1).max(100);
const amount = z.number().int().min(0).max(100_000_000);
const method = z.enum(["Cash", "UPI", "Card", "Bank transfer"]);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");
const customer = z.object({
  id,
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{10,16}$/),
  email: z.union([z.literal(""), z.email().max(150)]),
  notes: z.string().max(2000),
  measurements: z
    .record(
      z.string().min(1).max(80),
      z
        .string()
        .refine(
          (value) =>
            Number.isFinite(Number(value)) &&
            Number(value) > 0 &&
            Number(value) <= 150,
          "Measurements must be between 0 and 150 inches.",
        ),
    )
    .refine((value) => Object.keys(value).length <= 30),
});
export const mutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("customer.save"), customer }),
  z.object({
    type: z.literal("order.create"),
    customerId: id,
    items: z
      .array(
        z.object({
          garment: z.enum(GARMENTS),
          material: z.string().max(500),
          price: amount.min(1),
        }),
      )
      .min(1)
      .max(50),
    priority: z.enum(["normal", "high", "urgent"]),
    dueDate: date,
    notes: z.string().max(2000),
    advance: amount,
    method,
  }),
  z.object({
    type: z.literal("piece.advance"),
    orderId: id,
    pieceId: id,
    expectedStation: z.number().int().min(0).max(4),
  }),
  z.object({
    type: z.literal("piece.rework"),
    orderId: id,
    pieceId: id,
    station: z.number().int().min(0).max(4),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    type: z.literal("payment.record"),
    orderId: id,
    amount: amount.min(1),
    method,
  }),
  z.object({ type: z.literal("order.deliver"), orderId: id }),
  z.object({ type: z.literal("day.close"), date }),
]);
export type WorkspaceMutation = z.infer<typeof mutationSchema>;
export class WorkspaceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** One transaction applies each command to the current workspace, never to a client snapshot. */
export function applyMutation(
  current: Workspace,
  input: unknown,
  actor: string,
  now = new Date(),
): { data: Workspace; resultId?: string } {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues[0]?.message ?? "Invalid update.",
    );
  const action = parsed.data;
  const data = structuredClone(current);
  const today = shopDate(now);
  const timestamp = now.toISOString();
  const event = (orderId: string, title: string, detail: string) => {
    data.activity.unshift({
      id: crypto.randomUUID(),
      orderId,
      title,
      detail,
      time: timestamp,
      actor,
    });
  };
  if (action.type === "customer.save") {
    const existing = data.customers.find(
      (entry) => entry.id === action.customer.id,
    );
    const duplicate = data.customers.find(
      (entry) =>
        entry.id !== action.customer.id &&
        entry.phone.replace(/\D/g, "") ===
          action.customer.phone.replace(/\D/g, ""),
    );
    if (duplicate)
      throw new WorkspaceError(
        `This phone number already belongs to ${duplicate.name}.`,
      );
    const updated: Customer = {
      ...action.customer,
      measurementHistory: existing?.measurementHistory ?? [],
    };
    if (
      existing &&
      JSON.stringify(existing.measurements) !==
        JSON.stringify(updated.measurements) &&
      Object.keys(existing.measurements).length
    )
      updated.measurementHistory = [
        ...(existing.measurementHistory ?? []),
        { date: timestamp, values: existing.measurements },
      ];
    if (existing)
      data.customers = data.customers.map((entry) =>
        entry.id === updated.id ? updated : entry,
      );
    else data.customers.push(updated);
    return { data, resultId: updated.id };
  }
  if (action.type === "order.create") {
    if (!data.customers.some((entry) => entry.id === action.customerId))
      throw new WorkspaceError("Choose an existing customer.");
    if (action.dueDate < today)
      throw new WorkspaceError("The delivery date cannot be in the past.");
    const quoted = action.items.reduce((sum, item) => sum + item.price, 0);
    if (!Number.isSafeInteger(quoted) || quoted > 100_000_000)
      throw new WorkspaceError("The order total is too large.");
    if (action.advance > quoted)
      throw new WorkspaceError("The advance cannot exceed the order total.");
    const order: Order = {
      id: crypto.randomUUID(),
      number: `SG-${Math.max(1000, ...data.orders.map((entry) => Number(entry.number.replace("SG-", "")) || 0)) + 1}`,
      customerId: action.customerId,
      items: action.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        station: 0,
      })),
      priority: action.priority,
      dueDate: action.dueDate,
      notes: action.notes,
      createdAt: timestamp,
      status: "received",
      payments: action.advance
        ? [
            {
              id: crypto.randomUUID(),
              amount: action.advance,
              method: action.method,
              date: timestamp,
            },
          ]
        : [],
    };
    data.orders.unshift(order);
    event(
      order.id,
      "A new order on the books",
      `${order.number} was added to the queue.`,
    );
    return { data, resultId: order.id };
  }
  if (action.type === "day.close") {
    if (action.date !== today)
      throw new WorkspaceError("Only today’s report can be closed.");
    if (data.closedDays.includes(today))
      throw new WorkspaceError("This day has already been reviewed.", 409);
    data.closedDays.push(today);
    data.dayReports = [
      ...(data.dayReports ?? []),
      {
        date: today,
        reviewedBy: actor,
        reviewedAt: timestamp,
        delivered: data.orders.filter(
          (order) =>
            order.deliveredAt &&
            shopDate(new Date(order.deliveredAt)) === today,
        ).length,
        ready: data.orders.filter((order) => order.status === "ready").length,
        unfinished: data.orders.filter(
          (order) =>
            isOpen(order) && order.status !== "ready" && order.dueDate <= today,
        ).length,
        collected: data.orders
          .flatMap((order) => order.payments)
          .filter((payment) => shopDate(new Date(payment.date)) === today)
          .reduce((sum, payment) => sum + payment.amount, 0),
        pending: data.orders
          .filter((order) => order.status !== "cancelled")
          .reduce((sum, order) => sum + balance(order), 0),
      },
    ];
    return { data };
  }
  const order = data.orders.find((entry) => entry.id === action.orderId);
  if (!order) throw new WorkspaceError("Order not found.", 404);
  if (!isOpen(order))
    throw new WorkspaceError(
      "This order is closed and cannot be changed.",
      409,
    );
  if (action.type === "payment.record") {
    if (action.amount > balance(order))
      throw new WorkspaceError(
        "This amount exceeds the remaining balance.",
        409,
      );
    order.payments.push({
      id: crypto.randomUUID(),
      amount: action.amount,
      method: action.method,
      date: timestamp,
    });
    event(order.id, "Payment recorded", `${order.number} · ${action.method}`);
  } else if (action.type === "order.deliver") {
    if (
      order.status !== "ready" ||
      !order.items.every((item) => item.station === STATIONS.length)
    )
      throw new WorkspaceError("Finish every garment before delivery.", 409);
    if (paid(order) !== total(order))
      throw new WorkspaceError("Settle the balance before delivery.", 409);
    order.status = "delivered";
    order.deliveredAt = timestamp;
    event(order.id, "Another happy handover", `${order.number} was delivered.`);
  } else {
    const piece = order.items.find((item) => item.id === action.pieceId);
    if (!piece) throw new WorkspaceError("Garment not found.", 404);
    if (action.type === "piece.advance") {
      if (
        piece.station !== action.expectedStation ||
        piece.station >= STATIONS.length
      )
        throw new WorkspaceError(
          "This garment’s progress has changed. Refresh and try again.",
          409,
        );
      const completed = STATIONS[piece.station];
      piece.station++;
      event(
        order.id,
        `${completed} complete`,
        `${order.number} · ${piece.garment}`,
      );
    } else {
      piece.station = action.station;
      event(
        order.id,
        `Correction at ${STATIONS[action.station].toLowerCase()}`,
        action.reason,
      );
    }
    order.status = order.items.every((item) => item.station === STATIONS.length)
      ? "ready"
      : "in_progress";
  }
  return { data, resultId: order.id };
}
