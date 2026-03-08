import { PROVIDERS, PROVIDER_MAP } from "./providers.js";
import defaultCatalog from "./default-catalog.json";

const CATALOG_KEY = "catalog.json";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...extra },
  });
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

async function handleScheduled(env) {
  let catalog;
  try {
    catalog = await buildCatalog();
  } catch (err) {
    console.error("Catalog build failed, using default:", err.message);
    catalog = { ...defaultCatalog, updated_at: new Date().toISOString() };
  }
  const body = JSON.stringify(catalog);
  await env.CATALOG_BUCKET.put(CATALOG_KEY, body, {
    httpMetadata: { contentType: "application/json" },
  });
  console.log("Catalog updated at", catalog.updated_at);
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
