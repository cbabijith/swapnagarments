export { ordersRouter } from "./presentation/orders-router";

export type {
  Order,
  OrderItem,
  OrderStatus,
  OrderPriority,
  GarmentType,
} from "./domain/order";
export { ORDER_STATUSES, ORDER_PRIORITIES, GARMENT_TYPES } from "./domain/order";
export { ORDER_EVENTS } from "./domain/order-events";
export type {
  OrderCreatedPayload,
  OrderStatusChangedPayload,
} from "./domain/order-events";
