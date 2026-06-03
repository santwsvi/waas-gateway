import type { IEventPublisher } from '@domain/shared/ports/event-publisher.port.js';
import type { DomainEvent } from '@domain/shared/domain-event.js';

export class InMemoryEventPublisher implements IEventPublisher {
  private _published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this._published.push(event);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    this._published.push(...events);
  }

  get published(): ReadonlyArray<DomainEvent> {
    return [...this._published];
  }

  clear(): void {
    this._published = [];
  }
}
