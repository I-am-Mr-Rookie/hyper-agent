import { Throttler } from "../lib/throttler.js";

const API = "https://codeforces.com/api";
const throttler = new Throttler();

function decodeHtml(value) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (_match, entity) => {
      if (entity[0] === "#") {
        const hex = entity[1]?.toLowerCase() === "x";
        return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
      }
      return entities[entity.toLowerCase()] ?? `&${entity};`;
    });
}

export function extractCodeFromSubmissionHtml(html) {
  const match = html.match(/<pre[^>]*id=["']program-source-text["'][^>]*>([\s\S]*?)<\/pre>/i);
  if (!match) throw new Error("Codeforces source-code block was not found; selector may have drifted");
  return decodeHtml(match[1]).replace(/\r\n/g, "\n").trimEnd();
}

export function detectHandleFromHtml(html) {
  const candidates = [
    /name=["']handle["'][^>]*value=["']([^"']+)["']/i,
    /href=["']\/profile\/([A-Za-z0-9_.-]+)["'][^>]*class=["'][^"']*rated-user/i,
    /data-user=["']([^"']+)["']/i,
  ];
  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  throw new Error("Could not verify the currently signed-in Codeforces handle");
}

export async function detectSignedInHandle(fetcher = fetch) {
  const html = await throttler.run(async () => {
    const response = await fetcher("https://codeforces.com/settings/general", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error("Open Codeforces and sign in before connecting");
    return response.text();
  });
  return detectHandleFromHtml(html);
}

export async function collectOwnCodeforcesSubmissions({ confirmedHandle, cursor = "", limit = 20, fetcher = fetch, onProgress = () => undefined }) {
  const detectedHandle = await detectSignedInHandle(fetcher);
  if (detectedHandle.toLowerCase() !== confirmedHandle.trim().toLowerCase()) {
    throw new Error(`Detected signed-in handle ${detectedHandle}; it does not match the confirmed handle`);
  }

  const apiUrl = `${API}/user.status?handle=${encodeURIComponent(detectedHandle)}&from=1&count=${Math.min(100, Math.max(1, limit))}`;
  const apiResponse = await throttler.run(() => fetcher(apiUrl, { cache: "no-store" }));
  const apiPayload = await apiResponse.json();
  if (!apiResponse.ok || apiPayload.status !== "OK") throw new Error(apiPayload.comment || "Codeforces submission index failed");

  const previousId = Number(cursor || 0);
  const pending = apiPayload.result.filter((submission) => submission.id > previousId).sort((a, b) => a.id - b.id);
  const batch = [];

  for (let index = 0; index < pending.length; index += 1) {
    const submission = pending[index];
    const submissionUrl = `https://codeforces.com/contest/${submission.contestId}/submission/${submission.id}`;
    const html = await throttler.run(async () => {
      const response = await fetcher(submissionUrl, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`Codeforces submission ${submission.id} returned ${response.status}`);
      return response.text();
    });

    batch.push({
      platform_submission_id: String(submission.id),
      problem_url: `https://codeforces.com/problemset/problem/${submission.contestId}/${submission.problem.index}`,
      problem_title: submission.problem.name,
      language: submission.programmingLanguage,
      verdict: submission.verdict || "UNKNOWN",
      submitted_at: new Date(submission.creationTimeSeconds * 1000).toISOString(),
      source_code: extractCodeFromSubmissionHtml(html),
      submission_url: submissionUrl,
    });
    await onProgress({ current: index + 1, total: pending.length, submissionId: submission.id });
  }

  return {
    platform: "codeforces",
    handle: detectedHandle,
    cursor: pending.length ? String(pending[pending.length - 1].id) : cursor,
    batch,
  };
}
