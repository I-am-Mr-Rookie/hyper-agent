import test from "node:test";
import assert from "node:assert/strict";
import { collectOwnCodeforcesSubmissions, detectHandleFromHtml, extractCodeFromSubmissionHtml } from "./collectors/codeforces.js";
import { Throttler } from "./lib/throttler.js";

test("Codeforces parser extracts escaped source code", () => {
  const html = '<pre id="program-source-text">#include &lt;iostream&gt;\nint main(){return 0;}</pre>';
  assert.equal(extractCodeFromSubmissionHtml(html), "#include <iostream>\nint main(){return 0;}");
});

test("signed-in handle detector uses account-owned settings data", () => {
  assert.equal(detectHandleFromHtml('<input name="handle" value="founder_handle">'), "founder_handle");
});

test("throttler serializes requests through an injectable delay", async () => {
  const delays = [];
  const throttler = new Throttler({ minimumDelayMs: 2500, jitterMs: 0, sleep: async (ms) => delays.push(ms) });
  await throttler.run(async () => "ok");
  await throttler.run(async () => "ok");
  assert.equal(delays.length >= 1, true);
});

test("collector awaits progress control before fetching the next submission", async () => {
  const originalWait = Throttler.prototype.wait;
  Throttler.prototype.wait = async () => undefined;
  let releaseProgress;
  const progressGate = new Promise((resolve) => { releaseProgress = resolve; });
  let detailFetches = 0;
  const submissions = [1, 2].map((id) => ({
    id,
    contestId: 100,
    creationTimeSeconds: 1_700_000_000 + id,
    problem: { index: "A", name: `Problem ${id}` },
    programmingLanguage: "GNU C++17",
    verdict: "OK",
  }));
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("settings/general")) return new Response('<input name="handle" value="founder_handle">', { status: 200 });
    if (url.includes("/api/user.status")) return new Response(JSON.stringify({ status: "OK", result: submissions }), { status: 200, headers: { "content-type": "application/json" } });
    detailFetches += 1;
    return new Response('<pre id="program-source-text">int main(){return 0;}</pre>', { status: 200 });
  };

  try {
    const collection = collectOwnCodeforcesSubmissions({
      confirmedHandle: "founder_handle",
      limit: 2,
      fetcher,
      onProgress: async ({ current }) => { if (current === 1) await progressGate; },
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(detailFetches, 1);
    releaseProgress();
    const result = await collection;
    assert.equal(result.batch.length, 2);
    assert.equal(detailFetches, 2);
  } finally {
    Throttler.prototype.wait = originalWait;
  }
});
