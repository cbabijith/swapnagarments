import { NotFoundError } from "@/core/errors/app-errors";
import { transitionOrderStatus, type Order } from "../domain/order";
import { ORDER_EVENTS } from "../domain/order-events";
import type { UpdateOrderStatusDto } from "./order-schemas";
import type { OrderUseCaseDeps } from "./deps";

export class UpdateOrderStatusUseCase {
  constructor(private readonly deps: OrderUseCaseDeps) {}

  async run(id: string, input: UpdateOrderStatusDto, actorId?: string): Promise<Order> {
    const current = await this.deps.orders.findById(id);
    if (!current) {
      throw new NotFoundError("Order", id);
    }

    const updated = transitionOrderStatus(current, input.status, { now: new Date() });
    await this.deps.orders.save(updated);
    this.deps.logger.info("Order status changed", {
      orderId: id,
      orderNumber: updated.orderNumber,
      from: current.status,
      to: updated.status,
      actorId: actorId ?? "system",
    });

    await this.deps.events.publish(
      ORDER_EVENTS.orderStatusChanged,
      {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        customerEmail: updated.customerEmail,
        from: current.status,
        to: updated.status,
      },
      { actorId: actorId ?? "system" },
    );

    return updated;
  }
}
