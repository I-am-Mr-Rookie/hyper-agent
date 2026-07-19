import { describe, expect, it } from "vitest";
import { assertConfiguredSlot, loadGatewayConfig } from "@/lib/llm/config";

const env: Partial<NodeJS.ProcessEnv> = {
  LLM_PRIMARY_BASE_URL: "https://gateway.example/v1",
  LLM_PRIMARY_API_KEY: "test-placeholder-key",
  LLM_SECONDARY_BASE_URL: "https://openrouter.ai/api/v1",
  LLM_SECONDARY_API_KEY: "test-secondary-key",
  MODEL_ANALYST_ID: "model-effort-suffix-high",
  MODEL_ANALYST_THINKING: "low",
  MODEL_TESTGEN_ID: "testgen-model",
  MODEL_TESTGEN_THINKING: "high",
  MODEL_JUDGE_FEEDBACK_ID: "judge-model",
  MODEL_JUDGE_FEEDBACK_THINKING: "high",
  MODEL_MENTOR_ID: "mentor-model",
  MODEL_MENTOR_THINKING: "medium",
  MODEL_CONTENT_ID: "content-model",
  MODEL_CONTENT_THINKING: "medium",
  MODEL_LITE_ID: "lite-model",
  MODEL_LITE_THINKING: "minimal",
};

describe("LLM slot config", () => {
  it("passes model IDs through verbatim and pins high-stakes slots to high", () => {
    const config = loadGatewayConfig(env);
    expect(config.slots.analyst.modelId).toBe("model-effort-suffix-high");
    expect(config.slots.analyst.thinking).toBe("high");
    expect(config.slots.lite.thinking).toBe("minimal");
  });

  it("recognizes OpenRouter reasoning syntax", () => {
    const config = loadGatewayConfig(env);
    expect(config.providers.secondary?.reasoningStyle).toBe("openrouter");
    expect(config.providers.secondary?.protocol).toBe("chat");
  });

  it("supports explicit Responses protocol and the known FreeModel transport", () => {
    expect(loadGatewayConfig({ ...env, LLM_PRIMARY_PROTOCOL: "responses" }).providers.primary?.protocol).toBe("responses");
    expect(loadGatewayConfig({ ...env, LLM_PRIMARY_BASE_URL: "https://api-t2-sg.freemodel.dev/v1" }).providers.primary?.protocol).toBe("responses");
  });

  it("fails closed when no credentials exist", () => {
    const config = loadGatewayConfig({ MODEL_ANALYST_ID: "analyst" });
    expect(() => assertConfiguredSlot(config, "analyst")).toThrow(/No provider credentials/);
  });
});
