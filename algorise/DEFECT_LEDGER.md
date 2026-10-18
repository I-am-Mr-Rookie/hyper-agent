# Defect ledger

Authority: latest user instruction, frozen plan constraints, executable evidence, validated handoff, reports, best practices.

## Summary

| Metric | Count |
|---|---:|
| Candidate findings | 11 |
| Unique confirmed defects | 7 |
| Complete with focused regression | 7 |
| Unresolved environment gates | 3 |
| False positives / duplicates | 1 |

## Findings

| ID | Requirement | Observable failure and root cause | State | Fix and evidence |
|---|---|---|---|---|
| D-001 | G1 database migration | Docker/PostgreSQL are unavailable in the agent container. | UNRESOLVED environment gate | A 21-table migration is generated and Compose includes a one-shot migration service. Kawsar runs `npm run local:up` and verifies the live database. |
| D-002 | G3 judge containment | Docker CLI/daemon are unavailable in the agent container. | UNRESOLVED environment gate | Judge API/worker, runtime images, round-trip and five-case adversarial pack are wired; static boundary tests pass. Kawsar must run `npm run judge:roundtrip` and `npm run judge:stress`. |
| D-003 | OAuth end-to-end | OAuth is intentionally deferred by the user until Kawsar deploys. | OUT_OF_CURRENT_SCOPE | Local demo auth is explicit and defaults off in `.env.example`; Kawsar supplies OAuth and keeps demo auth off online. |
| D-004 | LLM live slot smoke | Initial Chat Completions calls returned empty/404 because the supplied FreeModel endpoint requires streaming Responses input. | COMPLETE | Gateway now supports chat and streaming Responses protocols. All six real slots returned `LOCAL_SMOKE_OK`; evidence is in `docs/evidence/llm-live-smoke.json`. |
| D-005 | Dependency integrity | Initial web and vendored judge audits exposed high/critical advisories. | COMPLETE | Next, PostCSS, UUID, Dockerode and transitive packages were updated; both npm audits report zero vulnerabilities. Re-checked 2026-10-18 after Next 16.4.2 / PostCSS 8.5.30 and judge patch updates: production audits are zero for web and judge; the root dev tree still has 7 advisories that need major upgrades (e.g. Vitest 5). |
| D-006 | Responsive UI | The first true 390 px dashboard check measured 41 px horizontal overflow. | COMPLETE | Mobile grid/sidebar min-width rules were patched; four viewport checks now report zero overflow/errors. |
| D-007 | Codeforces courtesy limits | Concurrent `user.info`, `user.rating`, and `user.status` calls could race the spacing timestamp. | COMPLETE | Requests now pass through one queue; a concurrency regression proves max active requests equals one. |
| D-008 | Extension pause/cancel | The collector did not await the progress callback; pause/cancel could be ignored and polling could deadlock. | COMPLETE | Progress is awaited and control changes use an explicit wake signal; extension regression verifies the second fetch is blocked until release. |
| D-009 | FreeModel output limit | Streaming Responses rejected `max_output_tokens`. | COMPLETE | Adapter strips only that rejected parameter and retries once; mock regression covers the branch. |
| D-010 | LITE reasoning effort | `minimal` is unsupported for the selected `gpt-5.6-terra` endpoint. | COMPLETE | Private local `.env` uses `low`; the live LITE slot passed through the secondary endpoint. |
| D-011 | Full-product completion | The user asked for the entire 12-week S0-S14 product within a three-hour Sprint Zero run. | OUT_OF_CONTRACT for this run | Deliverable is labeled a Sprint Zero scaffold; no multi-week feature or judge containment result is misrepresented as complete. |

Raw finding count and unique root-cause count are preserved separately. Static judge wiring remains E1 until Kawsar executes the Docker gates.
