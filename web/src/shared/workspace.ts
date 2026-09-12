import type { Customer } from "@/features/customers/types";
export type { Customer } from "@/features/customers/types";
import type { Priority, OrderStatus, Order } from "@/features/orders/types";
export type {
  Priority,
  OrderStatus,
  OrderItem,
  Order,
} from "@/features/orders/types";
export type { Payment } from "@/features/billing/types";
import type { DayReport } from "@/features/reports/types";
export type { DayReport } from "@/features/reports/types";
import type { Employee } from "@/features/team/types";
export type { Employee } from "@/features/team/types";
import type { Activity } from "@/features/dashboard/types";
export type { Activity } from "@/features/dashboard/types";

export const STATIONS = [
  "Cutting",
  "Sizing",
  "Handloom",
  "Stitching",
  "Ironing",
] as const;
export const GARMENTS = [
  "Blouse",
  "Churidar",
  "Gown",
  "Skirt",
  "Pavada & davani",
  "Other",
] as const;
export type Workspace = {
  customers: Customer[];
  orders: Order[];
  activity: Activity[];
  staff: Employee[];
  closedDays: string[];
  dayReports?: DayReport[];
};
export const emptyWorkspace = (): Workspace => ({
  customers: [],
  orders: [],
  activity: [],
  staff: [],
  closedDays: [],
  dayReports: [],
});

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  ready: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
};
export function shopDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return shopDate(date);
}
export function formatDate(value: string, long = false) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00+05:30`)
    : new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: long ? "long" : "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 100 ? 2 : 0,
  }).format(value / 100);
}
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
export function total(order: Order) {
  return order.items.reduce((sum, item) => sum + item.price, 0);
}
export function paid(order: Order) {
  return order.payments.reduce((sum, payment) => sum + payment.amount, 0);
}
export function balance(order: Order) {
  return total(order) - paid(order);
}
export function isOpen(order: Order) {
  return !["delivered", "cancelled"].includes(order.status);
}
export function isOverdue(order: Order, today: string) {
  return isOpen(order) && order.dueDate < today;
}
export function prioritySort(a: Order, b: Order) {
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.dueDate.localeCompare(b.dueDate)
  );
}

// Only used by the explicitly labelled workspace preview. Never written to Railway.
export function createPreviewWorkspace(): Workspace {
  const names = [
    "Lakshmi Nair",
    "Anjali Menon",
    "Fathima Basheer",
    "Priya Suresh",
    "Meera Krishnan",
    "Devika Pillai",
    "Sara Thomas",
    "Nandana Raj",
  ];
  const customers: Customer[] = names.map((name, index): Customer => ({
    id: `customer-${index + 1}`,
    name,
    phone: `90000000${String(index + 1).padStart(2, "0")}`,
    email: "",
    notes:
      index === 0
        ? "Prefers a comfortable fit. Please keep the remaining fabric."
        : "",
    measurements:
      index < 5
        ? {
            Bust: "36",
            Waist: "30",
            Shoulder: "14",
            "Sleeve length": "10",
            "Blouse length": "15",
            "Neck depth": "7",
          }
        : {},
  }));
  const configurations: [
    number,
    string,
    number,
    Priority,
    number,
    OrderStatus,
    number,
  ][] = [
    [0, "Blouse", -1, "urgent", 3, "in_progress", 180000],
    [1, "Churidar", 0, "high", 4, "in_progress", 240000],
    [2, "Blouse", 0, "normal", 5, "ready", 140000],
    [3, "Gown", 0, "urgent", 2, "in_progress", 320000],
    [4, "Blouse", 1, "high", 1, "in_progress", 160000],
    [5, "Skirt", 0, "normal", 5, "ready", 120000],
    [6, "Churidar", 2, "normal", 0, "received", 180000],
    [7, "Blouse", -2, "high", 4, "in_progress", 220000],
    [0, "Blouse", 0, "normal", 5, "delivered", 140000],
    [3, "Skirt", 0, "normal", 5, "delivered", 120000],
    [4, "Gown", 3, "normal", 0, "received", 280000],
    [6, "Blouse", 1, "normal", 5, "ready", 180000],
  ];
  const orders: Order[] = configurations.map(
    ([customer, garment, due, priority, station, status, price], index) => ({
      id: `order-${index + 1}`,
      number: `SG-${1041 + index}`,
      customerId: customers[customer].id,
      items: [
        {
          id: `piece-${index + 1}`,
          garment,
          material: [
            "Rose silk · customer fabric",
            "Sage cotton · with lining",
            "Ivory silk · elbow sleeve",
            "Maroon georgette · occasion wear",
          ][index % 4],
          station,
          price,
        },
      ],
      priority,
      dueDate: offsetDate(due),
      createdAt: `${offsetDate(index > 9 ? 0 : -4)}T09:00:00+05:30`,
      status,
      notes:
        priority === "urgent"
          ? "Occasion coming up. Please prioritize this order."
          : "Customer fabric received. Return the remaining material at delivery.",
      payments: [
        {
          id: `payment-${index}`,
          amount: status === "delivered" ? price : Math.round(price / 2),
          method: index % 2 ? "UPI" : "Cash",
          date: `${offsetDate(status === "delivered" ? 0 : -4)}T10:00:00+05:30`,
        },
      ],
      ...(status === "delivered"
        ? { deliveredAt: `${offsetDate(0)}T11:00:00+05:30` }
        : {}),
    }),
  );
  return {
    customers,
    orders,
    closedDays: [],
    staff: [
      {
        id: "staff-1",
        name: "Swapna",
        role: "Shop owner",
        station: "All stations",
        color: "sage",
      },
      {
        id: "staff-2",
        name: "Asha",
        role: "Counter staff",
        station: "Counter",
        color: "peach",
      },
      {
        id: "staff-3",
        name: "Rajesh",
        role: "Cutting master",
        station: "Cutting",
        color: "lilac",
      },
      {
        id: "staff-4",
        name: "Bindu",
        role: "Tailor",
        station: "Stitching",
        color: "sage",
      },
      {
        id: "staff-5",
        name: "Rekha",
        role: "Handloom specialist",
        station: "Handloom",
        color: "rose",
      },
      {
        id: "staff-6",
        name: "Sujatha",
        role: "Finishing specialist",
        station: "Ironing",
        color: "sand",
      },
    ],
    activity: [
      {
        id: "event-1",
        orderId: "order-3",
        title: "A little closer to delivery",
        detail: "SG-1043 is ready for Fathima to collect.",
        time: `${offsetDate(0)}T11:35:00+05:30`,
      },
      {
        id: "event-2",
        orderId: "order-9",
        title: "Another happy handover",
        detail: "Lakshmi’s blouse was delivered. Payment complete.",
        time: `${offsetDate(0)}T11:00:00+05:30`,
      },
      {
        id: "event-3",
        orderId: "order-2",
        title: "The finishing touches",
        detail: "SG-1042 moved to the ironing station.",
        time: `${offsetDate(0)}T10:20:00+05:30`,
      },
      {
        id: "event-4",
        orderId: "order-11",
        title: "A new order on the books",
        detail: "Meera’s gown has been added to the queue.",
        time: `${offsetDate(0)}T09:00:00+05:30`,
      },
    ],
  };
}

export function exportOrders(orders: Order[], customers: Customer[]) {
  const escapeCell = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  const rows = [
    [
      "Order",
      "Customer",
      "Garments",
      "Due date",
      "Status",
      "Priority",
      "Total INR",
      "Paid INR",
      "Balance INR",
    ],
    ...orders.map((order) => [
      order.number,
      customers.find((customer) => customer.id === order.customerId)?.name ??
        "",
      order.items.map((item) => item.garment).join(", "),
      order.dueDate,
      STATUS_LABEL[order.status],
      order.priority,
      String(total(order) / 100),
      String(paid(order) / 100),
      String(balance(order) / 100),
    ]),
  ];
  const blob = new Blob(
    ["\uFEFF", rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `swapna-orders-${shopDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
