# ADR-002: Hexagonal + Clean Architecture

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

The WaaS Gateway is a multi-provider messaging gateway. It currently supports Baileys (unofficial WhatsApp) and will support Meta Cloud API, Twilio and others in the future. The central architectural requirement is:

> **Swapping or adding a messaging provider must not require changes to business logic.**

Additionally:

1. **Domain testability** — entities like `Channel`, `Message` and `Workspace` have state machines, business invariants and domain event emission. These behaviors must be testable without spinning up infrastructure (database, Redis, external APIs).
2. **Clear boundaries between BCs** — 5 bounded contexts (Workspace, Channel Management, Messaging, Provider, Notification) need explicit contracts to avoid accidental coupling.
3. **Independent evolution** — the infrastructure layer (Prisma, BullMQ, Redis) must be able to evolve (e.g., swap ORM, swap broker) without impacting the domain.

## Decision

Adopt **Clean Architecture** (concentric layers: domain → application → infrastructure) combined with **Hexagonal Architecture** (ports & adapters) to define provider boundaries.

### Layer Structure

```
src/
└── <bounded-context>/
    ├── domain/           # Entities, Value Objects, Domain Events, Domain Services
    │   ├── entities/
    │   ├── value-objects/
    │   ├── events/
    │   └── services/
    ├── application/      # Use Cases, Ports (interfaces), DTOs
    │   ├── use-cases/
    │   ├── ports/        # Inbound + Outbound interfaces
    │   └── dtos/
    └── infrastructure/   # Adapters, Controllers, Repositories, Providers
        ├── adapters/     # Outbound port implementations
        ├── controllers/  # Inbound adapters (HTTP)
        ├── persistence/  # Prisma repositories
        └── providers/    # Baileys, Meta Cloud, etc.
```

### Dependency Rule

Dependencies always point **inward**:

- `infrastructure` → `application` → `domain`
- `domain` **never** imports from `application` or `infrastructure`
- `application` **never** imports from `infrastructure`
- Ports (interfaces) live in `application/ports/`; adapters in `infrastructure/adapters/`

### Ports as Provider Contracts

Provider ports are segregated (see ADR-004):

- `IProviderLifecycle` — connect, disconnect, getQrCode
- `IMessageSender` — sendText, sendMedia, sendTemplate
- `IProviderEventSource` — onMessage, onStatusChange, onConnectionUpdate

Each provider implements only the ports it supports.

## Consequences

### Positive

- **100% testable domain**: entities and use cases are pure TypeScript classes with no framework or infra dependency. Unit tests run in milliseconds.
- **Provider swap = new adapter**: adding Meta Cloud API means creating a new adapter that implements the relevant ports and registering it in the NestJS module. Zero changes to use cases.
- **Explicit boundaries**: the dependency rule is verifiable by lint rules (e.g., eslint-plugin-boundaries or dependency-cruiser). Violations are detected in CI.
- **Independent infra evolution**: swapping Prisma for Drizzle or BullMQ for another broker affects only the infrastructure layer.
- **Contract-testable contracts**: ports define interfaces that can be validated with contract tests — any new adapter must pass the same test suite.

### Negative

- **More indirection**: an HTTP request traverses controller → use case → port → adapter → infra. The stack trace is deeper. Mitigated by consistent naming and distributed tracing.
- **Learning curve**: contributors need to understand the dependency rule and where to place each artifact. Mitigated by clear documentation and file templates.
- **Mapping boilerplate**: DTOs at layer boundaries require mappers. This is the price of layer independence — without them, the domain leaks into the API.

## Alternatives Rejected

### Traditional Layered Architecture (Controller → Service → Repository)

- **Pros**: simple, familiar, fewer files.
- **Cons**: the domain depends directly on infrastructure (concrete repositories, ORMs). Swapping a provider requires refactoring the service layer. State machines and invariants are coupled to the database.
- **Rejected because**: violates the central requirement of provider swap without altering business logic.

### Clean Architecture without Hexagonal (no explicit ports & adapters)

- **Pros**: less ceremony, use cases depend on interfaces but without the port/adapter formalization.
- **Cons**: the provider boundary becomes ambiguous. Without segregated ports, partial adapters (Twilio without QR code) generate `NotImplementedError`. Naming varies across developers.
- **Rejected because**: the port/adapter formalization is precisely what provides clarity at the provider boundary, which is the system's critical point.

### Vertical Slice Architecture

- **Pros**: each feature is self-contained, easy to delete, less horizontal coupling.
- **Cons**: the WaaS domain is rich in shared behavior — Channel and Message state machines are used by multiple slices. Entities like `Workspace` and `Channel` participate in multiple flows. Slices would lead to domain logic duplication.
- **Rejected because**: the domain is sufficiently rich and interconnected to justify horizontal layers with explicit boundaries. Vertical Slice shines in CRUD-heavy domains, not here.
