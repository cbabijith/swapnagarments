import { getEnv } from "./config/env";
import { InMemoryEventBus } from "./events/in-memory-event-bus";
import type { EventBus } from "./events";
import type { AppEventMap } from "./events/app-events";
import { createLogger, type Logger } from "./logging/logger";
import { createAuth, createDatabase, type Auth, type DrizzleDb } from "@/features/auth";
import { CreateOrderUseCase } from "@/features/orders/application/create-order";
import { GetOrderUseCase } from "@/features/orders/application/get-order";
import { ListOrdersUseCase } from "@/features/orders/application/list-orders";
import { UpdateOrderStatusUseCase } from "@/features/orders/application/update-order-status";
import { InMemoryOrderRepository } from "@/features/orders/infrastructure/in-memory-order-repository";
import {
  ConsoleEmailSender,
  ConsoleWhatsappSender,
  registerOrderNotificationHandlers,
} from "@/features/notifications";

export interface AppContainer {
  readonly env: ReturnType<typeof getEnv>;
  readonly logger: Logger;
  readonly eventBus: EventBus<AppEventMap>;
  readonly db: DrizzleDb;
  readonly auth: Auth;
  readonly orders: {
    readonly createOrder: CreateOrderUseCase;
    readonly getOrder: GetOrderUseCase;
    readonly listOrders: ListOrdersUseCase;
    readonly updateOrderStatus: UpdateOrderStatusUseCase;
  };
}

/**
 * Composition root: the only place where concrete implementations are chosen
 * and wired together. Everything downstream depends on ports/interfaces.
 */
function buildContainer(): AppContainer {
  const env = getEnv();
  const logger = createLogger({ app: env.APP_NAME }, env.LOG_LEVEL);

  const eventBus = new InMemoryEventBus<AppEventMap>({
    logger: logger.child({ component: "event-bus" }),
  });

  const db = createDatabase(env.DATABASE_FILE);
  const auth = createAuth({ db, bus: eventBus, logger, env });

  const orderRepository = new InMemoryOrderRepository();

  registerOrderNotificationHandlers({
    bus: eventBus,
    email: new ConsoleEmailSender(logger),
    whatsapp: new ConsoleWhatsappSender(logger),
    logger,
  });

  const orderDeps = {
    orders: orderRepository,
    events: eventBus,
    logger: logger.child({ feature: "orders" }),
  };

  return {
    env,
    logger,
    eventBus,
    db,
    auth,
    orders: {
      createOrder: new CreateOrderUseCase(orderDeps),
      getOrder: new GetOrderUseCase(orderDeps),
      listOrders: new ListOrdersUseCase(orderDeps),
      updateOrderStatus: new UpdateOrderStatusUseCase(orderDeps),
    },
  };
}

let container: AppContainer | undefined;

export function getContainer(): AppContainer {
  return (container ??= buildContainer());
}
