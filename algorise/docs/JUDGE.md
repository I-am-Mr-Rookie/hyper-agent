# Local judge path

AlgoRise vendors Kawsar's MIT-licensed `code-engine` as `services/code-engine` and wires it to Redis through the root Docker Compose file. The web app remains on port 3000; the judge API is exposed on port 3100.

## Run on a Docker-capable host

```bash
cp .env.example .env
# Replace local secrets in .env. Never commit it.
bash services/code-engine/scripts/build-images.sh
docker compose up -d --build postgres redis judge-api judge-worker
npm run judge:roundtrip
npm run judge:stress
```

`judge:roundtrip` submits one original sample problem with an accepted C++ solution and a deliberate TLE. `judge:stress` probes a busy loop, oversized allocation, fork pressure, network egress, and masked sensitive-file access. Both scripts write evidence only after they actually execute.

## Evidence boundary

The current agent environment did not expose Docker. Static security-wiring tests are therefore E1 evidence only. They do not prove containment. Do not mark gate G3 or judge round-trip complete until the scripts above pass on Kawsar's Docker-capable Linux/WSL host.
