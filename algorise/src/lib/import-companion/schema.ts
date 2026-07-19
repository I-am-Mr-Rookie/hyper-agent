import { z } from "zod";

export const platformSchema = z.enum(["codeforces", "leetcode", "atcoder", "codechef"]);

export const importedSubmissionSchema = z.object({
  platform_submission_id: z.string().min(1).max(128),
  problem_url: z.string().url(),
  problem_title: z.string().min(1).max(500),
  language: z.string().min(1).max(100),
  verdict: z.string().min(1).max(100),
  submitted_at: z.string().datetime(),
  source_code: z.string().max(200_000),
  submission_url: z.string().url(),
});

export const extensionUploadSchema = z.object({
  platform: platformSchema,
  handle: z.string().min(3).max(64),
  cursor: z.string().max(512).optional().default(""),
  batch: z.array(importedSubmissionSchema).min(1).max(100),
});

export function platformEnabled(platform: z.infer<typeof platformSchema>, env: Partial<NodeJS.ProcessEnv> = process.env): boolean {
  const key = `FEATURE_IMPORT_${platform.toUpperCase()}`;
  return env[key] === "true";
}
