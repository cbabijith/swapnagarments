import type { DomainEvent, EventMetadata } from "./domain-event";

/** Any map of event name -> payload type, composed application-wide in `app-events.ts`. */
export type EventDefinitions = object;

export type EventHandler<Payload, Name extends string = string> = (
  event: DomainEvent<Payload, Name>,
) => Promise<void> | void;

export interface EventBus<Events extends EventDefinitions> {
  publish<Name extends keyof Events & string>(
    name: Name,
    payload: Events[Name],
    metadata?: EventMetadata,
  ): Promise<void>;

  subscribe<Name extends keyof Events & string>(
    name: Name,
    handler: EventHandler<Events[Name], Name>,
  ): void;

  /** Most recent events, newest first. Observability aid for development. */
  recentEvents(limit?: number): DomainEvent[];
}
