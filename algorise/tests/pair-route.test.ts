import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/import/extension/pair/route";

// getServerSession reads Next's request-scoped headers, which do not exist outside the server runtime.
vi.mock("next-auth", () => ({ getServerSession: async () => null }));

function pairRequest(body: string): NextRequest {
  return new NextRequest("http://localhost/api/import/extension/pair", { method: "POST", body, headers: { "content-type": "application/json" } });
}

describe("POST /api/import/extension/pair", () => {
  it("answers a JSON null body with 401 instead of crashing", async () => {
    const response = await POST(pairRequest("null"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in before creating a pairing code" });
  });

  it("rejects a non-string pairing code with the normal pairing error", async () => {
    const response = await POST(pairRequest(JSON.stringify({ action: "exchange", code: 12345 })));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Pairing code is invalid or expired" });
  });
});
