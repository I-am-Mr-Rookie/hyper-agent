import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface PairingGrant {
  userId: string;
  expiresAt: number;
}

export interface ImportedSubmission {
  platform: string;
  handle: string;
  platformSubmissionId: string;
  problemUrl: string;
  problemTitle: string;
  language: string;
  verdict: string;
  submittedAt: string;
  sourceCode: string;
  submissionUrl: string;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class ImportCompanionStore {
  private readonly pairingCodes = new Map<string, PairingGrant>();
  private readonly tokens = new Map<string, PairingGrant>();
  private readonly submissions = new Map<string, ImportedSubmission & { userId: string }>();

  // Unexchanged codes and expired tokens would otherwise accumulate for the process lifetime.
  private pruneExpired(): void {
    const now = Date.now();
    for (const map of [this.pairingCodes, this.tokens]) {
      for (const [key, grant] of map) if (grant.expiresAt < now) map.delete(key);
    }
  }

  createPairingCode(userId: string, ttlMs = 10 * 60_000): { code: string; expiresAt: number } {
    this.pruneExpired();
    const code = randomBytes(5).toString("hex").toUpperCase();
    const expiresAt = Date.now() + ttlMs;
    this.pairingCodes.set(digest(code), { userId, expiresAt });
    return { code, expiresAt };
  }

  exchangePairingCode(code: string, ttlMs = 30 * 24 * 60 * 60_000): { token: string; expiresAt: number; userId: string } {
    const codeDigest = digest(code.trim().toUpperCase());
    const grant = this.pairingCodes.get(codeDigest);
    this.pairingCodes.delete(codeDigest);
    if (!grant || grant.expiresAt < Date.now()) throw new Error("Pairing code is invalid or expired");

    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + ttlMs;
    this.tokens.set(digest(token), { userId: grant.userId, expiresAt });
    return { token, expiresAt, userId: grant.userId };
  }

  authorize(token: string): PairingGrant {
    this.pruneExpired();
    const candidate = Buffer.from(digest(token));
    let matched: PairingGrant | undefined;
    for (const [storedDigest, grant] of this.tokens) {
      const stored = Buffer.from(storedDigest);
      if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
        matched = grant;
        break;
      }
    }
    if (!matched || matched.expiresAt < Date.now()) throw new Error("Upload token is invalid or expired");
    return matched;
  }

  importBatch(userId: string, batch: ImportedSubmission[]): { accepted: number; duplicates: number } {
    let accepted = 0;
    let duplicates = 0;
    for (const item of batch) {
      const key = `${userId}:${item.platform}:${item.platformSubmissionId}`;
      if (this.submissions.has(key)) {
        duplicates += 1;
        continue;
      }
      this.submissions.set(key, { ...item, userId });
      accepted += 1;
    }
    return { accepted, duplicates };
  }

  deleteForUser(userId: string): number {
    let deleted = 0;
    for (const [key, item] of this.submissions) {
      if (item.userId === userId) {
        this.submissions.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  revoke(token: string): void {
    this.tokens.delete(digest(token));
  }
}

declare global {
  var __algoriseImportStore: ImportCompanionStore | undefined;
}

export const importCompanionStore = globalThis.__algoriseImportStore ?? new ImportCompanionStore();
if (process.env.NODE_ENV !== "production") globalThis.__algoriseImportStore = importCompanionStore;
