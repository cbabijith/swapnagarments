import type { Order } from "../domain/order";
import { createOrderEntity } from "../domain/order";
import { ORDER_EVENTS } from "../domain/order-events";
import type { CreateOrderDto } from "./order-schemas";
import type { OrderUseCaseDeps } from "./deps";

export class CreateOrderUseCase {
  constructor(private readonly deps: OrderUseCaseDeps) {}

  async run(input: CreateOrderDto, actorId?: string): Promise<Order> {
    const now = new Date();
    const order = createOrderEntity(input, { now });

    await this.deps.orders.save(order);
    this.deps.logger.info("Order created", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      actorId: actorId ?? "system",
    });

    await this.deps.events.publish(
      ORDER_EVENTS.orderCreated,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        priority: order.priority,
        dueDate: order.dueDate,
      },
      { actorId: actorId ?? "system" },
    );

    return order;
  }
}
