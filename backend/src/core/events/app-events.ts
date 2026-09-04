import type { AuthEventMap } from "@/features/auth/domain/auth-events";
import type { OrderEventMap } from "@/features/orders/domain/order-events";

/**
 * Composition point for the application-wide event catalog.
 *
 * Each feature contributes its event map here; use cases and handlers stay
 * strongly typed while remaining decoupled. Import this file with
 * `import type` only — it exists purely for the type system.
 */
export type AppEventMap = OrderEventMap & AuthEventMap;
// Upcoming features extend the catalog here, e.g.:
// export type AppEventMap = OrderEventMap & AuthEventMap & MeasurementEventMap;
