import type { DomainEvent } from '@domain/shared/domain-event.js';

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: string;
  status: OutboxEventStatus;
  createdAt: Date;
  publishedAt: Date | null;
}

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export interface IOutboxRepository {
  store(event: DomainEvent): Promise<void>;
  storeBatch(events: DomainEvent[]): Promise<void>;
  fetchPending(batchSize: number): Promise<OutboxEvent[]>;
  markPublished(eventId: string): Promise<void>;
  markFailed(eventId: string, reason: string): Promise<void>;
}

export const OUTBOX_REPOSITORY = Symbol('IOutboxRepository');
