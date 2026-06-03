# ADR-001: NestJS as HTTP Framework and DI Container

| Field       | Value                |
|-------------|----------------------|
| **Status**  | Accepted             |
| **Date**    | 2026-06-03           |
| **Authors** | Victor Gabriel       |

## Context

The WaaS Gateway is an open-source microservice that implements Clean Architecture with multiple bounded contexts (Workspace, Channel Management, Messaging, Provider, Notification). This design requires:

1. **Robust Dependency Injection container** — Clean Architecture relies on dependency inversion across all layers. Without native DI, the bootstrap becomes a manual instantiation graph that scales poorly with the number of ports/adapters.
2. **Module system that maps to bounded contexts** — each BC needs clear isolation (its own providers, controllers, services) without accidentally sharing state.
3. **Interceptors and middleware for cross-cutting concerns** — circuit breaker per channel, retry with backoff, rate limiting per workspace, structured logging and tracing need to be composed declaratively, not scattered across use cases.
4. **Mature ecosystem for the chosen dependencies** — BullMQ, Prisma, Redis and WebSocket require well-maintained integrations.
5. **Accessible onboarding** — as a community-focused open-source project, the framework needs extensive documentation and a large base of familiar developers.

The defined stack is Node.js 22 + TypeScript 5.

## Decision

Adopt **NestJS 11** as the HTTP framework and DI container.

### Key Rationale

- **Native DI with decorators** — `@Injectable()`, `@Inject()` and custom providers (`useClass`, `useFactory`) enable implementing Clean Architecture's dependency inversion without external libs (tsyringe, inversify). The injection token maps directly to the hexagonal architecture ports.
- **Modules = Bounded Contexts** — `@Module()` encapsulates providers, controllers and imports. Each BC becomes a NestJS module with explicit dependencies. `forwardRef()` resolves circular dependencies when BCs need to communicate.
- **Interceptors, Guards, Pipes, Filters** — composable pipeline for cross-cutting. Circuit breaker and rate limiter are implemented as reusable interceptors without polluting use cases.
- **@nestjs/bullmq** — official module for BullMQ integration, aligned with ADR-003.
- **Community and ecosystem** — Node.js framework with the largest enterprise adoption, ~67k GitHub stars, extensive documentation, predictable release cycle.

## Consequences

### Positive

- **Native dependency inversion**: ports are DI tokens; adapters are providers registered in the infrastructure module. Swapping an adapter (e.g., Baileys → Meta Cloud API) means changing the `useClass` in the module.
- **BC isolation via modules**: each bounded context exports only what is public. Dependencies between BCs are explicit via `imports`.
- **Declarative cross-cutting**: interceptors for retry, circuit breaker and logging are applied via decorators on controllers or globally, without altering business logic.
- **Integrated ecosystem**: BullMQ, WebSocket (via `@nestjs/platform-ws`), health checks (`@nestjs/terminus`), Swagger (`@nestjs/swagger`) — all with official or well-maintained modules.
- **Smooth learning curve for contributors**: NestJS is the most popular enterprise Node.js framework; open-source contributors likely already know it.

### Negative

- **Decorator and metadata overhead**: runtime reflection (`reflect-metadata`) adds bootstrap cost. Mitigated by the fact that it is a microservice (single bootstrap, not serverless).
- **Framework coupling**: controllers, modules and guards are NestJS-specific. Mitigated by Clean Architecture — domain and application layers import nothing from NestJS; only the infrastructure layer is coupled.
- **Opinionated structure**: NestJS imposes conventions (modules, providers, controllers) that may conflict with unconventional code organizations. In the WaaS case, this is an advantage (predictable structure).

## Alternatives Rejected

### Pure Express/Fastify (no framework)

- **Pros**: zero framework overhead, total control.
- **Cons**: no native DI — requires tsyringe or inversify, which are irregularly maintained libs. No module system, so BC organization would be purely conventional (folders), without enforcement. Cross-cutting concerns would become ad-hoc middleware.
- **Rejected because**: the cost of reimplementing DI, modules and interceptor pipeline outweighs any marginal performance gain.

### tRPC

- **Pros**: end-to-end type-safety, excellent DX with TypeScript clients.
- **Cons**: the WaaS Gateway exposes a REST API for consumers that may be any language (Play Sports Falcão is the first, but not the only one). tRPC assumes a TypeScript client. No native DI, same problem as pure Express.
- **Rejected because**: incompatible with the requirement of a language-agnostic REST API.

### Hono

- **Pros**: lightweight, fast, edge-first.
- **Cons**: immature ecosystem for enterprise use (no DI, no modules, BullMQ/Prisma integrations are hand-crafted). Smaller community, less battle-tested in production.
- **Rejected because**: unfavorable trade-off — the lightness does not compensate for the lack of ecosystem for the project's needs.
