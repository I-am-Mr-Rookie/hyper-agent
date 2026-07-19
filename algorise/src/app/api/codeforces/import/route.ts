import { NextRequest, NextResponse } from "next/server";
import { CodeforcesApiError, CodeforcesClient, normalizeSubmissions } from "@/lib/codeforces";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("handle") ?? "";
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || 250);
  const limit = Math.min(1_000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 250));

  try {
    const client = new CodeforcesClient();
    const snapshot = await client.importSnapshot(handle, limit);
    return NextResponse.json({
      source: "Codeforces official API",
      sourceCodeImported: false,
      partial: snapshot.partial,
      profile: snapshot.profile,
      ratingHistory: snapshot.ratingHistory,
      submissions: normalizeSubmissions(snapshot.submissions),
    });
  } catch (error) {
    const status = error instanceof CodeforcesApiError ? error.status || (error.retryable ? 503 : 400) : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed", retryable: error instanceof CodeforcesApiError && error.retryable },
      { status },
    );
  }
}
