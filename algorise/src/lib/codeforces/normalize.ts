import type { CodeforcesSubmission, NormalizedSubmission } from "./types";

export function normalizeSubmission(submission: CodeforcesSubmission): NormalizedSubmission {
  const contestId = submission.contestId ?? submission.problem.contestId;
  const problemKey = `${contestId ?? "unknown"}${submission.problem.index}`;
  const handle = submission.author.members[0]?.handle ?? "unknown";
  const problemUrl = contestId
    ? `https://codeforces.com/problemset/problem/${contestId}/${encodeURIComponent(submission.problem.index)}`
    : "https://codeforces.com/problemset";

  return {
    platform: "CODEFORCES",
    platformSubmissionId: String(submission.id),
    handle,
    problemKey,
    problemName: submission.problem.name,
    problemUrl,
    rating: submission.problem.rating ?? null,
    tags: [...submission.problem.tags].sort(),
    language: submission.programmingLanguage,
    verdict: submission.verdict ?? "UNKNOWN",
    submittedAt: new Date(submission.creationTimeSeconds * 1000).toISOString(),
    executionTimeMs: submission.timeConsumedMillis,
    memoryKb: Math.round(submission.memoryConsumedBytes / 1024),
    metadataOnly: true,
  };
}

export function normalizeSubmissions(submissions: CodeforcesSubmission[]): NormalizedSubmission[] {
  return submissions.map(normalizeSubmission).sort((a, b) => {
    const time = b.submittedAt.localeCompare(a.submittedAt);
    return time || Number(b.platformSubmissionId) - Number(a.platformSubmissionId);
  });
}
