import fixture from "./fixtures/codeforces-user-status.json";
import { describe, expect, it, vi } from "vitest";
import { CodeforcesApiError, CodeforcesClient, normalizeSubmissions, type CodeforcesSubmission } from "@/lib/codeforces";

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

  it("reports transport failures as a retryable upstream error, not a client error", async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const client = new CodeforcesClient({ fetch: fetchMock, sleep: async () => undefined, minimumSpacingMs: 0 });

    const error = await client.userStatus("golden1200", 1, 2).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CodeforcesApiError);
    expect(error).toMatchObject({ retryable: true, status: 503 });
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

  it("surfaces Codeforces' own reason for a 400, and maps an unknown handle to 404", async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ status: "FAILED", comment: "handles: User with handle nobody_zz not found" }),
      { status: 400, headers: { "content-type": "application/json" } },
    )) as unknown as typeof fetch;
    const client = new CodeforcesClient({ fetch: fetchMock, sleep: async () => undefined, minimumSpacingMs: 0 });

    const error = await client.userInfo("nobody_zz").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ message: "handles: User with handle nobody_zz not found", status: 404, retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts expired cache entries so a long-lived shared client does not grow without bound", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "OK", result: [] }), { status: 200 })) as unknown as typeof fetch;
      const client = new CodeforcesClient({ fetch: fetchMock, sleep: async () => undefined, minimumSpacingMs: 0, cacheTtlMs: 1_000 });

      for (let index = 0; index < 50; index += 1) {
        await client.userRating(`handle_${index}`);
        vi.advanceTimersByTime(2_000);
      }
      // The cache is private; peeking is the only way to observe the leak.
      expect((client as unknown as { cache: Map<string, unknown> }).cache.size).toBeLessThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
