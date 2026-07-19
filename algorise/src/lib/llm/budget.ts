export interface BudgetUsage {
  date: string;
  estimatedUsd: number;
  mentorTokensByUser: Map<string, number>;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class BudgetLedger {
  private usage: BudgetUsage;

  constructor(
    private readonly dailyBudgetUsd: number,
    private readonly mentorDailyTokensPerUser: number,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.usage = this.freshUsage();
  }

  private dateKey(): string {
    return this.clock().toISOString().slice(0, 10);
  }

  private freshUsage(): BudgetUsage {
    return { date: this.dateKey(), estimatedUsd: 0, mentorTokensByUser: new Map() };
  }

  private rollDay(): void {
    if (this.usage.date !== this.dateKey()) this.usage = this.freshUsage();
  }

  assertAllowed(estimatedUsd = 0, mentorUserId?: string, estimatedMentorTokens = 0): void {
    this.rollDay();
    if (this.usage.estimatedUsd + estimatedUsd > this.dailyBudgetUsd) {
      throw new BudgetExceededError("Daily LLM dollar budget reached");
    }

    if (mentorUserId) {
      const used = this.usage.mentorTokensByUser.get(mentorUserId) ?? 0;
      if (used + estimatedMentorTokens > this.mentorDailyTokensPerUser) {
        throw new BudgetExceededError("Daily mentor token budget reached for this user");
      }
    }
  }

  record(estimatedUsd = 0, mentorUserId?: string, mentorTokens = 0): void {
    this.rollDay();
    this.usage.estimatedUsd += estimatedUsd;
    if (mentorUserId) {
      this.usage.mentorTokensByUser.set(mentorUserId, (this.usage.mentorTokensByUser.get(mentorUserId) ?? 0) + mentorTokens);
    }
  }

  snapshot(): { date: string; estimatedUsd: number; mentorTokensByUser: Record<string, number> } {
    this.rollDay();
    return {
      date: this.usage.date,
      estimatedUsd: this.usage.estimatedUsd,
      mentorTokensByUser: Object.fromEntries(this.usage.mentorTokensByUser),
    };
  }
}
