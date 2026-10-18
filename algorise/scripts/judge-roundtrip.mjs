try { process.loadEnvFile?.(".env"); } catch { /* Explicit shell env is also supported. */ }
import { readFile, mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.JUDGE_BASE_URL || "http://localhost:3100";
const token = process.env.JUDGE_AUTH_TOKEN;
if (!token) throw new Error("JUDGE_AUTH_TOKEN is required; load it from untracked .env");

const headers = { "content-type": "application/json", "x-auth-token": token };

async function submit(sourceCode, overrides = {}) {
  const response = await fetch(`${baseUrl}/submissions?wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: 54,
      stdin: "7 35\n",
      expected_output: "42\n",
      cpu_time_limit: 1,
      wall_time_limit: 2,
      memory_limit: 65536,
      max_processes_and_or_threads: 16,
      enable_network: false,
      ...overrides,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Judge submission failed: ${JSON.stringify(payload)}`);
  return payload;
}

const healthResponse = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5_000) });
if (!healthResponse.ok) throw new Error(`Judge health returned ${healthResponse.status}`);
const health = await healthResponse.json();

const reference = await readFile(new URL("../judge/demo/sum/reference.cpp", import.meta.url), "utf8");
const deliberateTle = await readFile(new URL("../judge/demo/sum/deliberate-tle.cpp", import.meta.url), "utf8");
const accepted = await submit(reference);
const tle = await submit(deliberateTle, { stdin: "", expected_output: "" });

const evidence = {
  runAt: new Date().toISOString(),
  baseUrl,
  health: health.status,
  accepted: { status: accepted.status, stdout: accepted.stdout, time: accepted.time, memory: accepted.memory },
  deliberateTle: { status: tle.status, time: tle.time, memory: tle.memory },
  pass: accepted.status?.description === "Accepted" && tle.status?.description === "Time Limit Exceeded",
};

await mkdir(new URL("../docs/evidence/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/evidence/judge-roundtrip.json", import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.pass) process.exitCode = 1;
