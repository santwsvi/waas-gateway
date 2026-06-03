# AGENTS.md

## Project: WaaS Gateway
Messaging-as-a-Service gateway. TypeScript, NestJS 11, Clean Architecture + Hexagonal + DDD.

## Architecture Rules
- Domain layer has ZERO external dependencies (no NestJS, no Prisma, no Node APIs)
- Use cases depend on ports (interfaces), never on adapters
- All cross-boundary communication via domain events + Transactional Outbox
- InMemoryAdapters implement the same port interfaces as real adapters
- State transitions in aggregates must be tested via TDD (Red-Green-Refactor)
- Never import crossing bounded context boundaries except through barrel index.ts

## Bounded Contexts
- **Workspace**: tenants, API keys, rate limit policies
- **Channel Management**: connection lifecycle, state machine, credentials
- **Messaging**: message lifecycle, delivery attempts, retry policy
- **Notification**: webhook dispatch, event subscriptions

## Ports (Domain Interfaces)
- `IProviderLifecycle` — connect, disconnect, getStatus
- `IMessageSender` — sendText, sendMedia, sendTemplate
- `IProviderEventSource` — onMessageReceived, onStatusChanged
- `IChannelRepository`, `IMessageRepository`, `IOutboxRepository`
- `IEventPublisher`

## Code Style
- Files: kebab-case (e.g. `channel.aggregate.ts`)
- Classes: PascalCase
- Interfaces: I-prefix (`IChannelRepository`)
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Enums: PascalCase with PascalCase values
- Directories: kebab-case
- Tests: `*.spec.ts` (unit), `*.integration-spec.ts`, `*.e2e-spec.ts`
- Test descriptions in English, descriptive
- Imports: use path aliases (`@domain/`, `@app/`, `@infra/`, `@shared/`)

## Commit Convention
- Conventional Commits in English
- Scopes: `workspace`, `channel`, `messaging`, `notification`, `infra`, `api`, `domain`, `docs`
- Examples:
  - `feat(messaging): add retry with exponential backoff`
  - `fix(channel): prevent message send on disconnected state`
  - `test(workspace): add contract tests for InMemoryRepo`

## Testing Strategy
- **Domain**: TDD (Classic/Beck), no mocks, pure logic
- **Application**: test-first with InMemory adapters as doubles
- **Infrastructure**: integration tests with real DB/Redis (Docker)
- **Contract tests**: shared test suites validate InMemory vs Real adapter parity
- **E2E**: full HTTP flow with InMemoryProvider

## Don'ts
- No `any` in production code
- No `console.log` (use structured logger)
- No barrel re-exports crossing bounded context boundaries
- No direct Prisma/Redis usage outside infrastructure layer
- No mocking domain objects — test real behavior
- No `NotImplementedError` in adapters — segregate interfaces instead
