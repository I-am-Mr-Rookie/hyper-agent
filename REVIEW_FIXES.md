# Review fixes — `algorise/` (Sprint Zero)

Repository: one project, `algorise/`. It contains a Next.js 16 web app (Codeforces metadata import, an LLM slot gateway, and the Import Companion pairing/upload API), a Chromium MV3 extension (`extension/`), and a vendored CodeBox judge (`services/code-engine/`, Express + BullMQ + Docker executor). Everything is wired together with Docker Compose.

No secret values were copied anywhere. Credentials are only referred to by their env-var names.

## Issues found and fixed

| # | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| 1 | High | Judge `DockerExecutor.runCommand` | The Docker stream demuxer dropped any frame that crossed a chunk boundary. Large stdout/stderr was silently truncated or lost, which shows up as false Wrong Answers. I reproduced this: the old code returned 0 of 70,000 bytes. | Keep the unparsed tail and prepend it to the next chunk. Regression test: `services/code-engine/tests/executor.test.js`. |
| 2 | High | Judge `ResultParser` | Exit 137 (SIGKILL) without our timeout firing means the cgroup OOM killer. It was reported as **Time Limit Exceeded**, so the `oversized-allocation` stress probe could never pass. | Map it to `Runtime Error (Other)` with signal 9. Real timeouts still give TLE, because `timedOut` is checked first. Covered by the same test. |
| 3 | High | Judge worker `sendCallback` | The callback `fetch` followed redirects, so a public URL could redirect to an internal address and bypass the private-network check. It also had no timeout, so a hanging callback could stall a worker slot. | `redirect: 'manual'` and `AbortSignal.timeout(10000)`. |
| 4 | Medium | `src/lib/llm/prompt-safety.ts` | Untrusted text could contain `</untrusted-label>`, close its own delimiter early and inject instructions after it. | Delimiter-shaped tags inside the value are neutralized. Test added. |
| 5 | Medium | `src/lib/llm/config.ts` | A non-numeric `LLM_DAILY_BUDGET_USD_TOTAL` / `LLM_MENTOR_DAILY_TOKENS_PER_USER` became `NaN`. Every `used + est > NaN` check is false, so the budget silently turned off (fail-open). | Validate as finite and non-negative; otherwise throw (same pattern as the thinking-level check). Test added. |
| 6 | Medium | `src/app/api/codeforces/import/route.ts` | A new `CodeforcesClient` was built per request, so the 5-minute cache and the 2.1 s courtesy spacing only worked within one request. Concurrent users could hammer the Codeforces API. Fractional `limit` was also passed through. | One shared client per process; floor `limit`. |
| 7 | Medium | `docker-compose.yml` | Postgres (default credentials), Redis (no auth), the web app (demo auth may be on) and the judge API (Docker socket, fallback token) were published on all interfaces. The validator's message said "localhost", but the ports weren't. | All ports bound to `127.0.0.1`; `scripts/validate-compose.mjs` and the README updated. |
| 8 | Medium | `scripts/judge-stress.mjs` | Exact-string matching against `"Runtime Error"`, but the engine reports `"Runtime Error (SIGSEGV)"`, `"(NZEC)"` and so on. The fork-bomb and memory probes would fail even when the sandbox behaved correctly. | Accept `label` or `label (…)`. |
| 9 | Medium | Judge `DockerExecutor` | `compiler_options` was passed to an unused parameter and silently ignored. The Isolate and Firecracker executors do apply it. | Append the (already sanitized) options to the compile command, like the other executors. |
| 10 | Medium | `src/lib/codeforces/client.ts` | Transport failures (timeout, DNS, bad JSON) came back as a raw `Error`, which the route turned into **400** (a client error). | Wrapped as a retryable `CodeforcesApiError` with status 503. Test added. |
| 11 | Low | `src/app/api/import/extension/route.ts` | An invalid or expired upload token returned **400** instead of 401. Zod errors came back as a raw JSON-stringified message. | Auth → 401; payload → 400 `Invalid upload payload` plus `issues`; unexpected errors → 500. |
| 12 | Low | `src/lib/import-companion/store.ts` | Unexchanged pairing codes and expired tokens were never removed (memory growth, and an O(n) scan in `authorize`). | `pruneExpired()` runs on create and authorize. |
| 13 | Low | Judge `POST /submissions?wait=true` | If the Redis record expired or was deleted mid-poll, `formatSubmission(null)` threw a 500. | Fall back to the queued submission. |
| 14 | Low | Judge callback URL validation | Missed IPv6 literals (`URL.hostname` is `[::1]` with brackets, so the `'::1'` check never matched) and `127.x` other than `.1`. | Block `127.*` and all bracketed IPv6 literals. DNS rebinding remains (see below; marked with a `shortcut:` comment). |
| 15 | Low | `extension/lib/uploader.js` | A non-JSON error page (proxy or 502) threw a confusing `SyntaxError` instead of the HTTP error. | `response.json().catch(() => ({}))`. |
| 16 | Critical (advisory) | Dependencies | `next-auth@4.24.14` is covered by a critical npm advisory. | Bumped to `4.24.15` (patch). Lockfile edited surgically (6 lines); the local npm 10.9 would otherwise strip the `libc` platform hints from the lockfile. |
| 17 | Low | README | The verify description left out the Compose check; there were no instructions for the judge unit tests. | Updated. |

## Deliberately not fixed

- **`next@16.2.10` advisories (critical/high, including bundled postcss and sharp/libvips).** The fix needs a minor upgrade to 16.4.x together with `eslint-config-next`. That isn't a small safe change; do it on its own branch with a visual smoke test. Note that `DEFECT_LEDGER.md` D-005 ("zero vulnerabilities") is out of date: root `npm audit` now reports 6 production advisories (1 critical) after this fix, and the judge reports 9.
- **Judge npm advisories** (critical `proxy-addr` via express, plus others). `npm audit fix` exists, but I couldn't test the judge runtime without Docker. The `proxy-addr` issue only matters if `trust proxy` is enabled, which it isn't.
- **Judge auth fails open when `AUTH_TOKEN` is empty, Compose falls back to a well-known placeholder token, and token comparison isn't constant-time.** This is vendored behaviour, and `tests/judge-static.test.ts` pins the fallback string. Now mitigated by the localhost-only binding. Before any shared deployment, require the token (`${JUDGE_AUTH_TOKEN:?}`) and update that test.
- **Docker socket mounted into `judge-api` and `judge-worker`.** That is root-equivalent on the host. It's inherent to the Docker executor; the API probably doesn't need it, but the Compose contract and the static test require it. This is already tracked as environment gate D-002.
- **Docker executor enforces wall-clock time only** (no CPU-time limit), reports `memory: null`, and buffers unbounded output in memory before truncating to 64 KB. Fixing that needs cgroup stats or a streaming cap, which is a design change.
- **Callback SSRF via DNS names that resolve to private IPs.** It needs a resolve-then-connect check; marked with a `shortcut:` comment.
- **Judge rate limiter keys on `req.ip` without `trust proxy`.** Behind nginx/Caddy, all clients share one bucket. This depends on the deployment.
- **The judge error handler logs the full `req.body`**, including user source code. Vendored behaviour; left alone.
- **Import Companion store is in memory** (lost on restart, not shared across instances), and pairing-code exchange has no rate limit (40-bit code, 10-minute TTL). Persistence is the planned Prisma work; documented as a scaffold.
- **Mentor budget records only output tokens** against a per-user "tokens" cap. This is a product decision, not clearly a bug.
- **The extension builds `/contest/` URLs for gym submissions**, and the Codeforces collector is the only one enabled. Out of scope until the collector spikes.

## Build / test results

Run in `algorise/` with placeholder `NEXTAUTH_*`/`DATABASE_URL` env (same as CI):

- `npm run verify` → **exit 0**: eslint clean, `tsc --noEmit` clean, Vitest **23/23**, extension node tests **4/4**, Prisma schema valid, Compose contract passed, `next build` compiled, secret scan passed.
- `services/code-engine`: `node --check` on every `src/*.js` passes; new `node --test tests/executor.test.js` **2/2**. The demux test fails on the original code, so it is a real regression guard.
- Not run: Docker judge round-trip/stress, the live judge API test (`tests/api.test.js`), the DB migration, and the live LLM/Codeforces smokes. These need Docker, a running stack, or network credentials, and none of those are available here.
