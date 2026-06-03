import type { IOutboxRepository, OutboxEvent } from '@domain/shared/ports/outbox-repository.port.js';
import { OutboxEventStatus } from '@domain/shared/ports/outbox-repository.port.js';
import type { DomainEvent } from '@domain/shared/domain-event.js';

export class InMemoryOutboxRepository implements IOutboxRepository {
  private items: Map<string, OutboxEvent> = new Map();

  async store(event: DomainEvent): Promise<void> {
    const outboxEvent: OutboxEvent = {
      id: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      payload: JSON.stringify(event),
      status: OutboxEventStatus.PENDING,
      createdAt: new Date(),
      publishedAt: null,
    };
    this.items.set(outboxEvent.id, outboxEvent);
  }

  async storeBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.store(event);
    }
  }

  async fetchPending(batchSize: number): Promise<OutboxEvent[]> {
    const pending: OutboxEvent[] = [];
    for (const event of this.items.values()) {
      if (event.status === OutboxEventStatus.PENDING) {
        pending.push(event);
        if (pending.length >= batchSize) break;
      }
    }
    return pending;
  }

  async markPublished(eventId: string): Promise<void> {
    const event = this.items.get(eventId);
    if (event) {
      event.status = OutboxEventStatus.PUBLISHED;
      event.publishedAt = new Date();
    }
  }

  async markFailed(eventId: string, reason: string): Promise<void> {
    const event = this.items.get(eventId);
    if (event) {
      event.status = OutboxEventStatus.FAILED;
    }
  }

  clear(): void {
    this.items.clear();
  }

  get count(): number {
    return this.items.size;
  }

  get pendingCount(): number {
    return [...this.items.values()].filter((e) => e.status === OutboxEventStatus.PENDING).length;
  }
}
