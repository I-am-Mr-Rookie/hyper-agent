import { z } from "zod";

export const SLOT_NAMES = [
  "analyst",
  "testgen",
  "judge_feedback",
  "mentor",
  "content",
  "lite",
] as const;

export type SlotName = (typeof SLOT_NAMES)[number];
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

const thinkingSchema = z.enum(["minimal", "low", "medium", "high"]);

export interface ProviderConfig {
  name: "primary" | "secondary";
  baseUrl: string;
  apiKey: string;
  reasoningStyle: "openai" | "openrouter";
  protocol: "chat" | "responses";
}

export interface SlotConfig {
  name: SlotName;
  provider: "primary" | "secondary";
  modelId: string;
  thinking: ThinkingLevel;
  highStakes: boolean;
}

export interface GatewayConfig {
  providers: Partial<Record<"primary" | "secondary", ProviderConfig>>;
  slots: Record<SlotName, SlotConfig>;
  dailyBudgetUsd: number;
  mentorDailyTokensPerUser: number;
  killSwitch: boolean;
}

const slotEnv: Record<SlotName, { model: string; thinking: string; provider: "primary" | "secondary" }> = {
  analyst: { model: "MODEL_ANALYST_ID", thinking: "MODEL_ANALYST_THINKING", provider: "primary" },
  testgen: { model: "MODEL_TESTGEN_ID", thinking: "MODEL_TESTGEN_THINKING", provider: "primary" },
  judge_feedback: { model: "MODEL_JUDGE_FEEDBACK_ID", thinking: "MODEL_JUDGE_FEEDBACK_THINKING", provider: "primary" },
  mentor: { model: "MODEL_MENTOR_ID", thinking: "MODEL_MENTOR_THINKING", provider: "primary" },
  content: { model: "MODEL_CONTENT_ID", thinking: "MODEL_CONTENT_THINKING", provider: "primary" },
  lite: { model: "MODEL_LITE_ID", thinking: "MODEL_LITE_THINKING", provider: "secondary" },
};

const highStakes = new Set<SlotName>(["analyst", "testgen", "judge_feedback"]);

function inferReasoningStyle(baseUrl: string): "openai" | "openrouter" {
  return baseUrl.includes("openrouter.ai") ? "openrouter" : "openai";
}

function inferProtocol(baseUrl: string, configured?: string): "chat" | "responses" {
  if (configured === "chat" || configured === "responses") return configured;
  return baseUrl.includes("api-t2-sg.freemodel.dev") ? "responses" : "chat";
}

function readProvider(env: Partial<NodeJS.ProcessEnv>, name: "primary" | "secondary"): ProviderConfig | undefined {
  const prefix = name === "primary" ? "LLM_PRIMARY" : "LLM_SECONDARY";
  const baseUrl = env[`${prefix}_BASE_URL`]?.trim();
  const apiKey = env[`${prefix}_API_KEY`]?.trim();
  if (!baseUrl || !apiKey) return undefined;

  return {
    name,
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    reasoningStyle: inferReasoningStyle(baseUrl),
    protocol: inferProtocol(baseUrl, env[`${prefix}_PROTOCOL`]?.trim()),
  };
}

export function loadGatewayConfig(env: Partial<NodeJS.ProcessEnv> = process.env): GatewayConfig {
  const providers: GatewayConfig["providers"] = {
    primary: readProvider(env, "primary"),
    secondary: readProvider(env, "secondary"),
  };

  const slots = Object.fromEntries(
    SLOT_NAMES.map((name) => {
      const descriptor = slotEnv[name];
      const modelId = env[descriptor.model]?.trim() ?? "";
      const parsedThinking = thinkingSchema.safeParse(env[descriptor.thinking]?.trim() || (highStakes.has(name) ? "high" : "medium"));
      if (!parsedThinking.success) {
        throw new Error(`${descriptor.thinking} must be minimal, low, medium, or high`);
      }

      return [
        name,
        {
          name,
          provider: descriptor.provider,
          modelId,
          thinking: highStakes.has(name) ? "high" : parsedThinking.data,
          highStakes: highStakes.has(name),
        } satisfies SlotConfig,
      ];
    }),
  ) as Record<SlotName, SlotConfig>;

  return {
    providers,
    slots,
    dailyBudgetUsd: Number(env.LLM_DAILY_BUDGET_USD_TOTAL || 10),
    mentorDailyTokensPerUser: Number(env.LLM_MENTOR_DAILY_TOKENS_PER_USER || 20_000),
    killSwitch: env.LLM_KILL_SWITCH === "true",
  };
}

export function assertConfiguredSlot(config: GatewayConfig, slotName: SlotName): { slot: SlotConfig; provider: ProviderConfig } {
  const slot = config.slots[slotName];
  if (!slot.modelId) throw new Error(`Model ID is not configured for slot ${slotName}`);

  const provider = config.providers[slot.provider] ?? config.providers.primary;
  if (!provider) throw new Error(`No provider credentials are configured for slot ${slotName}`);

  return { slot, provider };
}
