# AlgoRise — Sprint Zero

A local-first foundation for a web-only, gamified competitive-programming platform: public Codeforces metadata import, deterministic skill evidence, an OpenAI-compatible model-slot gateway, a consent-first own-code Import Companion, and a sandbox-judge path based on Kawsar's MIT-licensed CodeBox.

> **Scope truth:** this is a verified Sprint Zero scaffold, not the complete 12-week S0–S14 product. `SPRINT_ZERO_REPORT.md` distinguishes working surfaces, stubs, and target-environment blockers.

## What is real in this scaffold

- Polished responsive Next.js workspace and product landing page
- Auth.js Google wiring from server-side environment variables, with explicit local demo fallback
- PostgreSQL Prisma schema covering the plan's relational spine
- Slot-based LLM gateway with verbatim model IDs, high-stakes effort pinning, reasoning-parameter strip-and-retry, retry/backoff, provider failover, budgets, usage events, and kill switch
- Official Codeforces API importer with validation, courtesy spacing, caching, backoff, partial-state signaling, and deterministic fixture tests
- Chromium MV3 Import Companion with one-time pairing, scoped bearer upload, per-platform consent, pause/cancel, deduplication, deletion, throttling, and a working Codeforces collector/parser
- Vendored MIT CodeBox judge, Redis/Compose wiring, one original sample problem, round-trip script, and adversarial stress script
- CI gates for secrets, schema, lint, typecheck, tests, and production build

## Prerequisites

- Node.js 20.9+ (Node 22 recommended; Next.js 16.4 requires 20.9)
- npm 10+
- Docker Desktop / Docker Engine for PostgreSQL, Redis, and judge runtime tests

## Local web app

```bash
cp .env.example .env
# Fill local values only. Never commit .env.
# For a private localhost demo without Google OAuth, set ALLOW_LOCAL_DEMO_AUTH=true.
# Return it to false before any shared or web deployment.
npm ci
npm run db:validate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health: [http://localhost:3000/api/health](http://localhost:3000/api/health).

For the complete Dockerized local stack (web + migration + PostgreSQL + Redis + judge API/worker), run `npm run local:up`. All published ports bind to `127.0.0.1` only. See `docs/LOCAL_RUN.md` for LLM environment smoke calls and deployment handoff.

## Database and judge services

```bash
docker compose up -d postgres redis
npm run db:push

bash services/code-engine/scripts/build-images.sh
docker compose up -d --build judge-api judge-worker
npm run judge:roundtrip
npm run judge:stress
```

See `docs/JUDGE.md` for the evidence boundary and adversarial probes.

## Import Companion

Load `extension/` as an unpacked Chromium extension. Generate a one-time pairing code from the dashboard, pair the popup, sign into Codeforces manually, confirm your detected handle, grant per-platform consent, then start sync. No request fires before consent and a user click. LeetCode, AtCoder, and CodeChef remain disabled until founder-account spikes pass.

## Verification

```bash
npm run verify
```

This executes lint, strict TypeScript checks, Vitest and extension tests, Prisma schema validation, the Compose contract check, a production Next.js build, and the repository secret scan. Docker judge gates are separate because they require a privileged Docker-capable host. Offline judge unit tests (executor, verdicts, request validation) run with `cd services/code-engine && npm ci && node --test tests/executor.test.js tests/validation.test.js`; the judge's own `npm test` also runs `tests/api.test.js`, which needs a running judge API.

## Model slots

Each slot reads base URL, API key, model ID, and thinking level from untracked environment variables. `analyst`, `testgen`, and `judge_feedback` are pinned to high effort. Model IDs are passed through verbatim. If a gateway rejects the reasoning parameter, the adapter strips it and retries once; provider failover follows only after the configured retry policy.

The public model catalog inspected during Sprint Zero listed `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, and `gpt-5.3-codex`. No provider credential is committed.

## Founders' next checkpoint

Read, in order:

1. `PROGRESS.md`
2. `SPRINT_ZERO_REPORT.md`
3. `CONTRACT_TO_PLAN_DELTA.md`
4. `DEFECT_LEDGER.md`

Rotate every credential that was ever pasted into chat before injecting fresh values locally.
