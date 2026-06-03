# ADR-003: BullMQ + Redis as Message Queue

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

The message sending flow in the WaaS Gateway is inherently asynchronous:

1. **API receives the request** → persists the message with status `QUEUED` → returns `202 Accepted` with idempotency key.
2. **Worker processes** → resolves the channel's provider → sends via adapter → updates status to `SENT` or `FAILED`.
3. **Retry with backoff** — transient failures (provider timeout, rate limit) require automatic retry with exponential backoff.
4. **Dead-letter queue (DLQ)** — after N retries, the message goes to DLQ for manual investigation.
5. **Delay/scheduling** — scheduled messages require native delay.

In parallel, Redis is already a mandatory dependency of the system for three independent reasons:

- **Baileys auth state**: the Baileys adapter persists WhatsApp session credentials in Redis.
- **Rate limiting**: rate control per workspace/channel uses Redis as backend.
- **Idempotency keys**: request deduplication uses TTL keys in Redis.

## Decision

Adopt **BullMQ 5.x** as the queue library on top of **Redis 7** as the backend.

### Key Configuration

- **Queue per bounded context**: `messaging:send`, `notification:webhook`, `provider:lifecycle`.
- **Retry**: exponential backoff with `attempts: 5`, `backoff: { type: 'exponential', delay: 1000 }`.
- **DLQ**: jobs that exceed max attempts are moved to `<queue>:dlq` via event listener.
- **Concurrency**: configurable per queue, default 5 workers per queue.
- **Rate limiting**: native BullMQ `limiter` to respect provider rate limits (e.g., Meta Cloud API = 80 msgs/s per phone number).

## Consequences

### Positive

- **No new infrastructure dependency**: Redis is already in the stack for 3 other reasons. BullMQ is a Node.js library, not a separate service.
- **Native retry/backoff/DLQ**: `attempts`, `backoff`, and failure events are built-in BullMQ features. No reimplementation needed.
- **Official NestJS integration**: `@nestjs/bullmq` provides decorators (`@Processor`, `@WorkerHost`) that integrate with the DI container — workers receive injected use cases.
- **Native delay**: `delay: ms` in job options supports scheduled messages without external cron.
- **Free dashboard**: Bull Board or Arena for queue visualization in development.
- **Job priority**: BullMQ supports numeric priority, useful for urgent vs. batch messages.

### Negative

- **Redis as SPOF**: if Redis goes down, enqueue fails. Mitigated by Transactional Outbox (ADR-005) — the message is persisted in PostgreSQL and the poller re-enqueues when Redis comes back.
- **Best-effort persistence**: Redis is in-memory with configurable persistence (RDB/AOF). On crash without flush, in-memory jobs are lost. Again mitigated by the outbox.
- **No exactly-once guarantee**: BullMQ offers at-least-once. Consumers must be idempotent (deduplication by message ID).
- **Complex Redis operations**: BullMQ uses Lua scripts internally. Debugging queue issues requires knowledge of Redis internals.

## Alternatives Rejected

### Temporal.io

- **Pros**: durable workflows, native retry/compensation/saga, excellent for complex orchestration.
- **Cons**: requires a Temporal cluster (Go server + PostgreSQL/Cassandra + Elasticsearch). Massive operational overhead for a microservice that needs a simple queue with retry. The WaaS has no long-running workflows or complex sagas.
- **Rejected because**: using a cannon to kill an ant. The operational cost and deployment complexity are disproportionate to the problem.

### RabbitMQ

- **Pros**: mature broker, AMQP/MQTT protocols, flexible exchanges, native clustering.
- **Cons**: adds an Erlang/OTP infrastructure dependency to the stack. Requires separate deployment, monitoring and operation. The WaaS already has Redis — using RabbitMQ duplicates the messaging layer without clear benefit (no need for complex routing, fanout, or multi-protocol).
- **Rejected because**: does not justify the additional operational cost when Redis+BullMQ meets the requirements.

### pg-boss (PostgreSQL as queue)

- **Pros**: zero additional infra (uses the existing PostgreSQL), ACID transactions with the same domain connection.
- **Cons**: PostgreSQL as a queue is a documented anti-pattern — constant polling under load generates lock contention, degrades normal query performance, and vacuum suffers from the high insert/delete rate of jobs. BullMQ on Redis is orders of magnitude more efficient for this workload.
- **Rejected because**: mixing OLTP workload with queue workload on the same PostgreSQL creates contention. Redis as queue backend is the correct trade-off.
