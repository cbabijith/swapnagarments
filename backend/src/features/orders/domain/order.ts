import { DomainRuleError } from "@/core/errors/app-errors";

export const ORDER_STATUSES = [
  "received",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PRIORITIES = ["normal", "high", "urgent"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

/**
 * Placeholder garment catalogue — the real catalogue (per-garment
 * measurement profiles, services and pricing) is a domain-workshop topic,
 * see docs/DOMAIN-DISCUSSION.md.
 */
export const GARMENT_TYPES = [
  "blouse",
  "chudidar",
  "pavada_davani",
  "gown",
  "skirt",
  "other",
] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

export interface OrderItem {
  readonly id: string;
  readonly garmentType: GarmentType;
  readonly quantity: number;
  readonly notes?: string;
}

export interface Order {
  readonly id: string;
  readonly orderNumber: string;
  /** Linked customer once the customers feature lands; null for now. */
  readonly customerId: string | null;
  /** Snapshot fields used by receipts and notification templates. */
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail: string | null;
  readonly items: readonly OrderItem[];
  readonly status: OrderStatus;
  readonly priority: OrderPriority;
  readonly dueDate: string | null;
  /** Quoted price in minor units (paise). Set by the billing feature later. */
  readonly quotedAmountMinor: number | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Simplified lifecycle for the setup phase. The real shop floor flow
 * (cutting → sizing → handloom → stitching → ironing, with repeatable steps
 * and correction loops per station) will replace this once modelled.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  // "ready -> in_progress" models the correction/rework loop.
  ready: ["delivered", "in_progress"],
  delivered: [],
  cancelled: [],
};

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,14}$/;

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: ReadonlyArray<{
    garmentType: GarmentType;
    quantity: number;
    notes?: string;
  }>;
  priority?: OrderPriority;
  dueDate?: string;
  notes?: string;
}

export function createOrderEntity(input: CreateOrderInput, options: { now: Date }): Order {
  const name = input.customerName.trim();
  if (name.length < 2) {
    throw new DomainRuleError("Customer name must be at least 2 characters long.");
  }

  const phone = input.customerPhone.trim();
  if (!PHONE_PATTERN.test(phone)) {
    throw new DomainRuleError("Customer phone number is not valid.");
  }

  if (input.items.length === 0) {
    throw new DomainRuleError("An order must contain at least one item.");
  }
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      throw new DomainRuleError(
        `Quantity for '${item.garmentType}' must be a whole number between 1 and 100.`,
      );
    }
  }

  let dueDate: string | null = null;
  if (input.dueDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      throw new DomainRuleError("Due date must use the YYYY-MM-DD format.");
    }
    const parsed = new Date(`${input.dueDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new DomainRuleError("Due date is not a real calendar date.");
    }
    if (input.dueDate < dateOnly(options.now)) {
      throw new DomainRuleError("Due date cannot be in the past.");
    }
    dueDate = input.dueDate;
  }

  const nowIso = options.now.toISOString();
  return {
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(options.now),
    customerId: null,
    customerName: name,
    customerPhone: phone,
    customerEmail: input.customerEmail?.trim() ? input.customerEmail.trim() : null,
    items: input.items.map((item) => ({ id: crypto.randomUUID(), ...item })),
    status: "received",
    priority: input.priority ?? "normal",
    dueDate,
    quotedAmountMinor: null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function transitionOrderStatus(
  order: Order,
  next: OrderStatus,
  options: { now: Date },
): Order {
  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(next)) {
    throw new DomainRuleError(
      `Cannot move order '${order.orderNumber}' from '${order.status}' to '${next}'. ` +
        `Allowed transitions: ${allowed.length > 0 ? allowed.join(", ") : "none"}.`,
    );
  }
  return { ...order, status: next, updatedAt: options.now.toISOString() };
}

function dateOnly(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Human-friendly code that also gets printed on QR labels. The random suffix
 * becomes a database-backed sequence once persistence lands.
 */
export function generateOrderNumber(now: Date): string {
  const stamp = `${now.getFullYear()}${`${now.getMonth() + 1}`.padStart(2, "0")}${`${now.getDate()}`.padStart(2, "0")}`;
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `SG-${stamp}-${suffix}`;
}
