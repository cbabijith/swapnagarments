import type { OrderPriority, OrderStatus } from "./order";

export const ORDER_EVENTS = {
  orderCreated: "order.created",
  orderStatusChanged: "order.status.changed",
} as const;

export interface OrderCreatedPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  itemCount: number;
  priority: OrderPriority;
  dueDate: string | null;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  from: OrderStatus;
  to: OrderStatus;
}

export interface OrderEventMap {
  "order.created": OrderCreatedPayload;
  "order.status.changed": OrderStatusChangedPayload;
}
