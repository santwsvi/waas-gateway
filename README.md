# WaaS Gateway

> Messaging-as-a-Service Gateway — plug-and-play messaging abstraction for any application.

## What is WaaS?

WaaS is an independent microservice that abstracts messaging providers (WhatsApp via Baileys, Meta Cloud API, Twilio) behind adaptive contracts. Systems that need to send/receive messages integrate with WaaS via REST API — they never deal with provider-specific protocols.

## Architecture

- **Clean Architecture + Hexagonal (Ports & Adapters) + DDD**
- 4 Bounded Contexts: Workspace, Channel Management, Messaging, Notification
- Provider adapters implement segregated ports (ISP): `IProviderLifecycle`, `IMessageSender`, `IProviderEventSource`
- Transactional Outbox for at-least-once event delivery
- State pattern for Channel and Message lifecycle

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Language | TypeScript 5.x |
| Framework | NestJS 11 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Testing | Jest + Supertest |

## Project Structure

```
src/
  domain/           # Entities, VOs, events, ports — ZERO external deps
  application/      # Use cases
  infrastructure/   # Adapters (Baileys, Prisma, Redis, BullMQ)
  interfaces/       # HTTP controllers, SSE, DTOs
docs/
  adrs/             # Architecture Decision Records
  diagrams/         # UML and architectural diagrams
```

## Getting Started

```bash
# Prerequisites: Docker (for PostgreSQL + Redis)
docker compose up -d
npm install
npx prisma migrate dev
npm run start:dev
```

## Documentation

- [Architecture Decision Records](./docs/adrs/)
- [Glossary](./docs/GLOSSARY.md)
- [Discovery Document](./docs/DISCOVERY.md)
- [Process & Engineering Standards](./docs/PROCESS.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT

