# Local run contract

Google OAuth is optional for localhost. The private local demo can use `ALLOW_LOCAL_DEMO_AUTH=true`; Kawsar must set it to `false` before shared or web deployment and then provide real Auth.js credentials.

## Full Docker path

```bash
cp .env.example .env
# Set ALLOW_LOCAL_DEMO_AUTH=true for localhost-only use.
# Add rotated LLM keys locally if live AI calls are wanted.
sh scripts/local-up.sh
```

This builds and starts:

- `web` at http://localhost:3000
- PostgreSQL at localhost:5432
- Redis at localhost:6379
- CodeBox judge API at http://localhost:3100
- CodeBox judge worker
- a one-shot Prisma migration service

Stop with `sh scripts/local-down.sh`.

## LLM environment smoke

The gateway reads every provider and model choice from untracked `.env`. Run all six slots:

```bash
npm run llm:smoke
```

Or selected slots:

```bash
npm run llm:smoke -- analyst mentor
```

The command never prints API keys. It records only slot, model ID, provider label, latency, token usage, whether reasoning-parameter fallback was used, and pass/fail.

For a credential-free local transport test:

```bash
node scripts/mock-openai-server.mjs
```

In another terminal, temporarily point the provider variables in `.env` to `http://127.0.0.1:4010/v1`, use any non-secret test string as the API key, and run `npm run llm:smoke`. The same gateway code is used for mock and real OpenAI-compatible endpoints.

## What remains for web deployment

Kawsar supplies real Google OAuth credentials, sets `NEXTAUTH_URL` to the deployed origin, disables local demo auth, configures hosted PostgreSQL/Redis/object storage, and repeats the documented judge and LLM smoke gates in that target environment.
