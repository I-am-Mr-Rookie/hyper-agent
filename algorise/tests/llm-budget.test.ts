import { describe, expect, it } from "vitest";
import { BudgetExceededError, BudgetLedger } from "@/lib/llm/budget";

describe("BudgetLedger", () => {
  it("enforces both dollar and mentor token budgets", () => {
    const ledger = new BudgetLedger(1, 100);
    ledger.record(0.8, "user-1", 80);
    expect(() => ledger.assertAllowed(0.3)).toThrow(BudgetExceededError);
    expect(() => ledger.assertAllowed(0, "user-1", 21)).toThrow(BudgetExceededError);
    expect(() => ledger.assertAllowed(0.1, "user-1", 20)).not.toThrow();
  });
});
