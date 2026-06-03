export interface DomainEventPayload {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly eventType: string;
}

export abstract class DomainEvent implements DomainEventPayload {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  abstract readonly eventType: string;

  protected constructor(aggregateId: string, eventId?: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
    this.eventId = eventId ?? crypto.randomUUID();
  }
}
