export interface CodeforcesProblem {
  contestId?: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

export interface CodeforcesSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: CodeforcesProblem;
  author: { participantType: string; members: Array<{ handle: string }> };
  programmingLanguage: string;
  verdict?: string;
  testset?: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

export interface CodeforcesApiResponse<T> {
  status: "OK" | "FAILED";
  result?: T;
  comment?: string;
}

export interface NormalizedSubmission {
  platform: "CODEFORCES";
  platformSubmissionId: string;
  handle: string;
  problemKey: string;
  problemName: string;
  problemUrl: string;
  rating: number | null;
  tags: string[];
  language: string;
  verdict: string;
  submittedAt: string;
  executionTimeMs: number;
  memoryKb: number;
  metadataOnly: true;
}
