# Article Outline: The $0 AI Stack

**Format:** Dual-use — 5-minute YouTube tutorial script + 2,000-word written article

**Target audience:** Developers, indie hackers, and startups who are shocked by their AI bills and want a practical path to zero (or near-zero) cost.

**Estimated length:** 2,000 words (written) / ~7 minutes (video at 280 words/min)

**SEO keywords:** zero dollar AI stack, free AI API 2024, Gemini free tier, Groq free API, free LLM API, reduce AI costs, free ChatGPT alternative API, $0 AI development

---

## SECTION 1: Cold Open — The Horrifying Bill

**Video script tone:** Casual, slightly dramatic, relatable

**Written hook:**
> "Last month I got an AWS bill for $340. The month before: $287. The month before that: $198. The crime? I forgot to add rate limits to a single API endpoint."

**Key beats:**
- Show a real-looking (anonymized) OpenAI billing screenshot: $200–400/month
- Break down where the money went: GPT-4o at $2.50/M input, $10/M output
- The twist: most of those calls were for tasks that a free model could handle
- "What if I told you that you can get 90% of the same results for $0?"

**Video visual suggestion:** Screen recording of billing dashboard with audio of audible gasp

---

## SECTION 2: Install Freeloader in 30 Seconds

**One command:**
```bash
npx xswarm-freeloader
```

**What happens (script narration):**
- Downloads and installs the router
- Sets up a SQLite database in `~/.xswarm/`
- Syncs the model catalog (127 models)
- Starts the router on port 4011
- Starts the dashboard on port 4010
- Starts a pm2 process manager so it survives reboots

**Video visual:** Fast terminal recording showing the install output

**Written article — what each piece does:**
- Router (:4011) — OpenAI-compatible API endpoint your apps connect to
- Dashboard (:4010) — web UI for configuration, monitoring, and cost reports
- Database — stores usage data, budget state, provider health locally

---

## SECTION 3: Configure 5 Free Providers in 2 Minutes

**Narration:** "Now let's load up on free tiers. Each of these takes about 20 seconds."

### The 5 Providers (with sign-up links and tier details):

**1. Gemini (Google AI Studio)**
- Sign up: aistudio.google.com → Get API key
- Free tier: 15 RPM, 1M TPM (Gemini 1.5 Flash), no credit card
- Best for: general tasks, long context, vision

**2. Groq**
- Sign up: console.groq.com
- Free tier: 30 RPM, 6K RPD (varies by model)
- Best for: speed — 500+ tokens/second

**3. Cerebras**
- Sign up: cloud.cerebras.ai
- Free tier: research tier available
- Best for: fastest inference on large models

**4. Mistral (La Plateforme)**
- Sign up: console.mistral.ai
- Free tier: trial credits, then Codestral free for code tasks
- Best for: European data residency, coding

**5. SambaNova**
- Sign up: cloud.sambanova.ai
- Free tier: API access to Llama models
- Best for: Llama 3.x at scale

**Code example — after adding all 5 keys in dashboard:**
```
Dashboard → Accounts → Add Provider

Provider: Google (Gemini)
API Key: AIza...
Status: Connected ✓ (15 RPM free tier)

Provider: Groq
API Key: gsk_...
Status: Connected ✓ (30 RPM free tier)

... (repeat for each)
```

---

## SECTION 4: Run 100 Requests, Watch the Routing

**Narration:** "Alright, let's make some requests and watch Freeloader work."

**Code example — test script:**
```js
// test-100.js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:4011/v1',
  apiKey: 'free'
});

async function runBatch() {
  const prompts = [
    "Summarize the French Revolution in 2 sentences.",
    "Write a haiku about JavaScript.",
    "What's the capital of Australia?",
    // ... 97 more
  ];

  for (const prompt of prompts) {
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }]
    });
    console.log(`[${res.model}] ${res.choices[0].message.content.slice(0, 60)}...`);
  }
}

runBatch();
```

**Expected output (narrated):**
```
[gemini-1.5-flash] The French Revolution was a period of radical...
[llama-3.1-70b-versatile] old JavaScript code / breaks in modern browsers...
[gemini-1.5-flash] Canberra is the capital of Australia...
[mixtral-8x7b] ...
```

**Video visual:** Live terminal showing requests routing to different providers

**Dashboard view:** Live feed tab showing request stream, provider distribution

---

## SECTION 5: The $0.00 Reveal

**Script:**
> "100 requests. Let's check the bill."

**Dashboard — Cost Summary view:**
```
Requests: 100
Tokens used: ~45,000
Providers used: Gemini (62), Groq (24), Cerebras (14)
Estimated cost if using OpenAI GPT-4o: $0.28
Actual cost: $0.00
Savings: 100%
```

**Written article callout:** "The dashboard shows you exactly what you would have spent versus what you actually spent. For 100 requests, that's nothing. But for 10,000 requests a month? That's $28 saved. For 100,000? $280."

---

## SECTION 6: Advanced Tips — The Named Strategies

### "The Gemini Gambit"
- Use Gemini 1.5 Flash for all long-context tasks (1M token context window, free)
- Pass very long documents — Gemini handles what GPT-4o charges a fortune for
- Config: route requests with >32K tokens to Gemini specifically

**Code example:**
```js
// Long context → Gemini automatically
const longDocResult = await client.chat.completions.create({
  model: 'gpt-4o',  // Freeloader routes to Gemini for long context
  messages: [{ role: 'user', content: veryLongDocument + '\n\nSummarize this.' }]
});
```

### "The Groq Express"
- Groq runs Llama 3.x at ~800 tokens/second — faster than any cloud provider
- Use for latency-sensitive applications: chat UIs, code completion
- Config: prioritize Groq for requests where speed matters

### "The Cerebras Speedrun"
- Cerebras inference: up to 2,000 tokens/second on Llama 3.1 70B
- Use for real-time streaming where every millisecond counts
- Currently in limited access — get on waitlist early

### "The Local Lockdown"
- For sensitive data: add Ollama as a provider, set trust tier to PRIVATE
- All PII, medical data, internal secrets → never leaves the machine
- Pull a capable model: `ollama pull llama3.2` or `ollama pull qwen2.5-coder`

**Code example:**
```bash
# One-time setup
ollama pull llama3.2

# Freeloader auto-detects Ollama at localhost:11434
# Add it in dashboard → Accounts → Ollama → Local
```

---

## SECTION 7: When You Will Pay (And That's OK)

- Complex multi-step reasoning: Claude Opus, GPT-4o
- Vision tasks at scale: some free tiers are limited
- When all free tiers are exhausted and you need guaranteed availability

**The strategy:** use Freeloader's budget caps to set a firm ceiling
```
Dashboard → Budget → Set monthly cap: $10
When cap is reached: return 429 (don't pay more)
```

---

## SECTION 8: CTA and Summary

**Video outro script:**
> "That's the $0 AI stack. One command, five free providers, automatic routing. Your app code doesn't change. Your bill does. Run `npx xswarm-freeloader`, it's free — obviously."

**Written article closing:**
- Recap: what Freeloader does, how to set it up, the strategies
- Link to GitHub for source code
- Link to dashboard docs
- Newsletter signup CTA: "Get notified when new free tiers drop"

---

## Production Notes

**Video format:**
- Screen recording with voiceover (no face cam needed)
- Fast cuts — no dead air, show results immediately
- Captions — SEO and accessibility
- Thumbnail: shocked face + "$347 → $0" text

**Written article format:**
- Step-by-step numbered sections
- Collapsible code blocks for each provider setup
- Cost comparison table in Section 5
- Pin a comment with current free tier limits (they change)

**Distribution:**
- YouTube primary
- Dev.to cross-post
- Reddit: r/selfhosted, r/LocalLLaMA, r/webdev
- Hacker News Show HN

---

## Notes for Writer/Creator

- Research current free tier limits before publishing — they change quarterly
- The "horrifying bill" needs to feel real — use a plausible breakdown
- The 5-minute video is the primary asset; article is the written version for SEO
- Add timestamps to YouTube description for each "strategy" section
- Update free tier table quarterly — changes are frequent and newsworthy in themselves
