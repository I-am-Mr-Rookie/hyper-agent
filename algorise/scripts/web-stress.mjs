import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
const concurrency = Number(process.env.STRESS_CONCURRENCY || 30);
const requestCount = Number(process.env.STRESS_REQUESTS || 600);

async function timedFetch(path, init) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(5_000) });
    await response.arrayBuffer();
    return { status: response.status, latencyMs: performance.now() - started, ok: response.ok };
  } catch (error) {
    return { status: 0, latencyMs: performance.now() - started, ok: false, error: error instanceof Error ? error.message : "transport error" };
  }
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

const paths = Array.from({ length: requestCount }, (_, index) => ["/", "/dashboard", "/api/health"][index % 3]);
const httpResults = await runPool(paths, (path) => timedFetch(path));
const sorted = httpResults.map((result) => result.latencyMs).sort((a, b) => a - b);
const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

async function json(path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `${path} returned ${response.status}`);
  return payload;
}

const pair = await json("/api/import/extension/pair", {});
const exchange = await json("/api/import/extension/pair", { action: "exchange", code: pair.pairingCode });
const baseSubmission = {
  problem_url: "https://codeforces.com/problemset/problem/1/A",
  problem_title: "Original private import fixture",
  language: "GNU C++17",
  verdict: "OK",
  submitted_at: "2026-07-19T12:00:00.000Z",
  source_code: "int main(){return 0;}",
  submission_url: "https://codeforces.com/contest/1/submission/1",
};
const importBatch = Array.from({ length: 50 }, (_, index) => ({ ...baseSubmission, platform_submission_id: `stress-${index}` }));
const firstImport = await json("/api/import/extension", { platform: "codeforces", handle: "local_demo", cursor: "50", batch: importBatch }, exchange.uploadToken);
const duplicateImports = await Promise.all(Array.from({ length: 10 }, () => json("/api/import/extension", { platform: "codeforces", handle: "local_demo", cursor: "50", batch: importBatch }, exchange.uploadToken)));
const deleteResponse = await fetch(`${baseUrl}/api/import/extension`, { method: "DELETE", headers: { authorization: `Bearer ${exchange.uploadToken}` } });
const deleted = await deleteResponse.json();

const failed = httpResults.filter((result) => !result.ok);
const dedupPass = firstImport.accepted === 50 && duplicateImports.every((result) => result.accepted === 0 && result.duplicates === 50) && deleted.deleted === 50 && deleted.tokenRevoked === true;
const report = {
  runAt: new Date().toISOString(),
  target: baseUrl,
  http: {
    requests: requestCount,
    concurrency,
    failed: failed.length,
    statuses: Object.fromEntries(Object.entries(httpResults.reduce((acc, result) => ({ ...acc, [result.status]: (acc[result.status] || 0) + 1 }), {})).sort()),
    latencyMs: { min: Math.round(sorted[0]), p50: Math.round(percentile(0.5)), p95: Math.round(percentile(0.95)), p99: Math.round(percentile(0.99)), max: Math.round(sorted.at(-1)) },
  },
  importCompanion: {
    firstImport,
    duplicateRounds: duplicateImports.length,
    everyDuplicateSuppressed: duplicateImports.every((result) => result.accepted === 0),
    deletion: deleted,
    pass: dedupPass,
  },
  pass: failed.length === 0 && percentile(0.95) < 1_000 && dedupPass,
};

await mkdir(new URL("../docs/evidence/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/evidence/web-stress.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
