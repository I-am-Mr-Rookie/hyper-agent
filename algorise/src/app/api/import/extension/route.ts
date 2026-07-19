import { NextRequest, NextResponse } from "next/server";
import { extensionUploadSchema, importCompanionStore, platformEnabled } from "@/lib/import-companion";

export const runtime = "nodejs";

function bearerToken(request: NextRequest): string {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const grant = importCompanionStore.authorize(bearerToken(request));
    const payload = extensionUploadSchema.parse(await request.json());
    if (!platformEnabled(payload.platform)) {
      return NextResponse.json({ error: `${payload.platform} collector is disabled` }, { status: 409 });
    }

    const batch = payload.batch.map((item) => ({
      platform: payload.platform,
      handle: payload.handle,
      platformSubmissionId: item.platform_submission_id,
      problemUrl: item.problem_url,
      problemTitle: item.problem_title,
      language: item.language,
      verdict: item.verdict,
      submittedAt: item.submitted_at,
      sourceCode: item.source_code,
      submissionUrl: item.submission_url,
    }));
    const result = importCompanionStore.importBatch(grant.userId, batch);
    return NextResponse.json({ ...result, cursor: payload.cursor, private: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = bearerToken(request);
    const grant = importCompanionStore.authorize(token);
    const deleted = importCompanionStore.deleteForUser(grant.userId);
    importCompanionStore.revoke(token);
    return NextResponse.json({ deleted, tokenRevoked: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 401 });
  }
}
