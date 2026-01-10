# AI/LLM API Patterns

## Overview

AI APIs look like normal HTTP APIs, but they behave differently in ways that matter for production:

- Responses can be streamed token-by-token.
- Cost and limits are often based on tokens, not only requests.
- Models have strict context windows that shape request size and error modes.
- Safety enforcement can block or transform outputs.
- Some operations (image generation, fine-tuning, batch inference) are long-running.

This guide documents common HTTP/JSON patterns used by modern AI providers (not tied to any SDK). It focuses on stable contracts, predictable client UX, and operational safety.

## Design Goals

A production AI API should make these things true:

- **Predictable contracts**: clients can rely on stable schemas and clear state transitions.
- **Good UX**: clients can stream output, show progress, and recover from interruptions.
- **Clear metering**: clients can understand usage and cost drivers.
- **Safe operation**: moderation and policy enforcement are consistent and auditable.
- **Operational visibility**: requests can be traced and failures are debuggable.

## Core Request/Response Shape

Most text-generation APIs follow a small set of primitives:

- A **model** identifier
- A list of **messages** (or an input string)
- Optional **generation parameters** (temperature, max tokens)
- Optional **streaming**
- A response with an **id**, **output**, **finish reason**, and **usage**

### Example: Synchronous Chat Completion

```http
POST /v1/chat/completions HTTP/1.1
Content-Type: application/json

{
  "model": "gpt-4.1",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Write a 3-bullet summary of HTTP caching."}
  ],
  "temperature": 0.2,
  "max_tokens": 200
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "chatcmpl_123",
  "object": "chat.completion",
  "created": 1736467200,
  "model": "gpt-4.1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "- Cache-Control controls how responses are stored and reused.\n- ETags enable efficient validation with If-None-Match.\n- Use private vs public caches based on user-specific content."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 65,
    "total_tokens": 185
  }
}
```

Notes:

- Keep request options explicit and bounded. Prefer server-side defaults over many client knobs.
- Always return a stable `id` so clients can log and correlate behavior.

## 1) Streaming Responses for LLMs

Streaming improves latency and perceived responsiveness. Modern AI APIs commonly support two wire formats:

- **Server-Sent Events (SSE)** over `text/event-stream`
- **NDJSON** over `application/x-ndjson`

Use streaming when:

- The output is long and users benefit from incremental updates.
- The server can start generating before the full result is ready.
- Clients can handle partial output and reconnection.

### Server-Sent Events (SSE) Pattern

SSE is a one-way stream (server → client) over HTTP. It works well for incremental text output.

```http
POST /v1/chat/completions HTTP/1.1
Content-Type: application/json
Accept: text/event-stream

{
  "model": "gpt-4.1",
  "messages": [
    {"role": "user", "content": "Explain idempotency in one paragraph."}
  ],
  "stream": true
}

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"id":"chatcmpl_123","choices":[{"delta":{"content":"Idempotency "}}]}

data: {"id":"chatcmpl_123","choices":[{"delta":{"content":"means that repeating "}}]}

data: {"id":"chatcmpl_123","choices":[{"delta":{"content":"the same request "}}]}

data: {"id":"chatcmpl_123","choices":[{"delta":{"content":"has the same effect."}}]}

data: [DONE]
```

Recommended behaviors:

- **Stable stream item schema**: each `data:` line should be valid JSON (except a final sentinel like `[DONE]`).
- **Heartbeat**: send occasional keep-alive events for long pauses to prevent idle timeouts.
- **Cancellation**: treat client disconnect as cancellation; avoid charging for work not delivered when possible.
- **End-of-stream contract**: define how clients detect completion (sentinel event, explicit `event: done`, or terminal object).

### NDJSON Streaming Pattern

NDJSON is newline-delimited JSON. Each line is a self-contained JSON object.

```http
POST /v1/chat/completions HTTP/1.1
Content-Type: application/json
Accept: application/x-ndjson

{
  "model": "gpt-4.1",
  "messages": [
    {"role": "user", "content": "Give three examples of safe HTTP methods."}
  ],
  "stream": true
}

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked

{"type":"response.delta","id":"resp_123","delta":{"content":"Safe methods include GET"}}
{"type":"response.delta","id":"resp_123","delta":{"content":", HEAD, and OPTIONS."}}
{"type":"response.completed","id":"resp_123","finish_reason":"stop","usage":{"prompt_tokens":40,"completion_tokens":22,"total_tokens":62}}
```

NDJSON design tips:

- Include a `type` field so clients can handle multiple event kinds.
- Send a final terminal object that includes `finish_reason` and (if available) `usage`.

### Streaming Errors

A streaming response still needs an error strategy. Common options:

- **Fail fast** before starting the stream (return a normal non-2xx response).
- **Emit an error event** and close the stream (for errors discovered mid-stream).

Example SSE error event:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: error
data: {"type":"https://api.example.com/problems/model-overloaded","title":"Model overloaded","status":503,"detail":"Try again later."}

event: done
data: {"id":"chatcmpl_123","status":"failed"}
```

## 2) Token-Based Billing

Many AI APIs meter usage by tokens (or token-like units). The API should make usage visible and consistent.

### Usage Tracking

Return usage in the response body. Do not require clients to estimate it from text length.

```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 50,
    "total_tokens": 200,
    "cost": {
      "currency": "USD",
      "amount": "0.006"
    }
  }
}
```

Guidelines:

- Treat `cost` as optional and provider-defined. If present, prefer exact values rather than estimates.
- For streaming, include `usage` in the final message/event.
- If you offer cached inputs or discounted tiers, include fields that explain what was billed.

### Token Rate Limits

Token-based limits are usually separate from request-per-minute limits. Prefer explicit headers.

```http
HTTP/1.1 200 OK
X-RateLimit-Requests-Limit: 3000
X-RateLimit-Requests-Remaining: 2997
X-RateLimit-Requests-Reset: 60

X-RateLimit-Tokens-Limit: 100000
X-RateLimit-Tokens-Remaining: 95000
X-RateLimit-Tokens-Reset: 60
```

If a limit is exceeded, use `429 Too Many Requests` and include a retry hint.

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 10

{
  "type": "https://api.example.com/problems/rate-limit-exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Token rate limit exceeded. Try again in 10 seconds.",
  "context": {
    "limit": 100000,
    "remaining": 0,
    "reset_seconds": 10
  }
}
```

## 3) Context Window Handling

Models have a fixed context window (input + output). This is a hard constraint that affects API behavior.

### Recommended Request Controls

Support a clear way for clients to control truncation and output budgeting.

```http
POST /v1/chat/completions HTTP/1.1
Content-Type: application/json

{
  "model": "gpt-4.1",
  "messages": [
    {"role": "user", "content": "...long conversation..."}
  ],
  "max_tokens": 800,
  "context": {
    "max_input_tokens": 4096,
    "truncation": {
      "strategy": "fifo"
    }
  }
}
```

Common truncation strategies:

- **FIFO**: drop oldest messages first.
- **Importance-based**: keep system and pinned messages; drop less important content.
- **Summarization**: replace older context with a summary (server-generated or client-provided).

### Context APIs (Optional)

If you offer server-managed conversations, you may also offer explicit context operations.

```http
POST /v1/conversations/conv_123/context HTTP/1.1
Content-Type: application/json

{
  "strategy": "summarize",
  "max_tokens": 4096
}

HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "operationId": "op_987",
  "status": "PROCESSING",
  "poll_url": "/v1/operations/op_987"
}
```

### Context Length Exceeded Error

If the request cannot fit even after applying the declared truncation policy, return a structured error.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/context-length-exceeded",
  "title": "Context length exceeded",
  "status": 400,
  "detail": "The request exceeds the model context window.",
  "context": {
    "max_tokens": 8192,
    "requested_tokens": 10500,
    "max_output_tokens": 800
  }
}
```

## 4) Prompt Versioning

Prompts behave like code: they change, they regress, and they need rollback. Treat prompts as versioned artifacts.

Design goals for prompt management:

- **Immutability by version**: a prompt version should not change after publication.
- **Traceability**: responses should be attributable to a prompt id/version.
- **Safe rollout**: you can test and gradually deploy prompt changes.

### Prompt Template Representation

```json
{
  "id": "greeting-prompt",
  "version": "2.0.0",
  "status": "active",
  "template": "You are a helpful assistant. {{instructions}}",
  "variables": [
    {"name": "instructions", "required": true, "type": "string"}
  ],
  "model_config": {
    "temperature": 0.7,
    "max_tokens": 500
  },
  "createdAt": "2025-01-05T12:00:00Z"
}
```

### Prompt APIs

A minimal prompt API usually supports:

- Fetch a prompt by id and version (or the active version)
- Render a prompt with variables
- Validate that variables are present and typed correctly

```http
GET /v1/prompts/greeting-prompt?version=2.0.0 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "greeting-prompt",
  "version": "2.0.0",
  "template": "You are a helpful assistant. {{instructions}}",
  "variables": [
    {"name": "instructions", "required": true, "type": "string"}
  ]
}
```

```http
POST /v1/prompts/greeting-prompt/render HTTP/1.1
Content-Type: application/json

{
  "version": "2.0.0",
  "variables": {
    "instructions": "Help with coding"
  }
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "rendered": "You are a helpful assistant. Help with coding"
}
```

Prompt versioning in generation requests:

```json
{
  "prompt": {
    "id": "greeting-prompt",
    "version": "2.0.0"
  },
  "variables": {
    "instructions": "Help with coding"
  }
}
```

## 5) Model Selection

Providers typically expose a model catalog. Clients use it to discover capabilities and constraints.

### Model Catalog

```http
GET /v1/models HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "gpt-4.1",
      "name": "GPT-4.1",
      "status": "available",
      "context_window": 8192,
      "max_output_tokens": 2048,
      "input_cost_per_1k_tokens": 0.03,
      "output_cost_per_1k_tokens": 0.06,
      "capabilities": ["chat", "tools"],
      "deprecation": {
        "is_deprecated": false
      }
    }
  ]
}
```

Model selection guidelines:

- Prefer **server-side policy**: allowlists per tenant, default models, and guardrails.
- Keep the catalog **stable**: avoid breaking field changes. Add fields instead.
- If you deprecate models, include dates and migration guidance in metadata.

## 6) Function Calling / Tools

Tool calling lets a model request structured actions (search, database lookup, calculations). The API contract should separate:

- **Tool definitions**: what tools exist and their JSON schema
- **Tool calls**: what the model asks to run (with arguments)
- **Tool results**: what the tool returned (as data, not prose)

### Tool Definition

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather.",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {"type": "string"},
            "units": {"type": "string", "enum": ["metric", "imperial"]}
          },
          "required": ["location"]
        }
      }
    }
  ]
}
```

### Tool Call (Model Output)

```json
{
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"location\":\"San Francisco\",\"units\":\"metric\"}"
      }
    }
  ]
}
```

### Tool Result (Client Input)

Tool results are usually returned as a message with role `tool` (or an equivalent structure).

```json
{
  "role": "tool",
  "tool_call_id": "call_123",
  "content": {
    "location": "San Francisco",
    "temperature_c": 14,
    "conditions": "Cloudy"
  }
}
```

Tool calling safety rules:

- **Allowlist tools** per tenant and per endpoint.
- Enforce **timeouts**, payload size limits, and argument validation.
- Treat tool outputs as untrusted input; do not assume they are safe to echo.

## 7) Conversation Management

AI interactions may be stateless or stateful.

- **Stateless**: client sends the full message list each request.
- **Stateful**: server stores conversation state and exposes a conversation resource.

### Stateful Conversation API

```http
POST /v1/conversations HTTP/1.1
Content-Type: application/json

{
  "metadata": {
    "customerId": "cust_123"
  }
}

HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/conversations/conv_123

{
  "id": "conv_123",
  "createdAt": "2025-01-05T12:00:00Z",
  "message_count": 0,
  "links": {
    "self": "/v1/conversations/conv_123",
    "messages": "/v1/conversations/conv_123/messages"
  }
}
```

```http
POST /v1/conversations/conv_123/messages HTTP/1.1
Content-Type: application/json

{
  "role": "user",
  "content": "Help me name a REST resource for invoices."
}

HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "msg_001",
  "role": "user",
  "content": "Help me name a REST resource for invoices.",
  "createdAt": "2025-01-05T12:01:00Z"
}
```

Message structure guideline:

```json
{
  "role": "user|assistant|system|tool",
  "content": "string or structured content",
  "name": "optional_name",
  "tool_call_id": "if_tool_response"
}
```

Operational considerations:

- Define **retention** rules (how long conversations are stored).
- Support **deletion**.
- If messages are append-only, document concurrency behavior (what happens if two clients post at once).

## 8) Error Handling for AI

AI APIs should use a consistent problem format. For HTTP APIs, `application/problem+json` (RFC 9457) is a common baseline.

### Common AI-Specific Error Types

- Context length exceeded
- Content policy violation
- Model overloaded / temporarily unavailable
- Token-based rate limit exceeded
- Invalid prompt or invalid tool schema

### Example Error Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/context-length-exceeded",
  "title": "Context length exceeded",
  "status": 400,
  "detail": "Prompt exceeds model context window.",
  "instance": "/v1/chat/completions",
  "context": {
    "max_tokens": 8192,
    "requested_tokens": 10500
  }
}
```

Suggested status codes:

- `400 Bad Request`: invalid inputs, malformed schema
- `401 Unauthorized`: missing/invalid authentication
- `403 Forbidden`: not allowed for this tenant/model
- `413 Payload Too Large`: request is too large to accept
- `422 Unprocessable Entity`: inputs are valid JSON but violate semantic rules
- `429 Too Many Requests`: request or token rate limit
- `503 Service Unavailable`: model overloaded or dependency outage

## 9) Safety and Moderation

Safety enforcement can be modeled as:

- A **moderation endpoint** (pre-check)
- **Inline enforcement** during generation (block, refuse, or transform)
- **Post-check** for outputs (audit, redact, or re-run)

### Moderation Endpoint

```http
POST /v1/moderations HTTP/1.1
Content-Type: application/json

{
  "input": "text to check"
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "flagged": false,
  "categories": {
    "hate": false,
    "violence": false,
    "self_harm": false
  },
  "scores": {
    "hate": 0.01,
    "violence": 0.02,
    "self_harm": 0.00
  }
}
```

### Content Policy Violation Error

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/content-policy-violation",
  "title": "Content policy violation",
  "status": 400,
  "detail": "The request content is not allowed by policy.",
  "context": {
    "policy": "default",
    "categories": ["self_harm"]
  }
}
```

Guidelines:

- Be explicit about whether the API **blocks**, **refuses**, **redacts**, or **rewrites** content.
- Avoid leaking sensitive policy details. Provide enough context for client UX, not for evasion.

## 10) Async Processing

Some AI operations are too slow for a single request/response:

- Image generation
- Large document processing
- Batch inference
- Fine-tuning and evaluation

Use an async pattern with `202 Accepted` and a status resource.

### Long-Running Generation

```http
POST /v1/generations HTTP/1.1
Content-Type: application/json

{
  "model": "image-gen-1",
  "prompt": "A sunset over mountains",
  "size": "1024x1024"
}

HTTP/1.1 202 Accepted
Content-Type: application/json
Location: /v1/generations/gen_123

{
  "id": "gen_123",
  "status": "processing",
  "poll_url": "/v1/generations/gen_123"
}
```

```http
GET /v1/generations/gen_123 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "gen_123",
  "status": "completed",
  "result": {
    "media_type": "image/png",
    "url": "https://cdn.example.com/generated/gen_123.png",
    "expiresAt": "2025-01-06T12:05:00Z"
  }
}
```

Async generation guidelines:

- Define a small state machine (`queued`, `processing`, `completed`, `failed`, `cancelled`).
- Provide cancellation if work can be stopped.
- Make result URLs time-limited when they point to external storage.

## Industry Pattern Alignment (Non-Normative)

These patterns are common across modern providers:

- OpenAI APIs (chat, responses, tool calling, streaming)
- Anthropic APIs (messages, streaming, tool use)
- Google Gemini APIs (generation, streaming)
- Hugging Face inference APIs (hosted model inference)

Use the patterns above as a compatibility baseline, but keep your API contract provider-neutral and explicit.
