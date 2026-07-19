# AlgoRise Sprint Zero report

Run date: 2026-07-19 (Asia/Dhaka)  
Verified implementation revision: `675a5e2`  
Scope: revised 180-minute Sprint Zero accelerator, local-first  
Verdict: **runnable local scaffold with verified web and live-LLM paths; Docker judge runtime must be exercised on Kawsar's host**

## Executive result

The repository is an end-to-end Sprint Zero foundation, not a false completion claim for the plan's twelve-week S0-S14 program. It contains a polished responsive web app, Auth.js wiring with a localhost-only demo mode, PostgreSQL/Prisma schema and migration, a six-slot live LLM gateway, official Codeforces metadata import, a consent-first own-code browser extension, and a Docker/Redis CodeBox judge path.

The web and API surfaces run locally today. All six configured LLM slots made live calls against the supplied endpoints and returned the exact smoke response. The supplied FreeModel endpoint required streaming OpenAI Responses format rather than its blank Chat Completions response; the gateway was patched to support both transports and retry only rejected parameters.

The executor container does not expose Docker. Therefore the Compose file, judge service, runtime-image build, database migration, and adversarial scripts are present and statically verified, but PostgreSQL runtime and judge containment are deliberately left as Kawsar-host acceptance gates.

## Delivered in Sprint Zero priority order

### 1. Foundations and local stack — working

- Next.js 16 + React 19 + TypeScript + Tailwind app.
- Polished landing page and dashboard, both labeled where data is illustrative.
- Auth.js Google provider wiring from environment variables.
- Opt-in localhost demo auth; `.env.example` defaults it off for shared/web deployment.
- PostgreSQL Prisma schema with 21 tables and generated initial migration.
- Six-service Docker Compose contract: PostgreSQL, Redis, web migration, web, judge API, judge worker.
- Multi-stage non-root standalone web Docker image.
- CI: secret scan, Prisma validation, lint, typecheck, tests, Compose validation, production build.
- Root and vendored judge dependency audits: zero known vulnerabilities.

### 2. LLM gateway — working with real endpoints

- Named slots: ANALYST, TESTGEN, JUDGE_FEEDBACK, MENTOR, CONTENT, LITE.
- Base URL, API key, protocol, model ID, and thinking level are environment-driven.
- High-stakes slots remain pinned to high effort.
- Model IDs pass through verbatim.
- Supports OpenAI Chat Completions and streaming Responses protocols.
- Unsupported reasoning or output-token parameters are removed and retried once.
- Retries, symmetric primary/secondary failover, budgets, kill switch, and usage events are implemented.
- All six real slot smoke calls passed; no API key is present in the evidence file.

Evidence: `docs/evidence/llm-live-smoke.json`.

### 3. Judge path — wired, host runtime gate remains

- Kawsar's MIT CodeBox is vendored with its license preserved.
- Docker/Redis API and worker wiring is complete.
- One original demonstration problem is included.
- AC/TLE round-trip script is included.
- Adversarial pack covers busy loop, oversized allocation, fork pressure, network egress, and sensitive-file access.
- Static checks confirm no-network defaults, memory/process caps, read-only root filesystem, no-new-privileges, dropped capabilities, and API stripping of network-enable attempts.

Not claimed: G3/E4 containment, because Docker is unavailable in this executor container.

### 4. Import Companion — working scaffold

- Chromium MV3 extension with restricted host permissions.
- One-time pairing and scoped bearer upload token.
- Explicit per-platform consent before collection.
- Manual platform login only; no credential handling or login automation.
- Signed-in Codeforces handle detection and confirmed-handle mismatch failure.
- Single-concurrency throttled fetches, resumable cursor, pause, resume, cancel, upload, deduplication, delete, and token revocation.
- Pause/cancel defect found during review was patched; a regression proves the collector waits before fetching the next submission.
- LeetCode, AtCoder, and CodeChef stay disabled stubs until founder-account access spikes pass.

Not claimed: a founder-session Codeforces source-code sync, because that requires the founder's signed-in browser session.

### 5. Codeforces importer — working

- Official `user.info`, `user.rating`, and `user.status` client.
- Handle validation, caching, courtesy spacing, serialized concurrency, retry/backoff, partial-import status, and deterministic normalization.
- Live smoke imported five public submissions from `tourist`.
- The API truthfully reports that official Codeforces metadata does not include source code.

Evidence: `docs/evidence/codeforces-live-smoke.json`.

## Executed verification

| Gate | Result | Evidence level |
|---|---|---|
| Validated v2 plan handoff | Pass | E1 structural |
| Lint + strict typecheck | Pass | E2 |
| Unit tests | 20 passed | E2 |
| Extension tests | 4 passed | E2 |
| Prisma schema + 21-table migration generation | Pass | E2 |
| Compose six-service contract | Pass | E1-E2 structural |
| Next.js production build | Pass | E3 |
| Standalone production server health | Pass, 69 ms | E3 |
| Desktop/mobile Playwright visual smoke | Pass at 1440 px and 390 px; zero overflow/errors | E3 |
| Web load | 600 requests, concurrency 30, zero failures, p95 342 ms | E3 |
| Import API load/idempotency | 50 accepted, 10 duplicate rounds suppressed, delete/revoke pass | E3 |
| Codeforces live metadata | Pass | E2 |
| Live LLM calls | Six of six slots pass | E2 |
| Root npm audit | Zero vulnerabilities | E2 |
| CodeBox npm audit | Zero vulnerabilities | E2 |
| Judge containment | Not run: Docker unavailable | UNRESOLVED environment gate |
| Real Google OAuth | Deferred by explicit user instruction | Out of current scope |

## Evaluation and patch loop

Confirmed defects patched before freeze:

1. Type/lint defects in auth and UI imports.
2. Vulnerable Next.js/PostCSS/UUID/Dockerode/transitive dependencies.
3. False mobile test viewport configuration.
4. 41 px mobile dashboard overflow and a second import-panel clipping defect.
5. Codeforces courtesy-spacing concurrency race.
6. Import Companion progress callback not awaited; pause/cancel wake-up defect.
7. FreeModel Chat Completions blank/404 mismatch; streaming Responses adapter added.
8. FreeModel rejection of `max_output_tokens`; targeted fallback added.
9. LITE `minimal` effort unsupported by the selected Terra model; private local config uses `low`.

The same relevant gates were rerun after each patch. The final unit, extension, build, visual, load, live API, and dependency gates pass.

## Frozen Sprint Zero artifact-readiness rubric

This score evaluates the requested three-hour scaffold artifact, not the unfinished twelve-week product.

| Criterion | Weight | Score | Evidence |
|---|---:|---:|---|
| Web app, frontend quality, build, local boot | 20 | 20 | Build, standalone health, four Playwright viewports, load run |
| Schema, migration artifact, Compose reproducibility | 18 | 16 | Schema/migration/Compose pass; live PostgreSQL awaits Docker host |
| LLM gateway and real slot compatibility | 18 | 18 | Six real slot calls, mock branches, budgets/failover tests |
| Codeforces importer and Import Companion | 20 | 18 | Live metadata + API/extension tests; signed-in browser E2 remains |
| Judge integration and security evidence | 16 | 10 | Complete wiring/static checks; Docker containment unexecuted |
| CI, secrets, dependencies, docs, recovery | 8 | 8 | CI contract, scans, zero audits, handoff files |
| **Sprint Zero artifact readiness** | **100** | **90** | No rounding or assumed runtime credit |

The artifact does **not** receive 95 because the rubric reserves real points for Docker/PostgreSQL/judge containment and a founder-session extension sync. Those are target-host checks, not source-code polish. Once Kawsar runs the exact commands below successfully, the scaffold can exceed 95 without changing the rubric.

Full-product readiness is intentionally not scored: S3-S6 and S8-S13 remain founder-owned multi-week work per the authoritative plan.

## Exact next actions for Kawsar

1. Receive the private ZIP through a trusted channel. Treat it as secret-bearing because it contains `.env`.
2. Extract it into a new directory. Do not initialize or push a public repository from that private copy.
3. Install Node.js 22+ and Docker Desktop/Engine; start the Docker daemon.
4. From the project root, run:

   ```bash
   npm ci
   npm run local:up
   ```

5. Open `http://localhost:3000` and `http://localhost:3000/api/health`.
6. Confirm the database migration completed:

   ```bash
   docker compose logs web-migrate
   ```

7. Verify the supplied LLM environment across all slots:

   ```bash
   npm run llm:smoke
   ```

8. Run judge acceptance:

   ```bash
   npm run judge:roundtrip
   npm run judge:stress
   ```

9. Load `extension/` unpacked in Chromium, create a pairing code from the dashboard, log into Codeforces manually, consent, and sync one own submission. Then test pause, cancel, disconnect, and delete.
10. Run the full repository gate:

    ```bash
    npm run verify
    npm run visual:smoke
    npm run stress:web
    ```

11. Before web deployment: rotate externally shared LLM credentials if desired, set `ALLOW_LOCAL_DEMO_AUTH=false`, add Google OAuth values, set the deployed `NEXTAUTH_URL`, use hosted PostgreSQL/Redis, and rerun every target-environment gate.

## GitHub versus private ZIP

- GitHub: source, lockfiles, Docker/CI config, tests, evidence without secrets, and `.env.example` placeholders only.
- Private ZIP: the same source plus the user-requested ignored `.env` containing the local provider values. It excludes `.git`, `node_modules`, `.next`, logs, and generated caches; `npm ci` reproduces dependencies.

Never upload the private ZIP to GitHub or a public file host.
