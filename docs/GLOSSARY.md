# WaaS Gateway — Ubiquitous Language (Glossary)

> Project ubiquitous language glossary. Each term is canonical — it must be used
> consistently across code, documentation, logs, and communication.

| # | Term | Definition | What it is NOT | Context |
|---|---|---|---|---|
| 1 | **Workspace** | Logical tenant grouping channels, API keys, and rate limit policies. Represents a consumer organization. | Not a user. Not a WhatsApp account. | Workspace BC |
| 2 | **ApiKey** | Authentication credential issued to a Workspace for REST API authorization. Stored as SHA-256 hash. | Not provider credentials (QR code, tokens). | Workspace BC |
| 3 | **RateLimitPolicy** | Value Object defining request limits per time window, applied per Workspace or Channel. | Not circuit breaker (which protects against provider failures). | Workspace BC |
| 4 | **Channel** | Aggregate Root representing an active connection to a messaging provider (e.g., a WhatsApp session via Baileys). Has its own state machine. | Not a "chat" or "conversation". It's the communication pipe. | Channel Management BC |
| 5 | **ChannelStatus** | Current state in the Channel state machine: `Created → Connecting → QrPending → Connected → Reconnecting → Disconnected → Failed`. | Not message status. | Channel Management BC |
| 6 | **Provider** | Concrete implementation of a messaging service (e.g., Baileys for WhatsApp, InMemory for tests). Lives in infrastructure layer as adapter. | Not a bounded context. Not a domain entity. | Infrastructure |
| 7 | **ProviderAdapter** | Class implementing the 3 port interfaces (IProviderLifecycle, IMessageSender, IProviderEventSource) for a specific provider. | Not a domain service — pure infrastructure. | Infrastructure |
| 8 | **Message** | Aggregate Root representing a communication unit sent or received through a Channel. Has its own lifecycle state machine. | Not an "event" or "log". It's the business entity tracking send/receive. | Messaging BC |
| 9 | **MessageStatus** | State in the Message state machine: `Pending → Queued → Sending → Sent → Failed → Retrying → DeadLettered`. Inbound: `Received`. | Not ChannelStatus. "Failed" means delivery failure, not connection failure. | Messaging BC |
| 10 | **DeliveryAttempt** | Child entity of Message recording each send attempt, including timestamp, result, and failure reason. | Not retry policy — it's the historical record of an individual attempt. | Messaging BC |
| 11 | **RetryPolicy** | Value Object defining retry strategy: max attempts, backoff base, multiplier. | Not circuit breaker. Retry is per message; circuit breaker is per channel. | Messaging BC |
| 12 | **PhoneNumber** | Immutable Value Object encapsulating and validating a phone number in E.164 format. | Not a free string — has constructor validation. | Messaging BC |
| 13 | **MessageContent** | Value Object encapsulating message content (text, media URL, template) with discriminated type. | Not raw provider payload — it's the canonical domain representation. | Messaging BC |
| 14 | **ChannelConfig** | Value Object with operational channel settings: default retry policy, connection timeout, webhook URL. | Not credentials. Config is operational; creds are authentication. | Channel Management BC |
| 15 | **EncryptedCreds** | Value Object storing provider credentials encrypted with AES-256-GCM. Only decrypted at point of use. | Not ApiKey (which belongs to workspace). These are provider creds. | Channel Management BC |
| 16 | **ProviderMessageRef** | Value Object holding the message ID from the provider's system, enabling bidirectional correlation. | Not the internal Message ID — it's the external reference. | Messaging BC |
| 17 | **FailureReason** | Value Object categorizing failure cause (provider_error, rate_limited, invalid_recipient, circuit_open, etc.). | Not an exception — it's a persisted domain value. | Messaging BC |
| 18 | **OutboxEvent** | Record in the outbox table ensuring at-least-once publication of domain events. Written in the same transaction as the aggregate. | Not the domain event itself — it's the persisted transport envelope. | Cross-cutting |
| 19 | **DomainEvent** | Immutable business fact emitted by an aggregate (e.g., MessageSent, ChannelConnected). Consumed internally or via outbox. | Not a command or query. It's notification of something that already happened. | All BCs |
| 20 | **WebhookConfig** | Configuration for external endpoint receiving event notifications (URL, HMAC secret, subscribed events). | Not IEventPublisher — webhook is external delivery; publisher is internal. | Notification BC |
| 21 | **CircuitBreaker** | Pipeline mechanism that halts sends to a Channel after N consecutive failures, preventing cascading failure. States: Closed → Open → HalfOpen. | Not retry. Circuit breaker blocks; retry tries again. | Pipeline (cross-cutting) |
| 22 | **IdempotencyKey** | Unique key provided by the client in the API to ensure a duplicate operation produces no side effect. Stored in Redis with TTL. | Not the Message ID — it's a request deduplication key. | API Layer |
| 23 | **Notification** | Action of dispatching a domain event to external consumers via webhook (HTTP POST with HMAC signature). | Not mobile push notification. It's event delivery to integrated systems. | Notification BC |
| 24 | **InMemoryAdapter** | Fake ProviderAdapter simulating provider behavior without external dependencies. Used in dev and tests. | Not a mock — maintains in-memory state and simulates full lifecycle. | Infrastructure (test) |
