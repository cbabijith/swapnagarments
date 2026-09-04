# Orders (reference feature)

Fully wired reference implementation of the five-layer pattern — use it as
the template for every new feature.

## Layers

- `domain/` — `Order` entity, status lifecycle with guarded transitions
  (`received → in_progress → ready → delivered`, `cancelled`, plus the
  `ready → in_progress` rework loop), garment catalogue placeholder,
  `OrderRepository` port, and the feature's event definitions.
- `application/` — zod DTOs and use cases: `CreateOrderUseCase`,
  `GetOrderUseCase`, `ListOrdersUseCase`, `UpdateOrderStatusUseCase`
  (each takes ports, publishes events on state change).
- `infrastructure/` — `InMemoryOrderRepository` (globalThis-cached; swap for
  PostgreSQL once the DB decision lands).
- `presentation/` — `withRoute`-wrapped API handlers consumed one-to-one by
  `src/app/api/v1/orders/**`.

## API

| Method | Path                  | Notes                                   |
| ------ | --------------------- | --------------------------------------- |
| POST   | `/api/v1/orders`      | Creates order, publishes `order.created` |
| GET    | `/api/v1/orders`      | Optional `?status=` / `?priority=`      |
| GET    | `/api/v1/orders/:id`  |                                         |
| PATCH  | `/api/v1/orders/:id`  | `{ status }`, publishes `order.status.changed` |

> The simplified status machine is intentionally placeholder — the real
> station-level workflow (cutting/sizing/handloom/stitching/ironing,
> repeatable steps, corrections) is modelled in `features/process-workflow`
> after the domain workshop. See docs/DOMAIN-DISCUSSION.md §3.
