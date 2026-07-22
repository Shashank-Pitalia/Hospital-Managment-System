# Recommended Tech Stack

This doc gives the *what*, the *why*, and — where it matters — the *what we considered and rejected*, so
a future engineer doesn't re-litigate a decision without knowing the reasoning already happened.

## 1. Stack at a glance

| Layer | Technology | Version (baseline) | Why |
|---|---|---|---|
| Frontend | React + TypeScript + Vite | React 18, TS 5.x, Vite 5.x | Fast dev loop, huge ecosystem, easy to find hospital-IT-friendly hires |
| UI | Tailwind CSS + shadcn/ui | Tailwind 3.x | Ship consistent forms/tables fast (registration, prescription, admission forms dominate the UI) |
| Data fetching | TanStack Query | v5 | Caches patient/visit lookups, handles background refetch for live queues and bed boards |
| Forms/validation | React Hook Form + Zod | RHF 7.x, Zod 3.x | Prescriptions, admissions and eligibility forms need strict, typed validation |
| Charts | Recharts | 2.x | Admin dashboard (spec §19): occupancy, stock, expiry, utilization |
| Backend | Node.js + NestJS (TypeScript) | Node 20 LTS, NestJS 10.x | Modular-by-design (matches the module list in spec §16), built-in DI, guards for RBAC, OpenAPI support |
| API style | REST, OpenAPI/Swagger documented | OpenAPI 3.1 | Simple integration surface for future Labour Dept / lab / billing integrations |
| ORM | Prisma | 5.x | Type-safe migrations for a schema this relational (batches, wards, beds, ledgers) |
| Database | PostgreSQL | 15+ | Strong relational integrity + transactions, required for inventory ledgers and bed allocation correctness |
| Cache / queue | Redis + BullMQ | Redis 7.x | OPD queue tokens, scheduled expiry scans, low-stock alert jobs |
| Auth | JWT (access + refresh) + NestJS Guards for RBAC | — | Matches the 9 roles in spec §2; swap in Keycloak/SSO later if hospital IT policy requires it |
| QR / UID cards | `qrcode` (generation) + browser camera or USB HID scanner (reading) | `qrcode` ^1.5 | UID/QR is the core repeat-visit identifier (spec §5) |
| PDF generation | `pdf-lib` or headless Chromium (Puppeteer) | — | Prescriptions, discharge summaries, UID cards, GRNs |
| Object storage | S3-compatible (MinIO for on-prem, S3 for cloud) | — | QR images, generated PDFs, reports |
| External integration | Dedicated `LabourDeptClient` module behind an interface | — | Employee ID verification (spec §4) — mockable in dev, swappable per environment |
| Background jobs | BullMQ workers | — | Daily expiry scan (spec §14), low-stock reorder alerts (spec §12) |
| Logging | pino (structured JSON logs) | — | Feeds audit trail and observability |
| Monitoring | Prometheus + Grafana | — | Bed occupancy, queue depth, stock levels as live metrics |
| Error tracking | Sentry (self-hosted or cloud) | — | Clinical and pharmacy flows need fast defect visibility |
| CI/CD | GitHub Actions + Docker | — | Lint/typecheck/test on PR, build images, deploy |
| Dev environment | Docker Compose (api, web, postgres, redis) | Compose v2 | One-command local environment |
| Prod environment | Kubernetes if the hospital has platform capacity, otherwise Docker Compose/Swarm on a single hardened VM | — | Right-size to actual hospital IT operations capability |
| Testing | Jest + Supertest (API), Vitest + React Testing Library (web), Playwright (E2E) | — | E2E must cover the master flow in spec §15 |

## 2. Why NestJS + Postgres over alternatives

- The spec's module list (§16) is already a clean set of bounded contexts — NestJS modules map to it 1:1,
  so architecture and code structure stay in sync as the team grows.
- Inventory, billing and admission all require strict transactional integrity (deduct stock, allocate one
  bed to one patient, FEFO batch selection) — Postgres transactions and unique constraints are the
  simplest correct tool.
- RBAC across 9 roles with per-action authorization is a first-class NestJS Guard pattern, not something
  bolted on.

### 2.1 Alternatives considered

| Decision | Chosen | Considered instead | Why not chosen |
|---|---|---|---|
| Backend framework | NestJS (Node/TS) | Django (Python) | Equally valid; NestJS's DI + decorator-based guards map more directly onto the 9-role RBAC model without extra libraries. Django is a legitimate substitute if the hospital's IT team already runs Python — see §5. |
| Backend framework | NestJS (Node/TS) | Spring Boot (Java) | Common in Indian govt tenders; also a legitimate substitute (see §5). Not chosen as the default recommendation only because it has a heavier ceremony cost for a team that hasn't committed to Java already. |
| Database | PostgreSQL | MySQL | Both are fine relational choices; Postgres was picked for slightly stronger native support for complex constraints and JSON columns (useful for flexible audit-log payloads) — not a hard requirement either way. |
| Database | PostgreSQL | MongoDB / NoSQL | Rejected outright — this domain is relentlessly relational (batches → stock → transactions, beds → wards → admissions, requisitions → POs → GRNs) and needs multi-row transactional integrity that a document store makes harder, not easier. |
| ORM | Prisma | TypeORM | Both work with NestJS; Prisma's migration workflow and generated types were judged more predictable for a schema this size (31 entities). TypeORM is a reasonable substitute if the team prefers Active Record-style models. |
| Queue | Redis + BullMQ | RabbitMQ / Kafka | Overkill for this system's actual throughput (one hospital, not a multi-tenant platform). Redis is already needed for the queue-token counter, so BullMQ reuses that dependency instead of adding a second piece of infrastructure. |
| Frontend framework | React | Vue / Angular | React was chosen for ecosystem size and hiring pool; Vue is a reasonable substitute with similar characteristics. Angular's heavier structure isn't justified for a form-and-table-heavy app like this. |

## 3. Monorepo structure

```
esic-hms/
├── apps/
│   ├── api/                      # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── employee/     # Module 1-2: verification, UID, lookup
│   │   │   │   ├── visit/        # Visit, OPD visit
│   │   │   │   ├── prescription/ # Doctor console, prescriptions
│   │   │   │   ├── facility/     # Facility eligibility rule engine
│   │   │   │   ├── admission/    # IPD / admission, ward/room/bed
│   │   │   │   ├── pharmacy/     # Dispensing, FEFO
│   │   │   │   ├── benefit/      # Benefit rules
│   │   │   │   ├── inventory/    # Medicine, batch, expiry jobs
│   │   │   │   ├── procurement/  # Requisition, PO, GRN, supplier
│   │   │   │   ├── billing/      # Billing transactions, receipts
│   │   │   │   ├── dashboard/    # Analytics/reporting queries
│   │   │   │   └── auth/         # Users, roles, permissions, audit
│   │   │   ├── common/           # Guards, interceptors, filters
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── test/
│   └── web/                      # React frontend
│       ├── src/
│       │   ├── screens/          # One folder per role's primary screens
│       │   ├── components/
│       │   ├── api/              # TanStack Query hooks
│       │   └── main.tsx
│       └── e2e/                  # Playwright tests
├── docker-compose.yml
├── .github/workflows/ci.yml
└── docs/                         # This documentation set
```

The `apps/api/src/modules/*` split matches the component responsibility table in `01-architecture.md`
§2.1 one-for-one — if you're unsure where a piece of logic belongs, that table is the answer.

## 4. Environment variables (baseline)

| Variable | Used by | Example |
|---|---|---|
| `DATABASE_URL` | API, Prisma | `postgresql://user:pass@localhost:5432/esic_hms` |
| `REDIS_URL` | API (queue, cache) | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Auth module | (secret, from secrets manager in prod) |
| `LABOUR_DEPT_API_BASE_URL` | `LabourDeptClient` | mock URL in dev, real endpoint in prod |
| `LABOUR_DEPT_API_KEY` | `LabourDeptClient` | (secret, from secrets manager in prod) |
| `OBJECT_STORAGE_ENDPOINT` / `OBJECT_STORAGE_BUCKET` | File storage (QR, PDFs) | MinIO endpoint in dev |
| `SENTRY_DSN` | Error tracking | empty in dev |
| `NODE_ENV` | Both apps | `development` / `staging` / `production` |

Never commit real values for the secret-marked variables — use `.env.local` (gitignored) in dev and a
secrets manager (see `06-requirements.md` NFR-SEC group) in staging/production.

## 5. Local development setup (once Phase 0 is built)

```bash
git clone <repo>
cd esic-hms
cp .env.example .env.local        # fill in local values
docker compose up -d postgres redis
cd apps/api && npx prisma migrate dev && npm run start:dev
cd apps/web && npm run dev
```

This is the target end state for Phase 0 (`04-phases-and-prompts.md`) — one `docker compose up` plus two
`npm run dev` commands, no manual database setup beyond the migration command.

## 6. Framework substitution note

If the hospital's IT department already standardizes on Java/Spring or Python/Django, the module
boundaries (§2.1 of `01-architecture.md`), the full data model (`03-data-model.md`), and the phase plan
(`04-phases-and-prompts.md`) all carry over directly — none of them are NestJS-specific. Only the
per-phase prompts need the framework name swapped, and the equivalent building blocks are:

| Concept here | Spring Boot equivalent | Django equivalent |
|---|---|---|
| NestJS module | Spring `@Component`/package by feature | Django app |
| Prisma | Hibernate/JPA + Flyway | Django ORM + migrations |
| NestJS Guard (RBAC) | Spring Security `@PreAuthorize` | DRF permission classes |
| BullMQ job | Spring `@Scheduled` + a queue (or Quartz) | Celery beat + Celery worker |
| Class-validator DTO | Bean Validation (`@Valid`) | DRF serializers |
