# AlgoRise Sprint Zero execution contract

## Deliverable

A secure, locally runnable Sprint Zero scaffold—not a false claim that the 12-week product is complete. The scaffold must be resumable by the founders and must contain working foundations for the web app, schema, LLM gateway, judge path, consent-first extension, and Codeforces metadata import.

## Authority

1. Latest user instruction: approximately 180 total minutes, autonomous local implementation, GitHub publication authorized.
2. Frozen plan constraints: web only; content legality; machine-only verdicts; slot-based server-side LLM access; consent-first own-code import; secret hygiene.
3. Executable evidence in this environment.
4. The attached plan and validated v2 handoff.
5. Reference repositories and general practice.

## Reasoning Workflow

In a step-by-step logical process:

1. Reconcile the latest request against the plan and record deviations.
2. Execute the Sprint Zero slices in their original priority order.
3. Keep real, testable core logic behind each scaffold; identify every environment-gated integration explicitly.
4. Run focused tests, then lint, typecheck, schema validation, production build, boot smoke, and secret scans.
5. Freeze a readiness rubric before scoring. Patch only reproduced failures and rerun the same gates.
6. Spend the final stop-line on truthful handoff files and reviewed GitHub delivery.

## Timebox rebase

- 0–25: foundations
- 25–45: LLM gateway
- 45–85: judge integration and executable probes
- 85–115: Import Companion
- 115–135: Codeforces importer
- 135–165: frontend quality, integration checks, stress and patch loop
- 165–180: mandatory stop-line, reports, secret review, commit, GitHub publication

The original order is preserved. Extra time expands evidence and polish; it does not reorder work.

## Security correction

Credentials pasted into chat are considered exposed. This run must not repeat them in tool calls, source files, logs, reports, or Git history. A local `.env` is generated with non-secret endpoints/model IDs, blank provider keys, and fresh random development secrets. Live LLM smoke calls remain blocked until the founders inject rotated keys through a secure local channel. `.env.example` contains placeholders only.

## Acceptance

- The Next.js app builds and serves locally.
- Prisma schema validates; a real PostgreSQL migration is run only on a Docker/Postgres-capable host.
- Mock LLM tests prove verbatim model IDs, high-stakes effort pinning, reasoning-parameter fallback, retry, provider failover, budget cutoff, and kill switch.
- Codeforces fixture tests prove normalization, caching, and 429 backoff; the live route uses the official API.
- Extension tests prove one-time pairing, token scoping, deduplication, deletion, consent defaults, throttling, and Codeforces parsing; account end-to-end remains founder-session evidence.
- Judge files and static security assertions pass; containment and round-trip remain blocked—not passed—when Docker is unavailable.
- Secret scanning, lint, typecheck, unit tests, production build, and localhost health smoke pass before publication.
