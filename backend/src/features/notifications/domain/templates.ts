import type { OrderStatus } from "@/features/orders";

const SIGNATURE = "— Swapna Garments";

const STATUS_LINES: Record<OrderStatus, string> = {
  received: "We have received your order.",
  in_progress: "Our team has started working on your order.",
  ready: "Good news — your order is ready for pickup!",
  delivered: "Your order has been delivered. Thank you for choosing Swapna Garments!",
  cancelled: "Your order has been cancelled. Please contact us if this is unexpected.",
};

export interface MessageContent {
  subject?: string;
  body: string;
}

export function orderCreatedMessage(context: {
  customerName: string;
  orderNumber: string;
  itemCount: number;
  dueDate: string | null;
}): MessageContent {
  const due = context.dueDate ? ` Expected delivery: ${context.dueDate}.` : "";
  return {
    subject: `Order ${context.orderNumber} received — Swapna Garments`,
    body:
      `Dear ${context.customerName}, thank you for your visit. ` +
      `We have registered order ${context.orderNumber} for ${context.itemCount} item(s).` +
      `${due} We will keep you updated at every step.\n${SIGNATURE}`,
  };
}

export function orderStatusMessage(context: {
  customerName: string;
  orderNumber: string;
  status: OrderStatus;
}): MessageContent {
  return {
    subject: `Order ${context.orderNumber} update — Swapna Garments`,
    body:
      `Dear ${context.customerName}, update on order ${context.orderNumber}: ` +
      `${STATUS_LINES[context.status]}\n${SIGNATURE}`,
  };
}
