# Event Catalog & Event-Driven APIs

Every meaningful state change publishes a **domain event** on the central
event bus (`backend/src/core/events`). Other features subscribe and react —
producers and consumers stay decoupled, which is how cross-feature flows
(notifications, billing, QR printing, …) are composed.

## Current catalog

| Event                  | Published when                          | Payload type                |
| ---------------------- | --------------------------------------- | --------------------------- |
| `order.created`        | An order is registered at intake        | `OrderCreatedPayload`       |
| `order.status.changed` | An order's status transitions           | `OrderStatusChangedPayload` |
| `auth.user.created`    | A staff user signs up (Better Auth hook)| `AuthUserCreatedPayload`    |

Definitions: `backend/src/features/orders/domain/order-events.ts` and
`backend/src/features/auth/domain/auth-events.ts`, aggregated into
`AppEventMap` (`backend/src/core/events/app-events.ts`).

### `order.created`

```ts
{
  orderId: string;
  orderNumber: string;      // e.g. SG-20260904-7F3A
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  itemCount: number;        // total quantity across items
  priority: "normal" | "high" | "urgent";
  dueDate: string | null;   // YYYY-MM-DD
}
```

### `order.status.changed`

```ts
{
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  from: OrderStatus;
  to: OrderStatus;
}
```

### `auth.user.created`

```ts
{ userId: string; name: string; email: string; }
```

## Planned events (after the domain workshop)

`customer.created`, `measurement.recorded`, `order.process.started`,
`order.process.completed`, `order.correction.requested`, `qr.tag.printed`,
`qr.tag.scanned`, `order.ready`, `order.delivered`, `invoice.generated`,
`payment.recorded`, `notification.dispatch.failed`, …

## How the bus works

- `EventBus` (`core/events/event-bus.ts`) is a **port**; implemented today
  by `InMemoryEventBus` (in-process pub/sub).
- `publish` fans out to all subscribers with `Promise.allSettled` —
  **one failing handler never fails the publisher or its siblings**; it is
  logged with the event id.
- Every event gets an id, ISO timestamp, and metadata (`correlationId`,
  `causationId`, `actorId`). The auth middleware supplies `actorId` (the
  signed-in staff user) so the audit trail knows who did what.
- The last 200 events are kept in memory — inspect via
  `GET /api/v1/events` (requires an authenticated session).

## Subscribing (example)

```ts
import { ORDER_EVENTS } from "@/features/orders";

bus.subscribe(ORDER_EVENTS.orderCreated, async (event) => {
  // event.payload is fully typed as OrderCreatedPayload
});
```

Subscriptions are registered in the composition root
(`backend/src/core/container.ts`) — see `registerOrderNotificationHandlers`
in the notifications feature for a complete example (it sends email +
WhatsApp on every order event, using console adapters until real providers
are configured).

## Roadmap: durable events

The in-process bus is a deliberate setup-phase choice (zero infrastructure,
proves the flow end to end). Before production notifications matter, pick
one:

1. **Transactional outbox on the domain database** (recommended once the DB
   lands): events written in the same transaction as state, a worker
   delivers them with retries — no lost events, no extra moving parts.
2. **Dedicated queue** (Redis + BullMQ, RabbitMQ, …) if delivery latency or
   fan-out grows.

Either way only `core/container.ts` changes — features keep calling the
same `EventBus` port.
