# WaaS Gateway — Process & Engineering Standards

> Defines the development methodology, conventions, personas, acceptance criteria,
> CI/CD pipeline, and quality gates for the WaaS project.

---

## 1. Methodology: XP Lite + Kanban

### Why not Scrum?

Scrum assumes a stable team of 3+ people with a dedicated Product Owner.
WaaS starts as a solo/duo project. Ceremonies like sprint planning, retrospectives
and dailies would be performative — overhead with no audience. The coordination cost
is not justified for < 3 people.

### What we adopt from XP

| XP Practice | WaaS Adoption | Rationale |
|---|---|---|
| **TDD** | Mandatory in the domain layer | The domain is the most valuable asset — state machines, invariants, validations. Without TDD, regressions are inevitable. |
| **Continuous Refactoring** | Mandatory | Code that cannot be safely refactored rots. TDD enables refactoring. |
| **Simple Design (YAGNI)** | Mandatory | No speculative features. Implement what is needed today. Future adapters (Twilio, Meta Cloud) only when there is real demand. |
| **Small Releases** | Mandatory | SemVer 0.x with frequent releases. Each release must be deployable and testable end to end. |
| **Pair Programming** | Optional | When there is a second contributor. With an AI agent, the interaction already simulates pairing. |
| **Collective Code Ownership** | Mandatory | Any contributor can modify any module, respecting the architecture rules (AGENTS.md). |
| **Continuous Integration** | Mandatory | CI from commit 0. Tests run on every push. `main` never breaks. |
| **Coding Standards** | Mandatory | ESLint strict + Prettier. Path aliases. Naming conventions documented in AGENTS.md. |

### What we adopt from Kanban

| Element | Configuration |
|---|---|
| **Board** | GitHub Projects with columns: `Backlog → Ready → In Progress → Review → Done` |
| **WIP Limit** | 2 simultaneous items in `In Progress` |
| **Lead Time** | Monitored via issue labels (`size:S`, `size:M`, `size:L`) |
| **Prioritization** | Continuous — no sprints. Issues are prioritized by domain impact. |
| **Review cadence** | Weekly — review backlog, archive obsolete items, reprioritize. |

### What we DON'T do

- ❌ Sprint planning, dailies, formal retrospectives
- ❌ Story points, velocity tracking, burndown charts
- ❌ Time estimates (we're bad at them, and with 1-2 people it adds no value)
- ❌ User stories with personas ("As a user...") — the WaaS consumer is a system, not a human

---

## 2. TDD — Strategy by Layer

### Principle

TDD is not a universal dogma — it is a tool. Applied rigorously where the return is high
(complex domain logic) and pragmatically where the return is low (infra CRUD).

### Application Matrix

| Layer | TDD Approach | Rationale |
|---|---|---|
| **Domain** | **Classic TDD (Beck)** — mandatory, no exceptions | Aggregates, Value Objects, and Domain Services contain state machines, invariants, and business rules. Every state transition, input validation, and event emission must be born from a red test. |
| **Application** | **Test-first** — mandatory for complex logic, optional for trivial orchestration | Use cases orchestrate ports. When there is conditional logic (retry, circuit breaker, saga), test-first. When it is a pure call-through (create → save → return), test-after is acceptable. |
| **Infrastructure** | **Test-after** — acceptable | Adapters integrate with external systems (Prisma, Redis, Baileys). The test value lies in contract verification, not emergent design. Integration tests with Testcontainers validate the adapter against the real system. |
| **Interface (API)** | **Test-after** — acceptable | Controllers are thin wrappers. E2E tests with Supertest validate the complete flow. TDD on a controller that delegates 100% to the use case is not worth it. |

### Red-Green-Refactor Cycle in the Domain

```
1. RED    — Write a test describing expected behavior.
            The test MUST fail. If it doesn't fail, the test is useless.
            Name descriptively: `it('should reject transition from CREATED directly to CONNECTED')`

2. GREEN  — Implement the absolute MINIMUM to pass.
            It can be hardcoded, it can be ugly. The intent is to validate
            that the test actually verifies something.

3. REFACTOR — Clean up without changing behavior.
              Extract Value Objects, rename, simplify.
              The tests ensure nothing broke.
```

### Coverage as a Trend Metric

Coverage is not a KPI. It is a directional indicator:

| Layer | Coverage Target | Note |
|---|---|---|
| Domain | ≥ 90% | Pure domain is 100% testable. If it's below 90%, something was not tested. |
| Application | ≥ 80% | Use cases with orchestration logic should be covered. |
| Infrastructure | ≥ 70% | Adapters tested via integration + contract tests. |
| E2E | N/A | Happy paths of the 4 main flows. Coverage does not apply — the value is flow validation. |

**Rule:** coverage must never *drop* between PRs. CI blocks merge if coverage drops. The direction matters more than the absolute number.

---

## 3. Detailed Testing Strategy

### Pyramid

```
        ┌─────┐
        │ E2E │  ~5%   Supertest + Testcontainers
        │     │
       ┌┴─────┴┐
       │Integr.│  ~20%  Jest + Testcontainers (PG, Redis)
       │       │
      ┌┴───────┴┐
      │Contract │  ~15%  Shared suites (InMemory ↔ Real adapter)
      │         │
     ┌┴─────────┴┐
     │   Unit    │  ~60%  Jest — pure domain, no mocks
     └───────────┘
```

### Contract Tests — The Differentiator

Contract tests ensure that `InMemoryChannelRepository` and `PrismaChannelRepository`
behave identically. They are the same suite executed against both adapters:

```typescript
// Shared suite — runs against both adapters
export function channelRepositoryContract(
  factory: () => IChannelRepository
) {
  describe('IChannelRepository contract', () => {
    it('should persist and retrieve channel by id', async () => { /* ... */ });
    it('should return null when channel does not exist', async () => { /* ... */ });
    it('should list channels by workspace id', async () => { /* ... */ });
    it('should update channel status', async () => { /* ... */ });
  });
}

// Unit: InMemory
describe('InMemoryChannelRepository', () => {
  channelRepositoryContract(() => new InMemoryChannelRepository());
});

// Integration: Prisma
describe('PrismaChannelRepository', () => {
  channelRepositoryContract(() => createPrismaChannelRepo(testDb));
});
```

### Acceptance Criteria by Test Type

| Type | Acceptance Criteria | Who validates |
|---|---|---|
| **Unit** | Test covers all logical branches of the method. Naming describes the behavior, not the implementation. Zero external dependencies. | PR review |
| **Contract** | Every port has a contract suite. Every implementation (InMemory + Real) passes the suite without adaptation. | CI (automatic) |
| **Integration** | Testcontainers ensures isolated environment. Test data is created and cleaned per test. No dependency on execution order. | CI (automatic) |
| **E2E** | Covers the complete happy path of the bounded context. Uses InMemory provider (does not depend on real WhatsApp). Verifies HTTP response + side effects (DB, events). | CI (automatic) |

---

## 4. Personas / Stakeholders

### Why not traditional User Personas?

WaaS is an **infrastructure microservice** whose primary consumer is another system
(via REST API). UX personas (Maria, 28 years old, marketing manager) do not apply.

### Project Stakeholders

| Stakeholder | Role | Interest | Interaction with WaaS |
|---|---|---|---|
| **Integrator developer** | Builds the application that consumes the WaaS API | Wants predictable API, clear docs, reliable webhooks, fast onboarding | REST API + Webhooks |
| **Operator / DevOps** | Deploys, monitors, scales WaaS | Wants Prometheus metrics, structured logs, graceful shutdown, Docker Compose for dev | Infra (Docker, Prometheus, logs) |
| **OSS Contributor** | Wants to add a new provider adapter | Wants well-defined ports, contract tests as specification, contribution docs | Codebase (domain + infra layers) |
| **Architect** | Evaluates whether WaaS solves their system's messaging problem | Wants ADRs with trade-offs, diagrams, explicit NFRs | Documentation (DISCOVERY.md, ADRs) |

### AI Agent Personas

When working with AI agents in development, we use the following personas:

| Persona | Role | When to activate |
|---|---|---|
| **Oráculo dos Sistemas** | Architect — design, trade-offs, ADRs | Architectural decisions, design review, new bounded contexts |
| **Artesão do React Vite** | Frontend — if/when there is a dashboard | Admin dashboard, channel status visualization |
| **Sentinela Anti-Fraude** | Security review | Auth review, encryption, OWASP compliance |

---

## 5. Commit Conventions

### Conventional Commits (en)

Commits in **English** following [Conventional Commits 1.0.0](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer(s)]
```

### Types

| Type | When to use | Example |
|---|---|---|
| `feat` | New functional feature | `feat(messaging): add retry with exponential backoff` |
| `fix` | Bug fix | `fix(channel): prevent message send on disconnected state` |
| `refactor` | Restructuring without behavior change | `refactor(domain): extract PhoneNumber value object` |
| `test` | Adding/modifying tests | `test(workspace): add contract tests for InMemoryRepo` |
| `docs` | Documentation | `docs(api): add OpenAPI spec for /messages endpoint` |
| `chore` | Maintenance (deps, configs, scripts) | `chore(deps): bump prisma to 6.2.1` |
| `ci` | CI/CD pipeline | `ci: add integration test stage with testcontainers` |
| `perf` | Performance optimization | `perf(outbox): batch polling with cursor-based pagination` |
| `style` | Formatting (no logic change) | `style: apply prettier formatting` |

### Scopes

Scope = bounded context or architectural layer:

- `workspace` — Workspace/tenant BC
- `channel` — Channel management BC
- `messaging` — Messaging BC
- `notification` — Notification BC
- `domain` — Domain layer (cross-BC)
- `app` — Application layer
- `infra` — Infrastructure layer
- `api` — Interface layer (controllers, DTOs)
- `deps` — Dependencies
- `docker` — Docker/deployment infra

### Rules

1. **First line ≤ 72 characters** (GitHub truncates)
2. **Imperative mood** ("add", not "added" or "adds")
3. **No period** at the end of the first line
4. **Body** optional — use to explain *why*, not *what*
5. **BREAKING CHANGE:** in the footer when there is a breaking change
6. **Do not commit without tests** — if the commit adds logic, it must add or update tests

### Full Examples

```
feat(channel): implement state machine with State pattern

Use GoF State pattern with concrete classes for each ChannelStatus.
Transitions emit domain events via aggregate's recordEvent method.

Refs: ADR-006

---

fix(messaging): handle race condition in retry scheduling

When two workers process the same message simultaneously, both could
schedule retries. Added idempotency check via Redis SETNX before
scheduling.

---

feat(messaging)!: change message payload format to discriminated union

BREAKING CHANGE: MessageContent is now a discriminated union with `type`
field instead of separate text/media/template fields. Consumers must
update their send requests.
```

---

## 6. Branching Strategy

### GitHub Flow

Simple model, suited for a small team and continuous CI:

```
main ─────●───────────●───────────●───── (always deployable)
           \         /             \
            feat/xxx ●──●──●       fix/yyy ●──●
```

### Branch Conventions

| Prefix | Usage | Example |
|---|---|---|
| `feat/` | New feature | `feat/channel-state-machine` |
| `fix/` | Bug fix | `fix/retry-backoff-overflow` |
| `refactor/` | Restructuring | `refactor/extract-value-objects` |
| `test/` | Adding tests | `test/contract-tests-messaging` |
| `docs/` | Documentation | `docs/openapi-spec` |
| `chore/` | Maintenance | `chore/upgrade-nestjs-11` |

### Branch Rules

1. **`main` is sacred** — never commit directly to `main`
2. **Short-lived branches** — 3-5 days max. If it takes longer, the scope is too large.
3. **PR required** — merge via Pull Request with checks passing
4. **Squash merge** — 1 commit per PR on `main`, clean history
5. **Delete branch on merge** — automatic via GitHub settings

### Pull Request Template

```markdown
## What changes?
<!-- Concise description of the change -->

## Why?
<!-- Motivation, link to issue/ADR -->

## How to test?
<!-- Steps or commands to validate -->

## Checklist
- [ ] Tests added/updated
- [ ] Coverage did not drop
- [ ] Lint/type check passing
- [ ] ADR needed? If so, created/updated
- [ ] BREAKING CHANGE? If so, documented in the commit
```

---

## 7. Versioning — SemVer

### SemVer 2.0.0

```
MAJOR.MINOR.PATCH

MAJOR — breaking change in the public API
MINOR — new backward-compatible feature
PATCH — backward-compatible bugfix
```

### Version Roadmap

| Version | Milestone | Content |
|---|---|---|
| `0.1.0` | MVP | Workspace CRUD + Channel (InMemory provider) + message sending |
| `0.2.0` | Real provider | Baileys adapter for WhatsApp |
| `0.3.0` | Events | Webhooks + SSE for real-time events |
| `0.4.0` | Resilience | Circuit breaker, advanced retry, dead letter |
| `0.5.0` | Observability | Prometheus metrics, structured logs, health checks |
| `0.6.0` | Multi-provider | Meta Cloud API adapter |
| `1.0.0` | Stable release | When there is a consumer in production — public API stabilized |

### Versioning Rules

1. **`0.x.y` = unstable** — breaking changes are expected and accepted between minors
2. **Git tag** on each release: `v0.1.0`, `v0.2.0`, etc.
3. **CHANGELOG.md** generated automatically from Conventional Commits
4. **No pre-releases** during `0.x` — each minor is an implicit release candidate
5. **After `1.0.0`**: breaking changes only in MAJOR, deprecation warnings for 1 minor before removal

---

## 8. CI Pipeline — GitHub Actions

### Overview

```
push / PR → Lint + Type Check → Unit Tests → Contract Tests → Integration Tests → E2E → Build
```

### Stages

| Stage | What it does | When it fails |
|---|---|---|
| **Lint + Type Check** | `eslint .` + `tsc --noEmit` | Code out of standard or with type errors |
| **Unit Tests** | `jest --ci --coverage --selectProjects unit` | Domain/application test failing |
| **Contract Tests** | `jest --ci --selectProjects contract` | Adapter does not implement port correctly |
| **Integration Tests** | `jest --ci --selectProjects integration` (Testcontainers) | Adapter fails with real system |
| **E2E Tests** | `jest --ci --selectProjects e2e` (Testcontainers full stack) | End-to-end flow broken |
| **Build** | `docker build .` | Docker image does not build |

### Quality Gates

| Gate | Criterion | Action on failure |
|---|---|---|
| Coverage does not drop | `coverageThreshold` in jest.config + `--bail` | PR blocked |
| Zero ESLint warnings | `--max-warnings 0` | PR blocked |
| Clean type check | `tsc --noEmit` exit 0 | PR blocked |
| All tests pass | `jest --ci --bail` | PR blocked |
| Docker build OK | `docker build .` exit 0 | PR blocked |

### Pipeline File

See `.github/workflows/ci.yml` for the complete implementation.

---

## 9. Acceptance Criteria — Definition of Done

### For an Issue to be "Done"

1. **Code implemented** following the conventions in AGENTS.md
2. **Tests written** according to the TDD matrix (section 2):
   - Domain: TDD mandatory, test is written before the code
   - Application: test-first for complex logic
   - Infrastructure: integration test with Testcontainers
3. **CI green** — all stages pass
4. **Coverage did not drop** — verified automatically
5. **PR reviewed** — at least 1 approval (when there is a second contributor)
6. **Documentation updated** if the change affects:
   - Public API → OpenAPI spec
   - Architectural decision → new ADR or update to existing one
   - Glossary → GLOSSARY.md
   - Process → PROCESS.md

### For a Release

1. All "Done" items for each included issue
2. CHANGELOG.md updated
3. Git tag created (`v0.x.0`)
4. Docker image built and tested locally
5. README.md updated if there is a change in getting started

---

## 10. Tools and Configuration

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22 LTS | Runtime |
| TypeScript | 5.x (pinned in package.json) | Language |
| NestJS | 11.x (pinned) | Framework + DI |
| Prisma | 6.x (pinned) | ORM |
| Jest | 30.x (pinned) | Test runner |
| ESLint | 9.x (pinned) | Linter |
| Prettier | 3.x (pinned) | Formatter |
| Docker | latest stable | Containerization |
| GitHub Actions | N/A | CI |

### Pinned Versions

Every dependency uses an **exact version** in `package.json`:

```json
{
  "dependencies": {
    "@nestjs/core": "11.0.9",
    "@prisma/client": "6.2.1",
    "bullmq": "5.34.8"
  }
}
```

No `^`, no `~`, no `*`. Lock file (`package-lock.json`) committed to the repository.

---

## 11. Process Glossary

| Term | Definition |
|---|---|
| **WIP Limit** | Maximum simultaneous items in "In Progress" (2). Prevents context switching. |
| **Contract Test** | Shared suite that validates that multiple implementations of a port behave identically. |
| **Quality Gate** | Automatic check that blocks merge if criteria are not met (coverage, lint, tests). |
| **Technical Story** | Unit of work describing a technical capability, not a user narrative. |
| **Walking Skeleton** | Minimal end-to-end implementation that exercises all layers (API → Domain → Infra). |
| **Tracer Bullet** | Feature implemented "thin" across all layers, validating the architecture. |

---

> **Living document.** Update as the project evolves and decisions are revisited.
> Cross-reference: [DISCOVERY.md](./DISCOVERY.md) · [AGENTS.md](../AGENTS.md) · [CONTRIBUTING.md](../CONTRIBUTING.md)
