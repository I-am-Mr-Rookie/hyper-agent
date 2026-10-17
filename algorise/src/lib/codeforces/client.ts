import type { CodeforcesApiResponse, CodeforcesSubmission } from "./types";

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{3,24}$/;

export interface CodeforcesClientOptions {
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  minimumSpacingMs?: number;
  maxRetries?: number;
  cacheTtlMs?: number;
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class CodeforcesApiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CodeforcesApiError";
  }
}

export class CodeforcesClient {
  private readonly fetcher: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly minimumSpacingMs: number;
  private readonly maxRetries: number;
  private readonly cacheTtlMs: number;
  private lastRequestAt = 0;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(options: CodeforcesClientOptions = {}) {
    this.fetcher = options.fetch ?? fetch;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.minimumSpacingMs = options.minimumSpacingMs ?? 2_100;
    this.maxRetries = options.maxRetries ?? 3;
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60_000;
  }

  static assertHandle(handle: string): string {
    const normalized = handle.trim();
    if (!HANDLE_PATTERN.test(normalized)) throw new Error("Invalid Codeforces handle format");
    return normalized;
  }

  async userInfo(handle: string): Promise<Record<string, unknown>> {
    const safeHandle = CodeforcesClient.assertHandle(handle);
    const users = await this.request<Record<string, unknown>[]>("user.info", { handles: safeHandle });
    if (!users[0]) throw new CodeforcesApiError("Codeforces handle not found", false, 404);
    return users[0];
  }

  async userRating(handle: string): Promise<Record<string, unknown>[]> {
    const safeHandle = CodeforcesClient.assertHandle(handle);
    return this.request<Record<string, unknown>[]>("user.rating", { handle: safeHandle });
  }

  async userStatus(handle: string, from = 1, count = 1_000): Promise<CodeforcesSubmission[]> {
    const safeHandle = CodeforcesClient.assertHandle(handle);
    return this.request<CodeforcesSubmission[]>("user.status", {
      handle: safeHandle,
      from: String(Math.max(1, from)),
      count: String(Math.min(10_000, Math.max(1, count))),
    });
  }

  async importSnapshot(handle: string, count = 1_000): Promise<{
    profile: Record<string, unknown>;
    ratingHistory: Record<string, unknown>[];
    submissions: CodeforcesSubmission[];
    partial: boolean;
  }> {
    const safeHandle = CodeforcesClient.assertHandle(handle);
    const [profile, ratingHistory, submissions] = await Promise.all([
      this.userInfo(safeHandle),
      this.userRating(safeHandle).catch(() => []),
      this.userStatus(safeHandle, 1, count),
    ]);
    return { profile, ratingHistory, submissions, partial: submissions.length === count };
  }

  private schedule<T>(task: () => Promise<T>): Promise<T> {
    const scheduled = this.requestQueue.then(task, task);
    this.requestQueue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  private async request<T>(method: string, params: Record<string, string>): Promise<T> {
    const query = new URLSearchParams(params);
    const cacheKey = `${method}?${query.toString()}`;
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    return this.schedule(async () => {
      const queuedCache = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
      if (queuedCache && queuedCache.expiresAt > Date.now()) return queuedCache.value;

      let lastError: unknown;
      for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
        try {
          const spacing = this.minimumSpacingMs - (Date.now() - this.lastRequestAt);
          if (spacing > 0) await this.sleep(spacing);
          this.lastRequestAt = Date.now();

          const response = await this.fetcher(`https://codeforces.com/api/${method}?${query}`, {
            headers: { "user-agent": "AlgoRise-Sprint-Zero/0.1 (metadata import; contact founders)" },
            signal: AbortSignal.timeout(15_000),
            cache: "no-store",
          });
          if (response.status === 429 || response.status >= 500) {
            throw new CodeforcesApiError(`Codeforces returned ${response.status}`, true, response.status);
          }
          if (!response.ok) throw new CodeforcesApiError(`Codeforces returned ${response.status}`, false, response.status);

          const payload = (await response.json()) as CodeforcesApiResponse<T>;
          if (payload.status !== "OK" || payload.result === undefined) {
            const retryable = /limit|temporar|try again/i.test(payload.comment ?? "");
            throw new CodeforcesApiError(payload.comment || "Codeforces API request failed", retryable);
          }

          this.cache.set(cacheKey, { expiresAt: Date.now() + this.cacheTtlMs, value: payload.result });
          return payload.result;
        } catch (error) {
          lastError = error;
          const retryable = error instanceof CodeforcesApiError ? error.retryable : true;
          if (!retryable || attempt === this.maxRetries - 1) break;
          await this.sleep(500 * 2 ** attempt);
        }
      }

      // Transport failures (timeouts, DNS, bad JSON) are upstream problems, not client errors.
      throw lastError instanceof CodeforcesApiError ? lastError : new CodeforcesApiError("Codeforces API is unreachable", true, 503);
    });
  }
}
