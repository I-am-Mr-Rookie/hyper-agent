#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop or Docker Engine first." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but its daemon is not running." >&2
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from placeholders. Fill local secrets before enabling external integrations." >&2
fi

# CodeBox executes submissions in these local runtime images.
sh services/code-engine/scripts/build-images.sh

docker compose up --build -d postgres redis web-migrate web judge-api judge-worker
docker compose ps
printf '\nAlgoRise: http://localhost:3000\nJudge API: http://localhost:3100\n'
