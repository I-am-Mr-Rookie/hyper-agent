try { process.loadEnvFile?.(".env"); } catch { /* Explicit shell env is also supported. */ }
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.JUDGE_BASE_URL || "http://localhost:3100";
const token = process.env.JUDGE_AUTH_TOKEN;
if (!token) throw new Error("JUDGE_AUTH_TOKEN is required; load it from untracked .env");
const headers = { "content-type": "application/json", "x-auth-token": token };

const cases = [
  {
    name: "busy-loop",
    language_id: 54,
    source_code: "int main(){volatile unsigned long long x=0;while(true)x++;}",
    expected: ["Time Limit Exceeded"],
    limits: { cpu_time_limit: 1, wall_time_limit: 2, memory_limit: 65536, max_processes_and_or_threads: 8 },
  },
  {
    name: "oversized-allocation",
    language_id: 54,
    source_code: "#include <vector>\nint main(){std::vector<char> x(1024ULL*1024*1024);return x[0];}",
    expected: ["Memory Limit Exceeded", "Runtime Error"],
    limits: { cpu_time_limit: 2, wall_time_limit: 3, memory_limit: 32768, max_processes_and_or_threads: 8 },
  },
  {
    name: "fork-bomb",
    language_id: 54,
    source_code: "#include <unistd.h>\nint main(){while(true)fork();}",
    expected: ["Time Limit Exceeded", "Runtime Error"],
    limits: { cpu_time_limit: 1, wall_time_limit: 2, memory_limit: 65536, max_processes_and_or_threads: 8 },
  },
  {
    name: "network-egress-blocked",
    language_id: 71,
    source_code: "import socket\ns=socket.socket();s.settimeout(1)\ntry:\n s.connect(('1.1.1.1',53));print('EGRESS')\nexcept Exception:\n print('BLOCKED')",
    stdin: "",
    expected_output: "BLOCKED\n",
    expected: ["Accepted"],
    limits: { cpu_time_limit: 2, wall_time_limit: 3, memory_limit: 65536, max_processes_and_or_threads: 8 },
  },
  {
    name: "masked-sensitive-file",
    language_id: 71,
    source_code: "from pathlib import Path\ntry:\n x=Path('/etc/shadow').read_text();print('ESCAPE')\nexcept Exception:\n print('BLOCKED')",
    stdin: "",
    expected_output: "BLOCKED\n",
    expected: ["Accepted"],
    limits: { cpu_time_limit: 2, wall_time_limit: 3, memory_limit: 65536, max_processes_and_or_threads: 8 },
  },
];

async function run(testCase) {
  const response = await fetch(`${baseUrl}/submissions?wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: testCase.source_code,
      language_id: testCase.language_id,
      stdin: testCase.stdin || "",
      expected_output: testCase.expected_output || "",
      enable_network: false,
      ...testCase.limits,
    }),
    signal: AbortSignal.timeout(35_000),
  });
  const payload = await response.json();
  const actual = payload.status?.description || `HTTP ${response.status}`;
  return { name: testCase.name, expected: testCase.expected, actual, pass: response.ok && testCase.expected.some((label) => actual === label || actual.startsWith(`${label} (`)) };
}

const results = [];
for (const testCase of cases) results.push(await run(testCase));
const evidence = { runAt: new Date().toISOString(), results, pass: results.every((result) => result.pass) };
await mkdir(new URL("../docs/evidence/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/evidence/judge-stress.json", import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence, null, 2));
if (!evidence.pass) process.exitCode = 1;
