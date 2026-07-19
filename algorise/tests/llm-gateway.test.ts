import { describe, expect, it, vi } from "vitest";
import { LLMGateway, loadGatewayConfig } from "@/lib/llm";

function testEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): Partial<NodeJS.ProcessEnv> {
  return {
    LLM_PRIMARY_BASE_URL: "https://primary.example/v1",
    LLM_PRIMARY_API_KEY: "test-key",
    LLM_SECONDARY_BASE_URL: "https://secondary.example/v1",
    LLM_SECONDARY_API_KEY: "test-key-2",
    MODEL_ANALYST_ID: "gpt-test-verbatim-high",
    MODEL_ANALYST_THINKING: "high",
    MODEL_TESTGEN_ID: "gpt-test",
    MODEL_TESTGEN_THINKING: "high",
    MODEL_JUDGE_FEEDBACK_ID: "gpt-test",
    MODEL_JUDGE_FEEDBACK_THINKING: "high",
    MODEL_MENTOR_ID: "gpt-test",
    MODEL_MENTOR_THINKING: "medium",
    MODEL_CONTENT_ID: "gpt-test",
    MODEL_CONTENT_THINKING: "medium",
    MODEL_LITE_ID: "gpt-test-lite",
    MODEL_LITE_THINKING: "minimal",
    ...overrides,
  };
}

function completion(model = "gpt-test-verbatim-high") {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      created: 1,
      model,
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "ok" } }],
      usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function responsesStream(model = "gpt-test-verbatim-high") {
  const events = [
    { type: "response.output_text.delta", delta: "ok", item_id: "item-test", output_index: 0, content_index: 0, sequence_number: 1 },
    { type: "response.completed", sequence_number: 2, response: { id: "resp-test", object: "response", created_at: 1, status: "completed", model, output: [], usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 } } },
  ];
  return new Response(events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("LLMGateway", () => {
  it("strips a rejected reasoning parameter and retries exactly once", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (bodies.length === 1) {
        return new Response(JSON.stringify({ error: { message: "Unknown parameter: reasoning_effort", type: "invalid_request_error" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      return completion();
    }) as unknown as typeof fetch;

    const gateway = new LLMGateway({ config: loadGatewayConfig(testEnv()), fetch: fetchMock, sleep: async () => undefined });
    const result = await gateway.invoke({ slot: "analyst", messages: [{ role: "user", content: "ping" }] });

    expect(result.text).toBe("ok");
    expect(result.reasoningFallbackUsed).toBe(true);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].reasoning_effort).toBe("high");
    expect(bodies[1]).not.toHaveProperty("reasoning_effort");
    expect(bodies[1].model).toBe("gpt-test-verbatim-high");
  });

  it("streams the Responses protocol and strips a rejected output-token parameter", async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      bodies.push(body);
      if (body.max_output_tokens) {
        return new Response(JSON.stringify({ error: { message: "Unsupported parameter: max_output_tokens", type: "invalid_request_error" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      return responsesStream();
    }) as unknown as typeof fetch;

    const config = loadGatewayConfig(testEnv({ LLM_PRIMARY_PROTOCOL: "responses" }));
    const gateway = new LLMGateway({ config, fetch: fetchMock, sleep: async () => undefined });
    const result = await gateway.invoke({ slot: "analyst", messages: [{ role: "user", content: "ping" }], maxOutputTokens: 16 });

    expect(result.text).toBe("ok");
    expect(result.parameterFallbacks).toEqual(["max_output_tokens"]);
    expect(result.reasoningFallbackUsed).toBe(false);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].reasoning).toEqual({ effort: "high" });
    expect(bodies[1]).not.toHaveProperty("max_output_tokens");
  });

  it("fails over to the secondary provider after primary retry exhaustion", async () => {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("primary.example")) {
        return new Response(JSON.stringify({ error: { message: "upstream unavailable", type: "server_error" } }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
      return completion();
    }) as unknown as typeof fetch;

    const gateway = new LLMGateway({ config: loadGatewayConfig(testEnv()), fetch: fetchMock, sleep: async () => undefined });
    const result = await gateway.invoke({ slot: "analyst", messages: [{ role: "user", content: "ping" }] });

    expect(result.provider).toBe("secondary");
    expect(urls.filter((url) => url.includes("primary.example"))).toHaveLength(3);
    expect(urls.some((url) => url.includes("secondary.example"))).toBe(true);
  });

  it("degrades closed when the kill switch is active", async () => {
    const gateway = new LLMGateway({ config: loadGatewayConfig(testEnv({ LLM_KILL_SWITCH: "true" })) });
    await expect(gateway.invoke({ slot: "analyst", messages: [{ role: "user", content: "ping" }] })).rejects.toThrow(/kill_switch/i);
  });
});
