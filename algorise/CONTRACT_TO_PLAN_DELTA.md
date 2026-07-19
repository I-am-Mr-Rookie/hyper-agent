# Contract-to-plan delta

| Topic | Plan | Latest instruction / environment | Decision |
|---|---|---|---|
| Executor ceiling | 120 minutes, T-15 stop-line | Extended to approximately 180 minutes | Preserve priority order; use 165 minutes for implementation/evidence and 15 for freeze/handoff. |
| Product scope | Twelve-week S0–S14 program | User asks for a final end-to-end product in one run | Deliver the strongest honest Sprint Zero system. Do not mislabel unimplemented multi-week features as complete. |
| Credentials | Write chat-provided keys to untracked `.env` | User explicitly requires the same values in a private ZIP but never on GitHub | Keep `.env` ignored, exercise it locally without printing keys, include it only in the private handoff ZIP, and publish placeholders to GitHub. |
| Git push | Template still says PASTE_YES_OR_NO | Latest user explicitly authorizes GitHub upload through the connected integration | Create a new private `algorise` repository in the authenticated personal account after verification. |
| Deployment | Plan mentions staging | User says local first; teammate will deploy later | No staging or production deployment. Provide verified local commands and a web-deployment handoff. |
| Database | PostgreSQL + Prisma | Container has no Docker/PostgreSQL | Validate schema here; make Compose reproducible; record migration as an environment blocker until founder host runs it. |
| Judge | Docker/isolate path with E4 probes | Docker CLI/daemon unavailable in the agent container | Vendor and wire the MIT service, add executable probes and E1 static checks; never claim G3/E4. |
| Auth | Google OAuth end to end | User explicitly defers Google OAuth to Kawsar's web deployment | Localhost uses opt-in demo auth; `.env.example` keeps it off by default for any shared deployment. |
| LLM live calls | One smoke call per configured slot | User authorizes the provided local `.env` values | Added streaming Responses support for the supplied FreeModel endpoints; all six live slots passed and keys were not logged. |
| Readiness target | Iterative readiness loop toward 95 | Critical target-environment gates are unavailable | Score Sprint Zero scaffold readiness separately from full-product readiness. Never round up or convert blockers into passes. |
