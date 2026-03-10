# Article Outline: Top 50 LLM Tools — Freeloader Compatibility Survey

**Target audience:** Developers and teams evaluating the LLM tooling ecosystem who want to understand which tools can be cost-optimized with Freeloader.

**Estimated length:** 2,500–3,500 words (reference article format)

**SEO keywords:** best LLM tools 2024, LLM tools comparison, OpenAI compatible tools, LangChain alternatives, AI developer tools list, LLM proxy compatible tools, free AI tools, open source LLM tools

---

## H2: Introduction — The OpenAI Compatibility Lens

- Any tool that speaks the OpenAI chat completions API format can use Freeloader
- This survey categorizes 50 tools by: category, OpenAI compatibility level, and Freeloader fit
- Freeloader fit ratings: **High** (drop-in, just change base URL), **Medium** (some config needed), **Low** (different API paradigm)

---

## H2: Category 1 — IDE Assistants

**Freeloader Fit: High**
Tools that accept a custom OpenAI-compatible endpoint.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 1 | Cursor | Yes | High | Set base URL in Model settings |
| 2 | Continue.dev | Yes | High | `apiBase` in config.json |
| 3 | Cody (OSS) | Yes | High | Custom LLM provider config |
| 4 | Aider | Yes | High | `OPENAI_API_BASE` env var |
| 5 | Zed AI | Yes | High | `api_url` in settings.json |
| 6 | Void (OSS Cursor) | Yes | High | OpenAI endpoint config |
| 7 | Tabby | Partial | Medium | REST API, different schema |
| 8 | FauxPilot | Yes | High | Designed as Copilot proxy |
| 9 | Supermaven | No | Low | Proprietary API |
| 10 | GitHub Copilot | No | Low | Closed ecosystem |

**Key points to cover:**
- The open-source IDE assistants (Continue, Cody, Void) are fully configurable
- Cursor is the most popular paid IDE with Freeloader support
- GitHub Copilot and Supermaven do not expose their API endpoint for external routing

---

## H2: Category 2 — Agent Frameworks

**Freeloader Fit: High**
All major frameworks use OpenAI SDK or direct API calls.

| # | Tool | Language | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|---|
| 11 | LangChain | Python/JS | Yes | High | `base_url` in ChatOpenAI |
| 12 | LangGraph | Python/JS | Yes | High | Same as LangChain |
| 13 | CrewAI | Python | Yes | High | `llm` config with base URL |
| 14 | AutoGen | Python | Yes | High | `base_url` in OAI config |
| 15 | AutoGPT | Python | Yes | High | Config file override |
| 16 | Haystack | Python | Yes | High | `OpenAIChatGenerator` |
| 17 | DSPy | Python | Yes | High | `dspy.OpenAI` base URL |
| 18 | Semantic Kernel | C#/Python | Yes | High | OpenAI connector base URL |
| 19 | PromptFlow | Python | Yes | High | OpenAI connection config |
| 20 | BabyAGI | Python | Yes | Medium | Hardcoded in some forks |

**Key points to cover:**
- Agent frameworks are the highest-value Freeloader targets — they make many LLM calls
- CrewAI, AutoGen multi-agent setups benefit most from free tier rotation
- Cost savings compound: a 10-agent crew making 50 calls each = 500 free calls

---

## H2: Category 3 — Chat UIs

**Freeloader Fit: High**
Open-source chat frontends designed for custom backends.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 21 | Open WebUI | Yes | High | `OPENAI_API_BASE` env var |
| 22 | LobeChat | Yes | High | Custom endpoint in settings |
| 23 | LibreChat | Yes | High | Built for multi-provider |
| 24 | SillyTavern | Yes | High | OpenAI API settings panel |
| 25 | Chatbot UI (McKay) | Yes | High | `OPENAI_API_HOST` env var |
| 26 | Jan | Yes | High | Supports custom endpoints |
| 27 | Anything LLM | Yes | High | Custom LLM provider |
| 28 | Flowise | Yes | High | ChatOpenAI node config |
| 29 | Dify | Yes | High | OpenAI-compatible model |
| 30 | Perplexica | Partial | Medium | Search-focused, some limits |

**Key points to cover:**
- Chat UIs are often self-hosted — Freeloader sits between UI and cloud providers
- Open WebUI + Freeloader = zero-cost self-hosted ChatGPT alternative
- LibreChat already supports multi-provider but lacks free tier rotation

---

## H2: Category 4 — Dev Tools

**Freeloader Fit: Medium**
Tools with LLM integration where endpoint is configurable but not always obvious.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 31 | Claude Code | Yes | High | `OPENAI_BASE_URL` env var |
| 32 | GitHub Copilot CLI | No | Low | Closed API |
| 33 | Tabnine | No | Low | Proprietary |
| 34 | CodeGeeX | Partial | Medium | Some OpenAI compat modes |
| 35 | Sweep (AI PRs) | Yes | Medium | Config needed |

---

## H2: Category 5 — RAG / Search Tools

**Freeloader Fit: High**
RAG tools use OpenAI-compatible LLM and embedding calls.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 36 | PrivateGPT | Yes | High | Designed for local/custom LLMs |
| 37 | GPT4All | Yes | High | Custom server mode |
| 38 | Verba (Weaviate) | Yes | High | OpenAI generator |
| 39 | Cognita | Yes | High | ChatOpenAI base URL |
| 40 | Quivr | Yes | High | OpenAI endpoint config |

---

## H2: Category 6 — Automation / No-Code

**Freeloader Fit: Medium**
Automation tools have LLM nodes but may not expose base URL.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 41 | n8n | Yes | Medium | HTTP request node workaround |
| 42 | Zapier AI | No | Low | Managed service |
| 43 | Make (Integromat) | Partial | Low | Module limitations |
| 44 | Activepieces | Yes | Medium | Custom HTTP action |
| 45 | Langflow | Yes | High | OpenAI component base URL |

---

## H2: Category 7 — Content / Marketing Tools

**Freeloader Fit: Low**
Managed SaaS tools with no API endpoint exposure.

| # | Tool | OpenAI Compatible | Freeloader Fit | Notes |
|---|---|---|---|---|
| 46 | Jasper | No | Low | Managed SaaS |
| 47 | Copy.ai | No | Low | Managed SaaS |
| 48 | Writesonic | No | Low | Managed SaaS |
| 49 | Notion AI | No | Low | Embedded, no config |
| 50 | Perplexity AI | No | Low | Proprietary |

---

## H2: Summary — Freeloader Compatibility by Category

| Category | Tools | High Fit | Medium Fit | Low Fit |
|---|---|---|---|---|
| IDE Assistants | 10 | 8 | 1 | 1 |
| Agent Frameworks | 10 | 9 | 1 | 0 |
| Chat UIs | 10 | 9 | 1 | 0 |
| Dev Tools | 5 | 2 | 1 | 2 |
| RAG / Search | 5 | 5 | 0 | 0 |
| Automation | 5 | 1 | 3 | 1 |
| Content / Marketing | 5 | 0 | 0 | 5 |
| **Total** | **50** | **34** | **7** | **9** |

**Key takeaway:** 34 of the top 50 LLM tools support Freeloader with a simple base URL change. The tools that don't support it are typically managed SaaS products with no API endpoint exposure.

---

## H2: How to Check Any Tool for Freeloader Compatibility

Quick checklist:
1. Does it use the OpenAI Python SDK or JS SDK? → High likelihood
2. Does it accept `OPENAI_API_BASE` or `base_url` as a config? → Yes
3. Does it make direct HTTP requests to `api.openai.com`? → Check if URL is configurable
4. Is it a managed SaaS with no self-hosting? → Likely not compatible

---

## Notes for Writer

- This is a reference/survey article — scannable tables are the core value
- Keep tool descriptions brief (one line max per tool)
- Include a "how we tested" methodology note
- Add links to each tool's documentation for the relevant config setting
- Refresh annually — ecosystem moves fast
- Consider a companion GitHub repo with tested configs for each High-fit tool
