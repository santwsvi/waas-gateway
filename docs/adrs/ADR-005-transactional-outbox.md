# ADR-005: Transactional Outbox Pattern

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

The message sending flow in the WaaS Gateway involves two operations on distinct systems:

1. **Persist the message state** in PostgreSQL (status `QUEUED`, payload, metadata).
2. **Publish a domain event** (`MessageQueued`) to BullMQ/Redis, which triggers the sending worker.

This is the classic **dual-write problem**. Without atomicity between the two operations, there are two failure scenarios:

| Scenario | What happens | Consequence |
|----------|-------------|-------------|
| DB commit OK, Redis publish fails | Message persisted but never processed | **Message lost** — user thinks it was sent, but it never was |
| Redis publish OK, DB commit fails | Job in queue without database record | Worker tries to send a message that doesn't exist, silent error |

The first scenario is the most severe and the most likely (Redis is single-instance, may be momentarily unavailable). In a messaging gateway, **losing messages is unacceptable**.

## Decision

Implement the **Transactional Outbox Pattern**: domain events are persisted in the same transaction as the aggregate, and an asynchronous poller publishes them to BullMQ.

### Mechanism

```
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL Transaction              │
│                                                     │
│  1. INSERT INTO messages (id, status, payload, ...) │
│  2. INSERT INTO outbox_events (                     │
│       id, aggregate_type, aggregate_id,             │
│       event_type, payload, status='PENDING',        │
│       created_at                                    │
│     )                                               │
│                                                     │
│  COMMIT (atomic)                                    │
└─────────────────────────────────────────────────────┘

        ↓ (asynchronous poller, configurable interval)

┌─────────────────────────────────────────────────────┐
│              Outbox Poller (cron job)                │
│                                                     │
│  1. SELECT * FROM outbox_events                     │
│     WHERE status = 'PENDING'                        │
│     ORDER BY created_at ASC                         │
│     LIMIT 100                                       │
│     FOR UPDATE SKIP LOCKED                          │
│                                                     │
│  2. For each event:                                 │
│     - Publish to BullMQ (corresponding queue)       │
│     - UPDATE outbox_events SET status = 'PUBLISHED' │
│                                                     │
│  3. Cleanup: DELETE WHERE status = 'PUBLISHED'      │
│     AND created_at < NOW() - INTERVAL '7 days'      │
└─────────────────────────────────────────────────────┘
```

### Prisma Schema

```prisma
model OutboxEvent {
  id            String   @id @default(uuid())
  aggregateType String   @map("aggregate_type")
  aggregateId   String   @map("aggregate_id")
  eventType     String   @map("event_type")
  payload       Json
  status        String   @default("PENDING") // PENDING | PUBLISHED
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([status, createdAt])
  @@map("outbox_events")
}
```

### Use Case Implementation

```typescript
class SendMessageUseCase {
  async execute(command: SendMessageCommand): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const message = Message.create(command);
      await tx.message.create({ data: MessageMapper.toPersistence(message) });

      const event = new MessageQueuedEvent(message);
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Message',
          aggregateId: message.id,
          eventType: 'MessageQueued',
          payload: event.toJSON(),
        },
      });
    });
  }
}
```

### Poller Configuration

- **Interval**: 5 seconds (configurable via env `OUTBOX_POLL_INTERVAL_MS`).
- **Batch size**: 100 events per cycle.
- **Locking**: `FOR UPDATE SKIP LOCKED` allows multiple poller instances without conflict.
- **Cleanup**: daily cron job removes `PUBLISHED` events older than 7 days.

## Consequences

### Positive

- **At-least-once guarantee**: if the PostgreSQL commit succeeded, the event is persisted. The poller eventually publishes it, even if Redis is temporarily unavailable.
- **Crash recovery**: if the application crashes between commit and publish, the event remains `PENDING` and will be republished in the next poller cycle.
- **Auditability**: the `outbox_events` table is an auditable log of all emitted domain events. Useful for debugging and replay.
- **Debuggable**: `SELECT * FROM outbox_events WHERE status = 'PENDING'` immediately shows unprocessed events.
- **Temporal decoupling**: the producer (use case) doesn't need to know if Redis is up. It only writes to PostgreSQL.

### Negative

- **Polling latency**: in the worst case, an event waits up to 5 seconds to be published. For the WaaS, this latency is acceptable — WhatsApp messages don't have millisecond SLAs.
- **Outbox table growth**: without cleanup, the table grows indefinitely. Mitigated by the cleanup job that removes `PUBLISHED` events older than 7 days.
- **Consumers must be idempotent**: at-least-once means the same event can be published more than once (e.g., poller publishes but fails before marking `PUBLISHED`). Consumers use the `eventId` for deduplication.
- **Additional complexity**: poller, extra table, cleanup job. It is real overhead, but proportional to the risk it mitigates (message loss).

## Alternatives Rejected

### Direct publish (no outbox)

- **Pros**: simple, no additional latency, no extra table.
- **Cons**: dual-write problem in its purest form. If Redis fails after the PostgreSQL commit, the message is silently lost.
- **Rejected because**: unacceptable for a messaging gateway. Simplicity does not justify the risk of data loss.

### CDC (Change Data Capture) with Debezium

- **Pros**: captures changes from the PostgreSQL WAL and automatically publishes to Kafka/Redis. No poller, no outbox table.
- **Cons**: requires Kafka Connect + Debezium + replication slot configuration in PostgreSQL. Massive operational infrastructure for a microservice. Debugging CDC pipeline issues requires expertise in Kafka internals.
- **Rejected because**: the operational overhead is disproportionate. The WaaS is a microservice with moderate volume — a simple poller solves the problem with a fraction of the complexity.

### Event Sourcing

- **Pros**: events are the source of truth, native replay, complete audit trail, eliminates dual-write by design.
- **Cons**: significant architectural complexity. Requires an event store (EventStoreDB or custom implementation), read projections, snapshots for performance, event versioning. The WaaS domain doesn't justify it — entities have simple state machines (<10 states), not long-running workflows.
- **Rejected because**: event sourcing solves dual-write but introduces complexity disproportionate to the domain size. The outbox is the Goldilocks solution — solves the problem without restructuring all persistence.
