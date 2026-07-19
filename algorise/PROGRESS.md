# AlgoRise Sprint Zero recovery state

last_updated:          2026-07-19T23:56+06:00
deadline_mode:         freeze
capacity_tier:         floor for this one-run accelerator; founders choose project tier after local acceptance
completed_steps:       [S0 scaffold, S1 gateway scaffold, S2 Codeforces importer scaffold, S7 judge path scaffold, S14 extension scaffold]
current_step:          Sprint Zero handoff; implementation revision 675a5e2
branch_and_revision:   main @ 675a5e2 (verified implementation; report-only commit follows)
last_verified_command: npm run verify -> lint, typecheck, 20 Vitest tests, 4 extension tests, Prisma schema, Compose contract, production build, and secret scan passed
active_blocker:        Docker daemon is unavailable in the executor container, so PostgreSQL migration and CodeBox containment probes must be executed on Kawsar's Docker-capable device
next_action:           Kawsar extracts the private ZIP, runs npm run local:up, then runs npm run judge:roundtrip and npm run judge:stress before any web deployment
ledger_changes:        D-004 through D-010 promoted to COMPLETE with executable evidence; D-001 and D-002 remain target-host gates; OAuth is deferred by explicit user instruction
parking_lot:           Google OAuth deployment credentials, hosted database/Redis/object storage, LC/AtCoder/CodeChef collector spikes, full S3-S13 product work

## Verified local state

- Next.js production build and standalone server boot: pass.
- Desktop/mobile visual smoke at 1440 px and 390 px: pass, zero overflow or console/page errors.
- Local web load: 600 requests at concurrency 30, zero failures, p95 342 ms.
- Import Companion API load: 50 first-time imports, ten duplicate rounds suppressed, delete-and-revoke pass.
- Live Codeforces official API metadata smoke: pass for five submissions; source code correctly reported absent.
- Live LLM smoke: all six slots passed against the supplied OpenAI-compatible endpoints; high-stakes slots used high effort and model IDs passed verbatim.
- Root and vendored CodeBox npm audits: zero known vulnerabilities.
- Docker Compose structure: six required services validated.
- Judge security wiring: E1 static pass only; E4 containment remains unexecuted here.

## Local launch

```bash
cp .env.example .env
# The private ZIP already contains the user's requested local .env values.
npm ci
npm run local:up
```

Without Docker, the web-only fallback remains:

```bash
npm ci
npm run dev
```
