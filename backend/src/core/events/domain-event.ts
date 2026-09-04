export interface EventMetadata {
  /** Ties all events of one business transaction together. */
  correlationId?: string;
  /** Id of the event that directly caused this event. */
  causationId?: string;
  /** Who triggered the change (staff user id, "system", ...). */
  actorId?: string;
}

export interface DomainEvent<Payload = unknown, Name extends string = string> {
  readonly id: string;
  readonly name: Name;
  readonly payload: Payload;
  readonly occurredAt: string;
  readonly metadata: EventMetadata;
}
