# Article Outline: Freeloader for Vercel AI SDK

**Target audience:** Next.js developers using the Vercel AI SDK to build AI-powered web applications who want to eliminate or drastically reduce LLM backend costs.

**Estimated length:** 1,600–2,000 words

**SEO keywords:** Vercel AI SDK free LLM, Next.js AI chatbot free, Vercel AI Freeloader, OpenAI SDK proxy Next.js, free AI chatbot backend, Vercel AI cost reduction, streaming AI Next.js free

---

## H2: The $0 AI Chatbot Backend — Is It Real?

- Vercel AI SDK makes it easy to build streaming chat apps
- The hidden cost: every chat message hits OpenAI at $2.50–$15/M tokens
- With Freeloader: route to Gemini Flash (free), Groq (free), Cerebras (free) instead
- Use case: internal tools, demos, low-traffic production apps can run at $0/month
- Higher-traffic apps: use budget caps to set a firm monthly ceiling

---

## H2: Next.js AI Chatbot with $0 Backend

**Code example — route handler (Next.js App Router):**
```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Point Vercel AI SDK at Freeloader
const freeloader = createOpenAI({
  baseURL: "http://localhost:4011/v1",
  apiKey: "free"
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: freeloader("gpt-4o"),   // Freeloader routes to best free model
    messages,
  });
  return result.toDataStreamResponse();
}
```

**Code example — client component:**
```tsx
// app/page.tsx
"use client";
import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  return (
    <div>
      {messages.map(m => <div key={m.id}>{m.role}: {m.content}</div>)}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

- No other changes needed — streaming, tool calls, and structured output all work
- Freeloader is transparent to the Vercel AI SDK

---

## H2: Streaming Through Freeloader

- Freeloader supports SSE streaming end-to-end
- Response headers: `Content-Type: text/event-stream`, `Transfer-Encoding: chunked`
- Works with `streamText`, `streamObject`, and `useChat` / `useCompletion` hooks
- No buffering — Freeloader pipes provider stream directly to client

**Code example — streaming with tool calls:**
```ts
const result = await streamText({
  model: freeloader("gpt-4o"),
  messages,
  tools: {
    getWeather: tool({
      description: "Get current weather",
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => fetchWeather(location)
    })
  }
});
// Freeloader detects tools in request, routes to capable models only
```

---

## H2: Per-User Budget Controls

- Freeloader supports per-app budget caps configured in dashboard
- For multi-tenant apps: create a Freeloader "app" per user account
- Each app gets its own API key and budget limit

**Architecture diagram description:**
```
User A → request with X-App-Id: user-a → Freeloader checks budget for user-a → routes if under cap
User B → request with X-App-Id: user-b → Freeloader checks budget for user-b → routes if under cap
```

**Code example — per-user app key in Next.js:**
```ts
// Generate per-user Freeloader app key at user creation time
// Store in your database alongside the user record

export async function POST(req: Request) {
  const session = await getServerSession();
  const userAppKey = await db.user.findUnique({
    where: { id: session.user.id },
    select: { freloaderAppKey: true }
  });

  const freeloader = createOpenAI({
    baseURL: "http://localhost:4011/v1",
    apiKey: userAppKey.freloaderAppKey   // routes to user's budget
  });

  const result = await streamText({
    model: freeloader("gpt-4o"),
    messages: await req.json().then(b => b.messages),
  });
  return result.toDataStreamResponse();
}
```

---

## H2: Handling Free Tier Exhaustion Gracefully

- When all free providers hit daily limits, Freeloader falls back to cheapest paid
- For $0 budget enforcement: set hard cap in dashboard → Freeloader returns 429 when exceeded
- Handle 429 in Next.js route:

**Code example:**
```ts
try {
  const result = await streamText({ model: freeloader("gpt-4o"), messages });
  return result.toDataStreamResponse();
} catch (error) {
  if (error.status === 429) {
    return new Response(JSON.stringify({
      error: "Daily AI limit reached. Try again tomorrow."
    }), { status: 429, headers: { "Content-Type": "application/json" } });
  }
  throw error;
}
```

---

## H2: Environment Configuration for Development vs. Production

**Code example — environment-aware Freeloader config:**
```ts
const freeloader = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "http://localhost:4011/v1",
  apiKey: process.env.LLM_API_KEY ?? "free"
});
```

```bash
# .env.local (development — routes through local Freeloader)
LLM_BASE_URL=http://localhost:4011/v1
LLM_API_KEY=free

# .env.production (team server with Freeloader installed)
LLM_BASE_URL=http://your-server:4011/v1
LLM_API_KEY=your-freeloader-app-key
```

- Freeloader can run on a shared team server — all devs share the free tier pool
- Or self-host on a $5/month VPS for team use

---

## H2: What You Can't Do for Free (and What You Can)

**Table:**
| Use Case | Free Models | Notes |
|---|---|---|
| General chatbot | Yes | Gemini Flash, Groq |
| Code assistant | Yes | DeepSeek, Gemini |
| Structured output (JSON) | Mostly | Check model support |
| Tool calling / function calling | Mostly | Freeloader quality gates filter |
| Long context (>32K tokens) | Limited | Gemini 1.5 Flash has 1M ctx |
| Image input (vision) | Limited | Gemini Flash supports vision |
| Real-time voice | No | Use dedicated voice APIs |

---

## Notes for Writer

- Tone: Next.js developer tutorial, assumes knowledge of App Router
- Include a "deploy to production" section — Freeloader on a VPS vs. local
- Add warning: local Freeloader on localhost is not accessible from Vercel's edge runtime — need a server
- Link to Vercel AI SDK docs for reference
- Consider a "zero to deployed" timeline: setup takes < 5 minutes
