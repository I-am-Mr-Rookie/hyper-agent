import { writeFile } from "node:fs/promises";
import { LLMGateway, SLOT_NAMES, type SlotName, type UsageEvent } from "../src/lib/llm";

try { process.loadEnvFile?.(".env"); } catch { /* Explicit shell env is also supported. */ }

const requested = process.argv.slice(2).filter((value): value is SlotName => SLOT_NAMES.includes(value as SlotName));
const slots = requested.length ? requested : [...SLOT_NAMES];
const events: UsageEvent[] = [];
const gateway = new LLMGateway({ usageSink: (event) => { events.push(event); }, timeoutMs: 90_000 });
const results = [];

for (const slot of slots) {
  const started = Date.now();
  try {
    const response = await gateway.invoke({
      slot,
      messages: [{ role: "user", content: `Reply only LOCAL_SMOKE_OK. Slot=${slot}` }],
      estimatedUsd: 0,
      mentorUserId: slot === "mentor" ? "local-smoke-user" : undefined,
      estimatedMentorTokens: slot === "mentor" ? 16 : 0,
    });
    results.push({
      slot,
      model: response.model,
      provider: response.provider,
      reasoningFallbackUsed: response.reasoningFallbackUsed,
      parameterFallbacks: response.parameterFallbacks,
      latencyMs: Date.now() - started,
      promptTokens: response.usage.promptTokens,
      outputTokens: response.usage.outputTokens,
      responseMatched: response.text.trim() === "LOCAL_SMOKE_OK",
      pass: response.text.trim() === "LOCAL_SMOKE_OK",
    });
  } catch (error) {
    results.push({ slot, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Unknown error", pass: false });
  }
}

const report = { runAt: new Date().toISOString(), slots, results, usageEvents: events, pass: results.every((result) => result.pass) };
const reportPath = process.env.LLM_SMOKE_REPORT || "docs/evidence/llm-live-smoke.json";
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
