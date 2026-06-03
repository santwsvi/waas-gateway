import type { DomainEvent } from '@domain/shared/domain-event.js';

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
