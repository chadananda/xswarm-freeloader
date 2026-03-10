# Article Outline: Freeloader for LangChain/LangGraph

**Target audience:** Python and JavaScript developers building LangChain or LangGraph applications who want to cut LLM costs without rewriting their chains.

**Estimated length:** 1,600–2,000 words

**SEO keywords:** LangChain free LLM, LangChain cost optimization, LangGraph Freeloader, ChatOpenAI base URL, LangChain OpenAI proxy, free LLM LangChain, LangChain Gemini free tier

---

## H2: One Line Change — Point ChatOpenAI at Freeloader

- LangChain's `ChatOpenAI` accepts a `base_url` parameter — that's all you need
- No other chain code changes required
- Works with both Python (`langchain-openai`) and JavaScript (`@langchain/openai`)

**Code example — Python:**
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",           # Freeloader aliases this to a free model
    base_url="http://localhost:4011/v1",
    api_key="free"            # required by SDK, ignored by Freeloader
)

# Your existing chain code unchanged
chain = prompt | llm | output_parser
result = chain.invoke({"topic": "quantum computing"})
```

**Code example — JavaScript:**
```js
import { ChatOpenAI } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4o",
  configuration: {
    baseURL: "http://localhost:4011/v1",
    apiKey: "free"
  }
});
```

---

## H2: Automatic Model Selection for Chain Steps

- Different chain steps have different complexity requirements
- Freeloader routes based on capability detection, not model name
- Strategy: use cheap/free models for simple steps, allow fallback to premium for complex ones
- LangGraph: assign different LLM instances to different nodes

**Code example — LangGraph with tiered models:**
```python
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph

# Free tier for lightweight steps
fast_llm = ChatOpenAI(model="gpt-3.5-turbo",
    base_url="http://localhost:4011/v1", api_key="free")

# Premium fallback for complex reasoning (Freeloader escalates automatically)
smart_llm = ChatOpenAI(model="gpt-4o",
    base_url="http://localhost:4011/v1", api_key="free")

def summarize_node(state):
    return {"summary": fast_llm.invoke(state["text"])}   # hits free tier

def reason_node(state):
    return {"analysis": smart_llm.invoke(state["summary"])}  # escalates if needed

graph = StateGraph(State)
graph.add_node("summarize", summarize_node)
graph.add_node("reason", reason_node)
```

---

## H2: Cost Tracking Per Chain Execution

- Freeloader's dashboard shows per-request cost breakdown at `http://localhost:4010`
- For per-chain tracking: use LangChain callbacks + Freeloader response headers
- Each Freeloader response includes: provider used, model used, estimated cost
- Parse these in a LangChain callback handler to accumulate chain-level cost

**Code example — custom cost callback:**
```python
from langchain.callbacks.base import BaseCallbackHandler

class FreloaderCostTracker(BaseCallbackHandler):
    def __init__(self):
        self.total_cost = 0.0
        self.calls = []

    def on_llm_end(self, response, **kwargs):
        # Freeloader adds cost metadata to response
        meta = response.generations[0][0].generation_info or {}
        cost = meta.get("estimated_cost_usd", 0)
        self.total_cost += cost
        self.calls.append({"model": meta.get("model"), "cost": cost})

tracker = FreloaderCostTracker()
llm = ChatOpenAI(base_url="http://localhost:4011/v1", api_key="free",
    callbacks=[tracker])

chain.invoke({"input": "..."}, config={"callbacks": [tracker]})
print(f"Chain cost: ${tracker.total_cost:.4f}")
print(f"Calls: {tracker.calls}")
```

---

## H2: Common LangChain Patterns and How They Work with Freeloader

- **RAG pipelines** — embedding calls can route to free providers; summarization too
- **Agents with tools** — Freeloader detects `tools` in the request and routes to capable models only
- **Structured output / JSON mode** — quality gates ensure only models supporting `response_format` are selected
- **Streaming chains** — streaming works end-to-end through Freeloader

**Code example — RAG with embeddings:**
```python
from langchain_openai import OpenAIEmbeddings

# Embeddings also route through Freeloader
embeddings = OpenAIEmbeddings(
    base_url="http://localhost:4011/v1",
    api_key="free"
)
```

---

## H2: Trust Tiers for Data Privacy in Chains

- Chains that process customer PII: use `PRIVATE` trust tier → routes to Ollama only
- Chains that process internal business data: use `STANDARD` → SOC 2 providers only
- Public-facing content chains: `OPEN` → maximizes free tier coverage

**Code example:**
```python
# Private chain — customer data stays local
private_llm = ChatOpenAI(
    base_url="http://localhost:4011/v1",
    api_key="free",
    default_headers={"X-Trust-Tier": "private"}
)
```

---

## H2: Setup and Verification

1. `npx xswarm-freeloader` — starts router
2. Add Gemini, Groq, Mistral API keys in dashboard
3. Update `base_url` in your LangChain LLM constructors
4. Run a chain, open dashboard live feed — confirm free provider is being used
5. Check cost tracking — compare against what you'd have paid

---

## Notes for Writer

- Show both Python and JS examples throughout — LangChain community is split
- Emphasize zero code changes to chain logic — only LLM constructor changes
- Include a "debugging" section: how to tell which provider was used for a given call
- Mention LangSmith compatibility (Freeloader is transparent to LangSmith tracing)
