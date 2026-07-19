# CodeBox

> A self-hosted, Judge0-compatible code execution API created and maintained by [Waliullah Kawsar](https://github.com/waliullahx82).

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CodeBox accepts source-code submissions through an HTTP API, queues them with Redis and BullMQ, executes them in isolated environments, and returns Judge0-style results. It is suitable for coding platforms, online judges, practice systems, and automated grading services.

Repository: https://github.com/waliullahx82/code-engine

## Features

- Judge0-style submission, batch, language, status, and system endpoints
- Docker execution on Windows, macOS, and Linux
- Isolate and Firecracker executor support on compatible Linux hosts
- Redis-backed queue and result cache
- Python, JavaScript, TypeScript, C, C++, Java, and multi-file configurations
- CPU, wall-time, memory, process, and file-size limits
- Disabled execution-container networking by default
- Token authentication, rate limiting, structured logs, and Prometheus metrics

## Architecture

```text
Client -> Express API -> Redis/BullMQ -> Worker -> Executor -> Result cache
                                              |
                                              +-> Docker
                                              +-> Isolate
                                              +-> Firecracker
```

The API stores each submission in Redis and adds an execution job to BullMQ. A worker receives the job, performs a security scan, selects the configured executor, runs the code, and updates the cached result.

## Prerequisites

Install Git, Docker Desktop or Docker Engine, Node.js 20+, and npm 9+. Make sure Docker is running before continuing.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/waliullahx82/code-engine.git
cd code-engine
```

### 2. Build the language runtime images

Code execution requires separate Docker images for each language. Docker Compose does not build these images automatically.

Linux, macOS, WSL, or Git Bash:

```bash
bash scripts/build-images.sh
```

Windows PowerShell:

```powershell
docker build -t codebox/python:3.8 docker/images/python
docker build -t codebox/node:18 docker/images/node
docker build -t codebox/gcc:9 docker/images/gcc
docker build -t codebox/java:17 docker/images/java
docker build -t codebox/typescript:5 docker/images/typescript
docker build -t codebox/multi:latest docker/images/multi
```

The first build downloads compilers and runtime dependencies and can take several minutes.

### 3. Start CodeBox

```bash
docker compose up -d --build
```

This starts the API at http://localhost:3000, Redis at localhost:6379, and an internal worker. The development Compose configuration uses the API token `dev-token`.

### 4. Verify the service

```bash
curl http://localhost:3000/health
docker compose ps
```

Expected health response:

```json
{
  "status": "healthy",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Follow service logs with:

```bash
docker compose logs -f api worker
```

## Run Code

Most endpoints require this header:

```text
X-Auth-Token: dev-token
```

### Python example

Bash, Git Bash, WSL, or macOS:

```bash
curl -X POST "http://localhost:3000/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: dev-token" \
  -d '{"source_code":"print(1 + 1)","language_id":71}'
```

Windows PowerShell:

```powershell
$headers = @{ "X-Auth-Token" = "dev-token" }
$body = @{
  source_code = "print(1 + 1)"
  language_id = 71
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/submissions?wait=true" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

A completed submission contains a status and execution output:

```json
{
  "token": "submission-uuid",
  "stdout": "2\n",
  "stderr": null,
  "status": {
    "id": 3,
    "description": "Accepted"
  },
  "time": "0.023",
  "memory": 3456,
  "exit_code": 0
}
```

### Asynchronous submission

Remove `?wait=true` to return a token immediately:

```bash
curl -X POST "http://localhost:3000/submissions" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: dev-token" \
  -d '{"source_code":"console.log(42)","language_id":63}'
```

Poll the result:

```bash
curl "http://localhost:3000/submissions/submission-uuid" \
  -H "X-Auth-Token: dev-token"
```

## Supported Languages

| ID | Language | Runtime image |
|---:|---|---|
| 50 | C | `codebox/gcc:9` |
| 54 | C++ | `codebox/gcc:9` |
| 62 | Java 17 | `codebox/java:17` |
| 63 | JavaScript / Node.js 18 | `codebox/node:18` |
| 71 | Python 3.8 | `codebox/python:3.8` |
| 74 | TypeScript 5 | `codebox/typescript:5` |
| 89 | Multi-file program | `codebox/multi:latest` |

Query the live language list:

```bash
curl http://localhost:3000/languages \
  -H "X-Auth-Token: dev-token"
```

## API Reference

Public endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health status |
| `GET` | `/metrics` | Prometheus metrics |

Authenticated endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/submissions` | Queue one submission |
| `POST` | `/submissions?wait=true` | Queue and wait for a result |
| `GET` | `/submissions/:token` | Read a submission result |
| `DELETE` | `/submissions/:token` | Delete a cached submission |
| `POST` | `/submissions/batch` | Queue up to 20 submissions |
| `GET` | `/submissions/batch?tokens=a,b` | Read multiple results |
| `GET` | `/languages` | List active languages |
| `GET` | `/languages/all` | List all language configurations |
| `GET` | `/languages/:id` | Read one language configuration |
| `GET` | `/statuses` | List Judge0-compatible statuses |
| `GET` | `/about` | Project ownership and version |
| `GET` | `/workers` | BullMQ worker information |
| `GET` | `/statistics` | Queue statistics |
| `GET` | `/system_info` | Host runtime information |
| `GET` | `/config_info` | Active execution limits |
| `GET` | `/executor` | Executor capabilities and selection |

Submission requests can use `base64_encoded=true`, `fields=token,status,stdout`, `expected_output`, and configurable execution limits. Import `postman_collection.json` or `postman_leetcode_tests.json` into Postman for more examples.

## Configuration

Copy `.env.example` to `.env` when running processes outside Compose.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | API port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `AUTH_TOKEN` | Empty | Space-separated accepted API tokens |
| `AUTH_HEADERS` | `X-Auth-Token x-rapidapi-key` | Checked authentication headers |
| `EXECUTOR_TYPE` | `auto` | `auto`, `isolate`, `firecracker`, or `docker` |
| `WORKER_CONCURRENCY` | `4` | Parallel jobs per worker |
| `RESULT_CACHE_TTL` | `3600` | Cached-result lifetime in seconds |
| `DEFAULT_CPU_TIME_LIMIT` | `5` | Default CPU limit in seconds |
| `DEFAULT_WALL_TIME_LIMIT` | `10` | Default wall-time limit in seconds |
| `DEFAULT_MEMORY_LIMIT` | `128000` | Default memory limit in KB |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Requests per rate-limit window |

Do not use `dev-token` in production. Set a strong `AUTH_TOKEN`.

## Local Node.js Development

Start Redis, install the locked dependencies, and run the API and worker in separate terminals:

```bash
npm ci
docker compose up -d redis
npm run dev
```

Second terminal:

```bash
npm run worker
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Tests

The integration tests expect CodeBox at http://localhost:3000 with `dev-token`:

```bash
npm test
docker compose config
```

## Stop or Rebuild

```bash
docker compose down
docker compose up -d --build
```

Use `docker compose down -v` to also delete the Redis volume.

## Troubleshooting

### `No such image: codebox/python:3.8`

Build the language images before submitting code. Compose builds only the API and worker images.

### API starts but submissions return Internal Error

```bash
docker compose logs --tail=200 worker
docker images
```

Confirm Docker is running and the required `codebox/*` runtime image exists.

### Port 3000 or 6379 is already in use

Stop the process using the port or change the published port in `docker-compose.yml`.

### Firecracker is unavailable

Firecracker requires Linux, KVM access, the Firecracker binary, a kernel, and prepared root filesystems. Use `EXECUTOR_TYPE=docker` on Windows and macOS.

## Production Deployment

The production stack adds Caddy, Prometheus, and Grafana:

```bash
git clone https://github.com/waliullahx82/code-engine.git /opt/code-engine
cd /opt/code-engine
bash scripts/setup-production.sh api.example.com
```

Review `docker-compose.prod.yml`, `Caddyfile`, `prometheus.yml`, and `.env.example` before deployment. The production setup script changes system packages, firewall rules, Docker configuration, and service state; run it only on a dedicated Linux host you control.

## Project Structure

```text
src/
  api/          Express routes, middleware, and metrics
  executor/     Docker, Isolate, and Firecracker implementations
  languages/    Judge0 language IDs and runtime commands
  queue/        BullMQ producer, worker, and execution job
  security/     Pre-execution source-code analyzer
  utils/        Configuration, logging, and Base64 helpers
docker/
  images/       Per-language runtime images
  executor/     API and worker application image
scripts/        Local and production setup scripts
tests/          API integration tests
```

## Security

CodeBox applies container network isolation, resource limits, non-root runtime users, dropped Linux capabilities, request validation, token authentication, and rate limiting. Running untrusted code is inherently high risk. Review the executor configuration and host isolation before exposing this service publicly.

## Author

Created and maintained by **Waliullah Kawsar**.

- GitHub: https://github.com/waliullahx82
- Repository: https://github.com/waliullahx82/code-engine

## License

MIT