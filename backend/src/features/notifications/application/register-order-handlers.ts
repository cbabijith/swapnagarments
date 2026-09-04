import type { EventBus } from "@/core/events";
import type { AppEventMap } from "@/core/events/app-events";
import type { Logger } from "@/core/logging/logger";
import { ORDER_EVENTS } from "@/features/orders";
import { orderCreatedMessage, orderStatusMessage } from "../domain/templates";
import type { EmailSender, WhatsAppSender } from "../domain/ports";
import { SendNotificationUseCase } from "./send-notification";

export interface OrderNotificationDeps {
  bus: EventBus<AppEventMap>;
  email: EmailSender;
  whatsapp: WhatsAppSender;
  logger: Logger;
}

/**
 * Event-driven glue: whenever an order event fires, customer notifications
 * go out on every channel the customer can be reached on. The event bus
 * isolates handler failures, so a notification problem can never fail the
 * order workflow itself.
 */
export function registerOrderNotificationHandlers(deps: OrderNotificationDeps): void {
  const logger = deps.logger.child({ feature: "notifications" });
  const send = new SendNotificationUseCase({
    email: deps.email,
    whatsapp: deps.whatsapp,
    logger,
  });

  deps.bus.subscribe(ORDER_EVENTS.orderCreated, async (event) => {
    const payload = event.payload;
    const content = orderCreatedMessage({
      customerName: payload.customerName,
      orderNumber: payload.orderNumber,
      itemCount: payload.itemCount,
      dueDate: payload.dueDate,
    });

    if (payload.customerEmail) {
      await send.run({
        channel: "email",
        to: payload.customerEmail,
        templateKey: ORDER_EVENTS.orderCreated,
        subject: content.subject,
        body: content.body,
      });
    }
    await send.run({
      channel: "whatsapp",
      to: payload.customerPhone,
      templateKey: ORDER_EVENTS.orderCreated,
      body: content.body,
    });
  });

  deps.bus.subscribe(ORDER_EVENTS.orderStatusChanged, async (event) => {
    const payload = event.payload;
    const content = orderStatusMessage({
      customerName: payload.customerName,
      orderNumber: payload.orderNumber,
      status: payload.to,
    });

    if (payload.customerEmail) {
      await send.run({
        channel: "email",
        to: payload.customerEmail,
        templateKey: ORDER_EVENTS.orderStatusChanged,
        subject: content.subject,
        body: content.body,
      });
    }
    await send.run({
      channel: "whatsapp",
      to: payload.customerPhone,
      templateKey: ORDER_EVENTS.orderStatusChanged,
      body: content.body,
    });
  });
}
