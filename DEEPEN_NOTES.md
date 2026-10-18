# Deepen notes: second-pass review of `algorise/`

This pass builds on `REVIEW_FIXES.md` and doesn't redo anything listed there. No secret values were copied anywhere. Nothing was committed or pushed.

**Superpowers skills used:** `superpowers:test-driven-development` (every fix started as a failing test, and each was confirmed to fail on the old code), `superpowers:verification-before-completion` (fresh `npm ci` plus `npm run verify` and judge test runs before every claim below), and `superpowers:systematic-debugging` (root-cause checks, for example measuring the demux cost and reproducing the Codeforces 400 live before changing code).

## What I examined

- **Judge verdict path:** `ResultParser`, `IsolateExecutor.buildResult`, `worker.processJob`, `compareOutput`, `DockerExecutor.runCommand` demux and limits, request validation (`validation.js`), `submissions` routes, `producer`.
- **Web:** `CodeforcesClient` (cache, error mapping) and the import route; Import Companion store and both extension routes; LLM gateway, budget ledger and config.
- **Extension:** `lib/uploader.js`, `lib/throttler.js`.
- **Setup docs:** README, `docs/LOCAL_RUN.md`, `.env.example` (variable names only), `scripts/local-up.sh`, the judge scripts.

## Fixes made

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | High | Judge `ResultParser`, `IsolateExecutor`, `worker` | The worker compared `expected_output` against stdout that had already been cut to 64 KB, with `\n[truncated]` appended. Any correct answer longer than 64 KB was marked **Wrong Answer**. | The executors now judge the full output before truncating it. The worker's duplicate check is removed, since it would re-judge the truncated copy. `compareOutput` moved to `ResultParser.js` and is re-exported from `executeCode.js`, so the existing import still works. |
| 2 | Medium | Judge `compareOutput` | Only whole-output `trim()` was applied. Expected output written with CRLF line endings, or with trailing spaces on a line, failed every submission. | CRLF is normalized to LF, and trailing whitespace on each line is ignored, as most CP checkers do. Real differences are still WA; this is tested, including `"12"` vs `"1 2"`. |
| 3 | High | Judge `validation.js` | `memory_limit: 0` passed validation. Docker reads `Memory: 0` as **unlimited**, so a submitter could switch off the memory cap. | Minimum is now 6144 KB, Docker's floor. All repo scripts use 32–64 MB. |
| 4 | Medium | Judge callback SSRF list | Only `169.254.169.254` and `0.0.0.0` were blocked. The rest of link-local (for example the ECS credentials endpoint `169.254.170.2`) and `0.x.x.x` got through. | Block `169.254.*` and `0.*`. |
| 5 | Medium (perf) | `DockerExecutor.runCommand` | The demuxer concatenated the pending buffer on every chunk, which is quadratic. 16 MB of output took **1.0–4.3 s** of blocking copies on the worker's event loop. | It now concatenates only once a whole frame is buffered: **~60 ms**. |
| 6 | Medium (memory) | `CodeforcesClient` | The first pass made the client process-wide, but expired cache entries were never removed. Every handle ever looked up stayed in memory for the life of the process. | Expired entries are swept on each insert. |
| 7 | Low | `CodeforcesClient` | Codeforces answers an unknown handle with HTTP 400 and `{"comment":"…not found"}`; I reproduced this live. Users saw "Codeforces returned 400", and the client's 404 branch could never run. | Codeforces' own comment is shown; "not found" maps to 404. Checked live: `{"error":"handles: User with handle … not found"}` [404]. |
| 8 | Low | `POST /api/import/extension/pair` | A JSON `null` body crashed the route with a TypeError (500). A non-string `code` leaked `code.trim is not a function`. | Null body falls back to `{}`; a non-string code is treated as empty. Both now return the normal 401. |
| 9 | Low (docs/tooling) | `scripts/judge-roundtrip.mjs`, `judge-stress.mjs` | The README says to run `npm run judge:roundtrip` after filling `.env`, but these scripts never loaded `.env` and threw `JUDGE_AUTH_TOKEN is required`. | They now load `.env` the same way as `llm-live-smoke.ts`. Verified: the script reads the token and gets as far as the network call. |
| 10 | Low (docs) | README, `package.json` engines | Said "Node.js 20+", but Next 16.4 requires ≥ 20.9. The offline judge test command left out validation and didn't mention that the judge's `npm test` needs a live API. | Corrected. `engines` is now `>=20.9.0` (lockfile root entry synced). |
| 11 | Low (docs) | `DEFECT_LEDGER.md` D-005 | Still claimed zero vulnerabilities. | A dated re-check note was added with the actual audit state. |

## Dependency updates

| Project | Update | Kind | Result |
|---|---|---|---|
| web | `next` and `eslint-config-next` 16.2.10 → **16.4.2** | minor | Clears the critical/high Next advisories, including bundled postcss and sharp/libvips, that the first pass deferred. |
| web | `postcss` override 8.5.10 → **8.5.30** | patch | The override had been *forcing* a vulnerable postcss. |
| web | zod 4.6.7, yaml 2.9.1, tsx 4.23.15, playwright 1.64.1, @types/react(-dom) 19.3.0, plus transitive fixes | in-range | — |
| judge | bullmq 5.81.5, express 4.22.3, joi 17.13.8 (fixes prototype-pollution advisories), uuid 14.0.3, plus transitive fixes (proxy-addr, qs, body-parser, brace-expansion, …) | patch/minor, lockfile only | — |

- **Audit before → after (production):** web 6 → **0**, judge 9 → **0**.
- **Lockfile:** the first pass warned that npm 10.9 strips the lockfile's 44 `libc` platform hints, and my first attempt did exactly that. I restored the backup and regenerated with `npx npm@11`, which keeps all 44. I then ran `npm ci` with the project's npm 10 to get a CI-identical install. The web `npm audit fix` under npm 10 also crashed (`Cannot read properties of null (reading 'edgesOut')`) and was discarded.
- **Nothing reverted:** every update passed the suite.

## Tests added

- **Judge** `tests/executor.test.js` +9 cases, and new `tests/validation.test.js` with 7 cases. Covers verdicts on >64 KB output, WA on mismatch, non-AC verdicts left alone, the Isolate path, `compareOutput` normalization, byte-at-a-time demux, a demux performance guard (< 500 ms for 16 MB; old code 1.0–1.3 s under the runner), the `memory_limit` floor, and the callback blocklist.
- **Web** +5 cases:
  - `codeforces-import.test.ts`: 400 comment / 404 mapping; cache eviction.
  - `import-companion.test.ts`: expired code; revoked token. These pass on the old code too, so they're coverage only, not regression guards.
  - New `tests/pair-route.test.ts`: null body; non-string code.

## Final results (fresh runs)

- **`npm ci && npm run verify`** in `algorise/` (CI placeholder env) → **exit 0**: lint clean, typecheck clean, Vitest **28/28** (was 23), extension **4/4**, Prisma valid, Compose contract passed, `next build` (Next 16.4.2) compiled, secret scan passed.
- **Judge** `node --test tests/executor.test.js tests/validation.test.js` → **18/18** (was 2). `node --check` passes on every `src/*.js`. The perf test was run 3× with no flakes.
- **Live smoke, web:** `next start` on 16.4.2. `/`, `/dashboard` and `/api/health` returned 200 with the expected `<h1>`. A real Codeforces import for `tourist` returned 200; an unknown handle returned 404 with Codeforces' message.
- **Live smoke, judge:** API started without Redis. `/health` 200, `/languages` 200 with a token and 401 without, `memory_limit: 0` → 422, ECS-metadata callback → 422.
- **Not run:**
  - Playwright visual smoke: the headless Chromium can't launch on this host (missing `libatk-1.0.so.0`).
  - Docker judge round-trip/stress, the judge API test against Redis, DB migration, LLM live smoke: no Docker, Redis or credentials here.
  - Do the visual smoke and `npm run judge:stress` on a Docker host before relying on the Next 16.4 bump and the demux change in production.
- **Port 3123:** a `next-server v16.2.10` started before this session (09:45) is still running there. I left it alone and used other ports.

## Left alone on purpose

- **Budget check-then-record race:** concurrent LLM calls can each pass `assertAllowed` before any of them records, so the daily cap can be overshot by in-flight requests. A proper fix needs reservations, which is a design change. The overshoot is bounded by concurrency.
- **`ImportCompanionStore.authorize` scans all tokens** with `timingSafeEqual` instead of using `Map.get`. That's O(n), but harmless at scaffold scale, and the store is due to move to Prisma anyway.
- **Docker executor still buffers unbounded output in memory.** It's now linear rather than quadratic, but there's still no streaming cap. Capping it would need a size limit that stays above any expected-output length; that's a judge design decision.
- **Majors not taken:** openai 7, prisma 7/8, vitest 5, eslint 10, TypeScript 7, react 19.3 (pinned) and lucide-react (pinned, no advisory). Also judge express 5, helmet 8, pino 10, ioredis 6, bullmq 6.
- **Dev-only root advisories:** the 7 remaining ones need those majors.
- **Everything in the first pass's "Deliberately not fixed" list still stands:** judge auth fallback token, Docker socket, DNS-rebinding SSRF, `trust proxy`, and the rest.
- **Behaviour changes to note:**
  - `compareOutput` is now lenient about trailing whitespace on each line and about CRLF. A problem that needs exact whitespace would need its own checker.
  - `memory_limit` below 6144 KB is now rejected with 422. Docker refused those values before anyway, so the only real change is that `0` no longer means unlimited.
