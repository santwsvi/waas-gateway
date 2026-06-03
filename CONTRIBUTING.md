# Contributing to WaaS Gateway

## Development Setup

```bash
# Clone
git clone git@github.com:santwsvi/waas-gateway.git
cd waas-gateway

# Infrastructure
docker compose up -d   # PostgreSQL + Redis

# Install
npm install

# Database
npx prisma migrate dev

# Run
npm run start:dev
```

## Process

We follow **XP lite + Kanban**:
- TDD for domain layer (Red-Green-Refactor)
- Continuous Integration from day 1
- Simple Design (YAGNI)
- Small releases (SemVer 0.x)
- Kanban board with WIP limit of 2

No sprints, no ceremonies, no estimates. ADRs document decisions.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) in **English**.

```
feat(messaging): add retry with exponential backoff
fix(channel): prevent message send on disconnected state
refactor(domain): extract PhoneNumber value object
test(workspace): add contract tests for InMemoryRepo
docs: add architecture decision records
chore: update dependencies
```

**Scopes:** `workspace`, `channel`, `messaging`, `notification`, `infra`, `api`, `domain`, `docs`

## Branching

GitHub Flow:
- `main` is always deployable
- Feature branches: `feat/channel-state-machine`, `fix/retry-backoff`
- PR required (squash merge)

## Testing

| Layer | Strategy | Doubles | Coverage Target |
|---|---|---|---|
| Domain | TDD (Classic) | None — pure logic | ≥90% |
| Application | Test-first | InMemory adapters | ≥80% |
| Infrastructure | Integration | Docker (Testcontainers) | ≥70% |
| API | E2E | Supertest + InMemory | Critical paths |

### Naming
- Test files: `*.spec.ts` (unit), `*.integration-spec.ts`, `*.e2e-spec.ts`
- Descriptions in English: `it('should reject transition from disconnected to error')`

### Contract Tests
InMemory and real adapters MUST pass the same shared test suite to guarantee port compliance.

## Code Style

- ESLint strict + Prettier (see configs in repo root)
- Path aliases: `@domain/`, `@app/`, `@infra/`, `@shared/`
- See `AGENTS.md` for full conventions

## Architecture

Before making changes, read:
- `docs/DISCOVERY.md` — full architecture document
- `docs/GLOSSARY.md` — ubiquitous language
- `docs/adrs/` — why decisions were made

**Golden rule:** Domain layer imports NOTHING from infrastructure. If your change adds an import from `@infra/` into `@domain/`, it's an architecture bug.
