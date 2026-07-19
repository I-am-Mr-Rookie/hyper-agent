import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";
import { BudgetLedger } from "./budget";
import {
  assertConfiguredSlot,
  loadGatewayConfig,
  type GatewayConfig,
  type ProviderConfig,
  type SlotConfig,
  type SlotName,
} from "./config";

export interface UsageEvent {
  slot: SlotName;
  provider: string;
  modelId: string;
  promptTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedUsd: number;
  status: "success" | "error";
  errorCode?: string;
}

export interface GatewayRequest {
  slot: SlotName;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: Record<string, unknown>;
  mentorUserId?: string;
  estimatedUsd?: number;
  estimatedMentorTokens?: number;
}

export interface GatewayResponse {
  text: string;
  model: string;
  provider: string;
  reasoningFallbackUsed: boolean;
  parameterFallbacks: string[];
  usage: { promptTokens: number; outputTokens: number };
}

export interface GatewayOptions {
  config?: GatewayConfig;
  fetch?: typeof fetch;
  usageSink?: (event: UsageEvent) => Promise<void> | void;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
}

function isUnsupportedParameterError(error: unknown, names: string[]): boolean {
  if (!(error instanceof OpenAI.APIError) || error.status !== 400) return false;
  const text = `${error.message} ${JSON.stringify(error.error)}`.toLowerCase();
  const unsupported = text.includes("unknown parameter") || text.includes("unsupported parameter");
  return unsupported && names.some((name) => text.includes(name.toLowerCase()));
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return true;
  return error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
}

function withReasoning(body: Record<string, unknown>, provider: ProviderConfig, slot: SlotConfig): Record<string, unknown> {
  return provider.reasoningStyle === "openrouter"
    ? { ...body, reasoning: { effort: slot.thinking } }
    : { ...body, reasoning_effort: slot.thinking };
}

function messageContent(message: ChatCompletionMessageParam): string {
  if (typeof message.content === "string") return message.content;
  return JSON.stringify(message.content ?? "");
}

interface ProviderCallResult {
  text: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  reasoningFallbackUsed: boolean;
  parameterFallbacks: string[];
}

export class LLMGateway {
  readonly config: GatewayConfig;
  readonly budget: BudgetLedger;
  private readonly fetcher?: typeof fetch;
  private readonly usageSink: NonNullable<GatewayOptions["usageSink"]>;
  private readonly sleep: NonNullable<GatewayOptions["sleep"]>;
  private readonly timeoutMs: number;

  constructor(options: GatewayOptions = {}) {
    this.config = options.config ?? loadGatewayConfig();
    this.fetcher = options.fetch;
    this.usageSink = options.usageSink ?? (() => undefined);
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.budget = new BudgetLedger(this.config.dailyBudgetUsd, this.config.mentorDailyTokensPerUser);
  }

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    if (this.config.killSwitch) throw new Error("LLM features are disabled by LLM_KILL_SWITCH");

    const estimatedUsd = request.estimatedUsd ?? 0;
    this.budget.assertAllowed(estimatedUsd, request.slot === "mentor" ? request.mentorUserId : undefined, request.estimatedMentorTokens ?? 0);

    const { slot, provider } = assertConfiguredSlot(this.config, request.slot);
    const providers = [provider];
    for (const alternate of [this.config.providers.primary, this.config.providers.secondary]) {
      if (alternate && !providers.some((candidate) => candidate.name === alternate.name)) providers.push(alternate);
    }

    let lastError: unknown;
    for (const candidate of providers) {
      try {
        const response = await this.invokeProvider(candidate, slot, request);
        this.budget.record(estimatedUsd, request.slot === "mentor" ? request.mentorUserId : undefined, response.usage.outputTokens);
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("All configured LLM providers failed");
  }

  private async invokeProvider(provider: ProviderConfig, slot: SlotConfig, request: GatewayRequest): Promise<GatewayResponse> {
    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      maxRetries: 0,
      timeout: this.timeoutMs,
      fetch: this.fetcher,
    });

    const startedAt = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = provider.protocol === "responses"
          ? await this.invokeResponses(client, slot, request)
          : await this.invokeChat(client, provider, slot, request);

        await this.usageSink({
          slot: slot.name,
          provider: provider.name,
          modelId: slot.modelId,
          promptTokens: result.promptTokens,
          outputTokens: result.outputTokens,
          latencyMs: Date.now() - startedAt,
          estimatedUsd: request.estimatedUsd ?? 0,
          status: "success",
        });

        return {
          text: result.text,
          model: result.model,
          provider: provider.name,
          reasoningFallbackUsed: result.reasoningFallbackUsed,
          parameterFallbacks: result.parameterFallbacks,
          usage: { promptTokens: result.promptTokens, outputTokens: result.outputTokens },
        };
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt === 2) break;
        await this.sleep(250 * 2 ** attempt);
      }
    }

    await this.usageSink({
      slot: slot.name,
      provider: provider.name,
      modelId: slot.modelId,
      promptTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      estimatedUsd: 0,
      status: "error",
      errorCode: lastError instanceof OpenAI.APIError ? String(lastError.status) : "transport",
    });
    throw lastError;
  }

  private async invokeChat(client: OpenAI, provider: ProviderConfig, slot: SlotConfig, request: GatewayRequest): Promise<ProviderCallResult> {
    const baseBody: Record<string, unknown> = {
      model: slot.modelId,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_completion_tokens: request.maxOutputTokens ?? 800,
    };
    if (request.responseFormat) baseBody.response_format = request.responseFormat;

    let reasoningFallbackUsed = false;
    let completion;
    try {
      completion = await client.chat.completions.create(withReasoning(baseBody, provider, slot) as never);
    } catch (error) {
      if (!isUnsupportedParameterError(error, ["reasoning_effort", "reasoning"])) throw error;
      reasoningFallbackUsed = true;
      completion = await client.chat.completions.create(baseBody as never);
    }

    return {
      text: completion.choices[0]?.message?.content ?? "",
      model: completion.model || slot.modelId,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
      reasoningFallbackUsed,
      parameterFallbacks: reasoningFallbackUsed ? ["reasoning"] : [],
    };
  }

  private async invokeResponses(client: OpenAI, slot: SlotConfig, request: GatewayRequest): Promise<ProviderCallResult> {
    const body: Record<string, unknown> = {
      model: slot.modelId,
      input: request.messages.map((message) => ({
        role: message.role === "tool" || message.role === "function" ? "user" : message.role,
        content: [{ type: "input_text", text: messageContent(message) }],
      })),
      reasoning: { effort: slot.thinking },
      stream: true,
    };
    if (request.maxOutputTokens) body.max_output_tokens = request.maxOutputTokens;
    if (request.responseFormat) body.text = { format: request.responseFormat };

    const parameterFallbacks: string[] = [];
    let reasoningFallbackUsed = false;

    for (let parameterAttempt = 0; parameterAttempt < 3; parameterAttempt += 1) {
      try {
        const stream = await client.responses.create(body as never);
        let text = "";
        let model = slot.modelId;
        let promptTokens = 0;
        let outputTokens = 0;

        for await (const event of stream as unknown as AsyncIterable<ResponseStreamEvent>) {
          if (event.type === "response.output_text.delta") text += event.delta;
          if (event.type === "response.completed") {
            model = event.response.model || slot.modelId;
            promptTokens = event.response.usage?.input_tokens ?? 0;
            outputTokens = event.response.usage?.output_tokens ?? 0;
          }
          if (event.type === "response.failed") throw new Error(event.response.error?.message || "Responses API generation failed");
        }

        return { text, model, promptTokens, outputTokens, reasoningFallbackUsed, parameterFallbacks };
      } catch (error) {
        if ("max_output_tokens" in body && isUnsupportedParameterError(error, ["max_output_tokens"])) {
          delete body.max_output_tokens;
          parameterFallbacks.push("max_output_tokens");
          continue;
        }
        if ("reasoning" in body && isUnsupportedParameterError(error, ["reasoning"])) {
          delete body.reasoning;
          reasoningFallbackUsed = true;
          parameterFallbacks.push("reasoning");
          continue;
        }
        throw error;
      }
    }

    throw new Error("Responses API parameter fallback limit reached");
  }
}
