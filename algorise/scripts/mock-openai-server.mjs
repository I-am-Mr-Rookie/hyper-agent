import { createServer } from "node:http";

const port = Number(process.env.MOCK_OPENAI_PORT || 4010);
const rejected = new Set();

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/v1/models") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ object: "list", data: [{ id: "local-smoke-model", object: "model" }] }));
    return;
  }
  if (request.method !== "POST" || !["/v1/chat/completions", "/v1/responses"].includes(request.url || "")) {
    response.writeHead(404).end();
    return;
  }

  let raw = "";
  for await (const chunk of request) raw += chunk;
  const body = JSON.parse(raw || "{}");

  if (request.url === "/v1/responses") {
    if (body.max_output_tokens) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Unsupported parameter: max_output_tokens", type: "invalid_request_error" } }));
      return;
    }
    const responseId = `resp-local-${Date.now()}`;
    const events = [
      { type: "response.output_text.delta", delta: "LOCAL_SMOKE_OK", item_id: "item-local", output_index: 0, content_index: 0, sequence_number: 1 },
      { type: "response.completed", sequence_number: 2, response: { id: responseId, object: "response", created_at: Math.floor(Date.now() / 1000), status: "completed", model: body.model, output: [], usage: { input_tokens: 5, output_tokens: 3, total_tokens: 8 } } },
    ];
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    response.end(events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""));
    return;
  }

  const key = `${body.model}:${body.messages?.[0]?.content || ""}`;
  if ((body.reasoning_effort || body.reasoning) && !rejected.has(key)) {
    rejected.add(key);
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "Unknown parameter: reasoning_effort", type: "invalid_request_error" } }));
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    id: `local-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model,
    choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "LOCAL_SMOKE_OK" } }],
    usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
  }));
});

server.listen(port, "127.0.0.1", () => console.log(`Local OpenAI-compatible smoke server listening on http://127.0.0.1:${port}/v1`));
