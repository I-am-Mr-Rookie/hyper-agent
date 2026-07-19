import { describe, expect, it } from "vitest";
import { extensionUploadSchema, ImportCompanionStore, platformEnabled } from "@/lib/import-companion";

const item = {
  platform: "codeforces",
  handle: "founderHandle",
  platformSubmissionId: "123",
  problemUrl: "https://codeforces.com/problemset/problem/1/A",
  problemTitle: "Theatre Square",
  language: "GNU C++17",
  verdict: "OK",
  submittedAt: "2026-07-19T12:00:00.000Z",
  sourceCode: "int main(){}",
  submissionUrl: "https://codeforces.com/contest/1/submission/123",
};

describe("Import Companion pairing and upload store", () => {
  it("uses one-time pairing codes, scoped bearer tokens, and idempotent deduplication", () => {
    const store = new ImportCompanionStore();
    const { code } = store.createPairingCode("user-1");
    const { token } = store.exchangePairingCode(code);
    expect(() => store.exchangePairingCode(code)).toThrow(/invalid or expired/);
    expect(store.authorize(token).userId).toBe("user-1");
    expect(store.importBatch("user-1", [item])).toEqual({ accepted: 1, duplicates: 0 });
    expect(store.importBatch("user-1", [item])).toEqual({ accepted: 0, duplicates: 1 });
    expect(store.deleteForUser("user-1")).toBe(1);
  });

  it("keeps higher-risk collectors disabled by default", () => {
    expect(platformEnabled("codeforces", { FEATURE_IMPORT_CODEFORCES: "true" })).toBe(true);
    expect(platformEnabled("leetcode", { FEATURE_IMPORT_LEETCODE: "false" })).toBe(false);
  });

  it("rejects oversized or malformed upload payloads", () => {
    const result = extensionUploadSchema.safeParse({ platform: "codeforces", handle: "x", batch: [] });
    expect(result.success).toBe(false);
  });
});
