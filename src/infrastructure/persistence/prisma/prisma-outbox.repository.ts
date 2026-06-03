import { Injectable } from '@nestjs/common';
import type {
  IOutboxRepository,
  OutboxEvent,
  OutboxEventStatus,
} from '@domain/shared/ports/outbox-repository.port.js';
import type { DomainEvent } from '@domain/shared/domain-event.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaOutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async store(event: DomainEvent): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        id: event.eventId,
        eventType: event.eventType,
        aggregateType: this.extractAggregateType(event.eventType),
        aggregateId: event.aggregateId,
        workspaceId: event.aggregateId,
        payload: JSON.parse(JSON.stringify(event)),
        status: 'PENDING',
        createdAt: event.occurredAt,
      },
    });
  }

  async storeBatch(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.prisma.outboxEvent.createMany({
      data: events.map((e) => ({
        id: e.eventId,
        eventType: e.eventType,
        aggregateType: this.extractAggregateType(e.eventType),
        aggregateId: e.aggregateId,
        workspaceId: e.aggregateId,
        payload: JSON.parse(JSON.stringify(e)),
        status: 'PENDING',
        createdAt: e.occurredAt,
      })),
    });
  }

  async fetchPending(batchSize: number): Promise<OutboxEvent[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      aggregateId: r.aggregateId,
      payload: JSON.stringify(r.payload),
      status: r.status as OutboxEventStatus,
      createdAt: r.createdAt,
      publishedAt: r.publishedAt,
    }));
  }

  async markPublished(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async markFailed(eventId: string, reason: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'FAILED',
        lastError: reason,
        retryCount: { increment: 1 },
      },
    });
  }

  private extractAggregateType(eventType: string): string {
    const parts = eventType.split('.');
    return parts.length > 1 ? parts[0] : 'unknown';
  }
}
