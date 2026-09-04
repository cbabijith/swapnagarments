import type { EventBus } from "@/core/events";
import type { AppEventMap } from "@/core/events/app-events";
import type { Logger } from "@/core/logging/logger";
import type { OrderRepository } from "../domain/order-repository";

/** Everything an order use case may depend on — all ports, no concrete infrastructure. */
export interface OrderUseCaseDeps {
  orders: OrderRepository;
  events: EventBus<AppEventMap>;
  logger: Logger;
}
