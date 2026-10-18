import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, isLocalDemoAuthEnabled } from "@/lib/auth";
import { importCompanionStore } from "@/lib/import-companion";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = ((await request.json().catch(() => null)) ?? {}) as { action?: unknown; code?: unknown };

  if (payload.action === "exchange") {
    try {
      const result = importCompanionStore.exchangePairingCode(typeof payload.code === "string" ? payload.code : "");
      return NextResponse.json({ uploadToken: result.token, expiresAt: result.expiresAt });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Pairing failed" }, { status: 401 });
    }
  }

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as ({ id?: string; email?: string | null; name?: string | null; image?: string | null }) | undefined;
  const userId = sessionUser?.id ?? (isLocalDemoAuthEnabled() ? "local-demo-user" : undefined);
  if (!userId) return NextResponse.json({ error: "Sign in before creating a pairing code" }, { status: 401 });

  const result = importCompanionStore.createPairingCode(userId);
  return NextResponse.json({ pairingCode: result.code, expiresAt: result.expiresAt, localDemo: !sessionUser?.id });
}
