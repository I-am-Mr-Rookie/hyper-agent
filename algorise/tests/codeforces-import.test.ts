import fixture from "./fixtures/codeforces-user-status.json";
import { describe, expect, it, vi } from "vitest";
import { CodeforcesClient, normalizeSubmissions, type CodeforcesSubmission } from "@/lib/codeforces";

describe("Codeforces importer", () => {
  it("normalizes the golden-handle fixture deterministically without pretending source code exists", () => {
    const normalized = normalizeSubmissions(fixture as CodeforcesSubmission[]);
    expect(normalized.map((item) => item.platformSubmissionId)).toEqual(["200003", "200001"]);
    expect(normalized[0].problemUrl).toBe("https://codeforces.com/problemset/problem/1900/C");
    expect(normalized[0].metadataOnly).toBe(true);
    expect(normalized[1].tags).toEqual(["arrays", "implementation"]);
  });

  it("caches identical API calls and preserves courtesy spacing hooks", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "OK", result: fixture }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const sleep = vi.fn(async () => undefined);
    const client = new CodeforcesClient({ fetch: fetchMock, sleep, minimumSpacingMs: 0 });

    await client.userStatus("golden1200", 1, 2);
    await client.userStatus("golden1200", 1, 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("backs off on 429 and resumes", async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response("rate limited", { status: 429 });
      return new Response(JSON.stringify({ status: "OK", result: fixture }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const sleep = vi.fn(async () => undefined);
    const client = new CodeforcesClient({ fetch: fetchMock, sleep, minimumSpacingMs: 0 });

    const result = await client.userStatus("golden1200", 1, 2);
    expect(result).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalled();
  });

  it("serializes concurrent API methods so courtesy spacing cannot race", async () => {
    let active = 0;
    let maxActive = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      const url = String(input);
      const result = url.includes("user.info") ? [{ handle: "golden1200" }] : url.includes("user.rating") ? [] : fixture;
      return new Response(JSON.stringify({ status: "OK", result }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const client = new CodeforcesClient({ fetch: fetchMock, sleep: async () => undefined, minimumSpacingMs: 0 });

    await client.importSnapshot("golden1200", 2);
    expect(maxActive).toBe(1);
  });
});
