import type { Logger } from "@/core/logging/logger";
import type { DomainEvent, EventMetadata } from "./domain-event";
import type { EventDefinitions, EventBus, EventHandler } from "./event-bus";

type StoredHandler = (event: DomainEvent<never, string>) => Promise<void> | void;

export interface InMemoryEventBusOptions {
  logger: Logger;
  historyLimit?: number;
}

/**
 * In-process, publish/subscribe event bus.
 *
 * Chosen for the setup phase so the event-driven flow works end to end with
 * zero infrastructure. The `EventBus` port lets us swap in a durable broker
 * (queue/outbox) later without touching features.
 */
export class InMemoryEventBus<Events extends EventDefinitions> implements EventBus<Events> {
  private readonly handlers = new Map<string, Set<StoredHandler>>();
  private readonly history: DomainEvent[] = [];

  constructor(private readonly options: InMemoryEventBusOptions) {}

  subscribe<Name extends keyof Events & string>(
    name: Name,
    handler: EventHandler<Events[Name], Name>,
  ): void {
    const subscribers = this.handlers.get(name) ?? new Set<StoredHandler>();
    // One controlled cast: handlers are stored uniformly and re-dispatched
    // with the same event shape they subscribed to.
    subscribers.add(handler as unknown as StoredHandler);
    this.handlers.set(name, subscribers);
  }

  async publish<Name extends keyof Events & string>(
    name: Name,
    payload: Events[Name],
    metadata: EventMetadata = {},
  ): Promise<void> {
    const event: DomainEvent<Events[Name], Name> = {
      id: crypto.randomUUID(),
      name,
      payload,
      occurredAt: new Date().toISOString(),
      metadata,
    };
    this.recordHistory(event);

    const subscribers = [...(this.handlers.get(name) ?? [])];
    if (subscribers.length === 0) {
      this.options.logger.debug("Event published with no subscribers", {
        event: name,
        eventId: event.id,
      });
      return;
    }

    // Handlers run isolated: one failing handler must never fail the
    // publisher or its sibling handlers.
    const results = await Promise.allSettled(
      subscribers.map((handler) => handler(event as unknown as DomainEvent<never, string>)),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        this.options.logger.error("Event handler failed", {
          event: name,
          eventId: event.id,
          handlerIndex: index,
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });
  }

  recentEvents(limit = 50): DomainEvent[] {
    const count = Math.min(Math.max(limit, 0), this.history.length);
    return this.history.slice(0, count).map((event) => ({
      ...event,
      payload: structuredClone(event.payload),
    }));
  }

  private recordHistory(event: DomainEvent): void {
    const limit = this.options.historyLimit ?? 200;
    this.history.unshift(event);
    if (this.history.length > limit) {
      this.history.length = limit;
    }
  }
}
