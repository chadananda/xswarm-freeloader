// :arch: Cloudflare Worker — catalog build + scheduled enrichment from multiple sources
// :deps: providers.js, default-catalog.json, CATALOG_BUCKET R2 binding
// :rules: any source failure must not break others; prefer lower/more-specific rate limits
import { PROVIDERS, PROVIDER_MAP } from "./providers.js";
import defaultCatalog from "./default-catalog.json";

const CATALOG_KEY = "catalog.json";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
// GitHub raw URL for community-maintained free LLM API resources list
const FREE_LLM_README_URL = "https://raw.githubusercontent.com/cheahjs/free-llm-api-resources/main/README.md";
// Provider name aliases for cross-referencing README table data with our provider IDs
const PROVIDER_ALIASES = {
  "google": ["google", "gemini"],
  "groq": ["groq"],
  "cerebras": ["cerebras"],
  "sambanova": ["sambanova", "samba nova"],
  "mistral": ["mistral"],
  "openrouter": ["openrouter", "open router"],
  "cohere": ["cohere"],
  "ollama": ["ollama"],
  "deepseek": ["deepseek", "deep seek"],
  "alibaba": ["alibaba", "qwen", "dashscope"],
  "fireworks": ["fireworks"],
  "together": ["together"],
  "inception": ["inception"],
  "xai": ["xai", "grok"],
  "openai": ["openai"],
  "anthropic": ["anthropic"],
  "nvidia": ["nvidia", "nim"],
  "github": ["github"],
  "cloudflare": ["cloudflare", "workers ai"],
  "huggingface": ["hugging face", "huggingface"],
};

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
}

// Parse a single numeric value from a table cell (handles K/M suffixes, strips commas)
function parseNum(str) {
  if (!str) return null;
  const s = str.trim().replace(/,/g, "");
  if (!s || s === "-" || s === "N/A" || s === "∞") return null;
  const m = s.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  if (m[2] === "K" || m[2] === "k") return Math.round(n * 1000);
  if (m[2] === "M" || m[2] === "m") return Math.round(n * 1_000_000);
  return Math.round(n);
}

// Parse README markdown tables for rate limit data
// Returns: { providers: [{ id, limits: { rpm, rpd, tpm, tpd } }] }
function parseReadmeRateLimits(markdown) {
  const providers = [];
  // Split into lines and find table rows with rate limit data
  const lines = markdown.split("\n");
  let inTable = false;
  let headers = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Detect table header row containing rate limit columns
    if (trimmed.startsWith("|") && (trimmed.toLowerCase().includes("rpm") || trimmed.toLowerCase().includes("req/min") || trimmed.toLowerCase().includes("rate limit"))) {
      inTable = true;
      headers = trimmed.split("|").map(h => h.trim().toLowerCase()).filter(Boolean);
      continue;
    }
    // Skip separator rows
    if (inTable && trimmed.match(/^\|[\s\-:|]+\|/)) continue;
    // Parse data rows
    if (inTable && trimmed.startsWith("|")) {
      const cells = trimmed.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 0).filter(Boolean);
      if (cells.length < 2) { inTable = false; continue; }
      // First cell is usually provider/model name
      const nameRaw = cells[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "").trim().toLowerCase();
      // Find which provider this matches
      let matchedId = null;
      for (const [id, aliases] of Object.entries(PROVIDER_ALIASES)) {
        if (aliases.some(a => nameRaw.includes(a))) { matchedId = id; break; }
      }
      if (!matchedId) continue;
      // Extract rate limit columns
      const limits = {};
      headers.forEach((h, i) => {
        const val = cells[i];
        if (!val) return;
        if (h.includes("rpm") || h.includes("req/min") || h.includes("requests/min")) limits.rpm = parseNum(val);
        else if (h.includes("rpd") || h.includes("req/day") || h.includes("requests/day")) limits.rpd = parseNum(val);
        else if (h.includes("tpm") || h.includes("tok/min") || h.includes("tokens/min")) limits.tpm = parseNum(val);
        else if (h.includes("tpd") || h.includes("tok/day") || h.includes("tokens/day")) limits.tpd = parseNum(val);
      });
      if (Object.values(limits).some(v => v !== null)) {
        // Merge with existing provider entry or create new
        const existing = providers.find(p => p.id === matchedId);
        if (existing) {
          // Take lower (more conservative) limits
          for (const [k, v] of Object.entries(limits)) {
            if (v !== null) existing.limits[k] = existing.limits[k] ? Math.min(existing.limits[k], v) : v;
          }
        } else {
          providers.push({ id: matchedId, limits });
        }
      }
      continue;
    }
    if (inTable && !trimmed.startsWith("|")) inTable = false;
  }
  return { providers };
}

// Fetch and parse free-llm-api-resources README for rate limit data
async function fetchFreeResources() {
  const res = await fetch(FREE_LLM_README_URL, { headers: { "User-Agent": "freeloader-catalog/2.0" } });
  if (!res.ok) throw new Error(`Free resources fetch failed: ${res.status}`);
  const markdown = await res.text();
  const parsed = parseReadmeRateLimits(markdown);
  // Log new providers not in our catalog (for manual review)
  const ourIds = new Set(PROVIDERS.map(p => p.id));
  for (const p of parsed.providers) {
    if (!ourIds.has(p.id)) console.log(`[catalog] New provider discovered in free-llm-api-resources: ${p.id}`);
  }
  return parsed;
}

// Build catalog from OpenRouter model list + provider definitions
async function buildCatalog() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter fetch failed: ${res.status}`);
  const { data: orModels } = await res.json();
  // Index OpenRouter models by id for pricing lookup
  const orIndex = Object.fromEntries(orModels.map((m) => [m.id, m]));
  const updated_at = new Date().toISOString();
  const providers = PROVIDERS.map((provider) => {
    // Use default-catalog models as the source of truth for model metadata
    const defaultProvider = defaultCatalog.providers.find((p) => p.id === provider.id);
    const models = (defaultProvider?.models ?? []).map((model) => {
      // Try to enrich with live OpenRouter pricing using OpenRouter-style id
      const orKey = `${provider.id}/${model.id}`;
      const orModel = orIndex[orKey] ?? orIndex[model.id];
      if (orModel?.pricing) {
        // OpenRouter pricing is per-token; multiply by 1M to get $/1M tokens
        const pricingInput = parseFloat((parseFloat(orModel.pricing.prompt || 0) * 1_000_000).toFixed(4));
        const pricingOutput = parseFloat((parseFloat(orModel.pricing.completion || 0) * 1_000_000).toFixed(4));
        return {
          ...model,
          pricing_input: pricingInput || model.pricing_input,
          pricing_output: pricingOutput || model.pricing_output,
          context_window: orModel.context_length ?? model.context_window,
        };
      }
      return model;
    });
    return { ...provider, models };
  });
  return { version: "2.0", updated_at, providers };
}

// Merge rate limit data from external sources into catalog
// Prefers more specific/lower limits; does not overwrite if source data is null
function enrichCatalog(catalog, sources) {
  if (!sources.freeResources?.providers?.length) return catalog;
  const limitsById = Object.fromEntries(sources.freeResources.providers.map(p => [p.id, p.limits]));
  const providers = catalog.providers.map(provider => {
    const extLimits = limitsById[provider.id];
    if (!extLimits) return provider;
    const models = provider.models.map(model => {
      // Only apply limits to free-tier models
      if (!model.free_tier) return model;
      const updated = { ...model };
      if (extLimits.rpm != null) updated.free_tier_rpm = model.free_tier_rpm ? Math.min(model.free_tier_rpm, extLimits.rpm) : extLimits.rpm;
      if (extLimits.rpd != null) updated.free_tier_rpd = model.free_tier_rpd ? Math.min(model.free_tier_rpd, extLimits.rpd) : extLimits.rpd;
      if (extLimits.tpm != null) updated.free_tier_tpm = model.free_tier_tpm ? Math.min(model.free_tier_tpm, extLimits.tpm) : extLimits.tpm;
      if (extLimits.tpd != null) updated.free_tier_tpd = model.free_tier_tpd ? Math.min(model.free_tier_tpd, extLimits.tpd) : extLimits.tpd;
      return updated;
    });
    return { ...provider, models };
  });
  return { ...catalog, providers };
}

async function handleScheduled(env) {
  const [openRouter, freeResources] = await Promise.allSettled([
    buildCatalog(),
    fetchFreeResources(),
  ]);
  if (openRouter.status === "rejected") console.error("OpenRouter enrichment failed:", openRouter.reason?.message);
  if (freeResources.status === "rejected") console.error("Free resources fetch failed:", freeResources.reason?.message);
  const baseCatalog = openRouter.status === "fulfilled"
    ? openRouter.value
    : { ...defaultCatalog, updated_at: new Date().toISOString() };
  const catalog = enrichCatalog(baseCatalog, {
    freeResources: freeResources.status === "fulfilled" ? freeResources.value : null,
  });
  const body = JSON.stringify(catalog);
  await env.CATALOG_BUCKET.put(CATALOG_KEY, body, {
    httpMetadata: { contentType: "application/json" },
  });
  console.log("Catalog updated at", catalog.updated_at, `(${catalog.providers.length} providers)`);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (url.pathname === "/health") return jsonResponse({ status: "ok", ts: new Date().toISOString() });
  if (url.pathname === "/catalog.json") {
    const obj = await env.CATALOG_BUCKET.get(CATALOG_KEY);
    if (!obj) {
      // R2 miss — return bundled default
      return jsonResponse(defaultCatalog, 200, {
        "Cache-Control": "public, max-age=3600",
        "X-Catalog-Source": "default",
      });
    }
    const body = await obj.text();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "X-Catalog-Source": "r2",
        ...CORS_HEADERS,
      },
    });
  }
  return jsonResponse({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};
