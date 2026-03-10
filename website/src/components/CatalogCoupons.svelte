<script lang="ts">
  import ProviderIcon from './ProviderIcon.svelte';
  export let models: any[] = [];

  type Theme = { paper: string; accent: string; variant: number };
  const themes: Record<string, Theme> = {
    'Google':          { paper: '#edf4fe', accent: '#4285f4', variant: 0 },
    'Google Gemini':   { paper: '#edf4fe', accent: '#4285f4', variant: 0 },
    'Groq':            { paper: '#feeeea', accent: '#f55036', variant: 1 },
    'Cerebras':        { paper: '#f1ecf9', accent: '#7c3aed', variant: 2 },
    'SambaNova':       { paper: '#e6f6ee', accent: '#059669', variant: 3 },
    'Mistral AI':      { paper: '#fef2e0', accent: '#e86100', variant: 4 },
    'Mistral':         { paper: '#fef2e0', accent: '#e86100', variant: 4 },
    'OpenRouter':      { paper: '#eeedfd', accent: '#6366f1', variant: 5 },
    'Cohere':          { paper: '#e9f3fb', accent: '#2990d8', variant: 6 },
    'Alibaba Cloud':   { paper: '#feefdf', accent: '#e06000', variant: 7 },
    'Fireworks AI':    { paper: '#fdeded', accent: '#dc2626', variant: 0 },
    'OpenAI':          { paper: '#e4f6f0', accent: '#0d8a6a', variant: 5 },
    'Anthropic':       { paper: '#f7eee4', accent: '#b06b30', variant: 4 },
    'Together AI':     { paper: '#e6f2fb', accent: '#0284c7', variant: 6 },
    'DeepSeek':        { paper: '#eaeefa', accent: '#3b5ce4', variant: 3 },
    'Ollama (Local)':  { paper: '#f2ebfa', accent: '#9333ea', variant: 7 },
    'xAI':             { paper: '#f0f0f0', accent: '#1a1a1a', variant: 0 },
    'Inception Labs':  { paper: '#e8f5f0', accent: '#0a9e6f', variant: 2 },
    'NVIDIA NIM':          { paper: '#e8f5e9', accent: '#76b900', variant: 1 },
    'GitHub Models':       { paper: '#e8e8e8', accent: '#24292e', variant: 3 },
    'Cloudflare Workers AI': { paper: '#fff3e0', accent: '#f48120', variant: 5 },
    'HuggingFace':         { paper: '#fef7e0', accent: '#ffbd45', variant: 6 },
  };
  const defaultTheme: Theme = { paper: '#f5f0e8', accent: '#8b8579', variant: 0 };
  function th(provider: string): Theme { return themes[provider] || defaultTheme; }

  function fmtCtx(n: number) {
    if (!n) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
  }
  function fmtN(n: number | undefined) {
    if (!n) return '';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(n);
  }
  function fmtPrice(n: number | undefined) {
    if (n == null) return '?';
    if (n === 0) return '0';
    if (n < 0.01) return n.toFixed(3);
    if (n < 1) return n.toFixed(2);
    if (n >= 10) return Math.round(n).toString();
    return n.toFixed(2);
  }
  function seedRot(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return ((h % 12) - 6) / 10;
  }
  function byPrice(a: any, b: any) { return (a.pricing_input || 0) - (b.pricing_input || 0); }

  $: free = models.filter(m => m.routing_tier === 'free').sort(byPrice);
  $: budget = models.filter(m => m.routing_tier === 'budget').sort(byPrice);
  $: premium = models.filter(m => m.routing_tier === 'premium').sort(byPrice);

  const tiers = [
    { key: 'free', icon: '✓', title: 'Free Tier', css: 'free', dealCss: 'deal-free-bg' },
    { key: 'budget', icon: '¢', title: 'Budget', css: 'budget', dealCss: 'deal-budget-bg' },
    { key: 'premium', icon: '★', title: 'Premium', css: 'premium', dealCss: 'deal-premium-bg' },
  ] as const;

  function tierModels(key: string) { return key === 'free' ? free : key === 'budget' ? budget : premium; }
  function tierSubtitle(key: string, list: any[]) {
    if (key === 'free') return `${list.length} models — $0, just bring an API key`;
    if (key === 'budget') return `${list.length} models — fractions of a cent per request`;
    return `${list.length} models — the best, when you need the best`;
  }
</script>

<div class="catalog">
  {#each tiers as tier}
    {@const list = tierModels(tier.key)}
    {#if list.length}
      <div class="tier-section">
        <div class="tier-header">
          <h2 class="tier-title {tier.css}-title"><span class="tier-icon">{tier.icon}</span> {tier.title}</h2>
          <p class="tier-subtitle">{tierSubtitle(tier.key, list)}</p>
        </div>
        <div class="coupon-grid">
          {#each list as m}
            {@const t = th(m.provider)}
            {@const rot = seedRot(m.id || m.name)}
            {@const v = t.variant}
            <div class="coupon" style="--paper:{t.paper}; --accent:{t.accent}; transform:rotate({rot}deg);">
              <div class="coupon__back"></div>
              <div class="coupon__front"><div class="coupon__grain"></div></div>
              {#if v === 0}<div class="deco-bar-top"></div>
              {:else if v === 1}<div class="deco-bar-left"></div>
              {:else if v === 2}<div class="deco-outline"></div>
              {:else if v === 3}<div class="deco-corner"></div>
              {:else if v === 4}<div class="deco-bar-bottom"></div>
              {:else if v === 5}<div class="deco-inset"></div>
              {:else if v === 6}<div class="deco-side-fade"></div>
              {:else if v === 7}<div class="deco-sandwich-top"></div><div class="deco-sandwich-bottom"></div>
              {/if}
              <div class="coupon-body" class:pl-top={v===0} class:pl-left={v===1} class:pl-bottom={v===4} class:pl-sandwich={v===7}>
                <div class="brand">
                  <span class="brand-icon" style="color:{t.accent};"><ProviderIcon provider={m.provider} size={28} /></span>
                  <span class="brand-name" style="color:{t.accent};">{m.provider}</span>
                </div>
                <div class="model-name">{m.name || m.id}</div>
                <div class="deal {tier.dealCss}">
                  {#if tier.key === 'free'}
                    <span class="deal-zero">$0</span>
                    <div class="deal-limits">
                      {#if m.is_local}
                        <span class="lim">unlimited (local inference)</span>
                      {:else}
                        {#if m.free_tier_rpm}<span class="lim">{m.free_tier_rpm} req/min</span>{/if}
                        {#if m.free_tier_rpd}<span class="lim">{fmtN(m.free_tier_rpd)} req/day</span>{/if}
                        {#if m.free_tier_tpm}<span class="lim">{fmtN(m.free_tier_tpm)} tok/min</span>{/if}
                        {#if m.free_tier_tpd}<span class="lim">{fmtN(m.free_tier_tpd)} tok/day</span>{/if}
                      {/if}
                    </div>
                    {#if m.pricing_input > 0}
                      <div class="deal-after">then ${fmtPrice(m.pricing_input)}/1M tokens after limits</div>
                    {:else}
                      <div class="deal-after deal-truly-free">completely free within limits</div>
                    {/if}
                  {:else}
                    <div class="deal-row">
                      <span class="deal-price" style="color:{t.accent};">${fmtPrice(m.pricing_input)}</span>
                      <span class="deal-unit">/1M input tokens</span>
                    </div>
                    {#if m.pricing_output}
                      <div class="deal-after">${fmtPrice(m.pricing_output)}/1M output tokens</div>
                    {/if}
                  {/if}
                </div>
                <div class="specs">
                  <span>{fmtCtx(m.context_window)} ctx</span>
                  {#if m.supports_tools}<span>tools</span>{/if}
                  {#if m.supports_vision}<span>vision</span>{/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .catalog { display: flex; flex-direction: column; gap: 3rem; }
  .tier-header { margin-bottom: 1.25rem; }
  .tier-title {
    font-family: 'Permanent Marker', cursive; font-size: 1.8rem;
    letter-spacing: 0.04em; display: flex; align-items: center; gap: 0.5rem;
  }
  .tier-icon { font-size: 1.4rem; }
  .free-title { color: #27864a; }
  .budget-title { color: #b45309; }
  .premium-title { color: #7c3aed; }
  .tier-subtitle { font-family: 'Special Elite', monospace; font-size: 0.85rem; color: #8b8579; margin-top: 0.25rem; }

  .coupon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; padding: 0.25rem; }

  .coupon { position: relative; transition: transform 0.25s ease; }
  .coupon:hover { transform: rotate(0deg) translateY(-4px) scale(1.02) !important; z-index: 2; }

  .coupon__back, .coupon__front {
    position: absolute; inset: 0;
    background-color: var(--paper);
    background-image: var(--noise-fine);
    background-size: 200px; background-repeat: repeat; background-blend-mode: multiply;
    border-radius: 5px; filter: url(#couponcut);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.03);
  }
  .coupon__back {
    transform: translate(2px, 3px);
    background-color: color-mix(in srgb, var(--paper) 85%, #8b7a60);
    filter: url(#couponcut) drop-shadow(0 2px 6px rgba(30,20,10,0.18)) drop-shadow(0 6px 16px rgba(30,20,10,0.06));
  }
  .coupon__front { z-index: 1; }
  .coupon__grain {
    position: absolute; inset: 0; pointer-events: none;
    background-image: var(--noise-grain);
    background-size: 300px; background-repeat: repeat;
    mix-blend-mode: multiply; opacity: 0.4; border-radius: inherit;
  }

  /* 8 decoration variants */
  .deco-bar-top { position: absolute; top: 0; left: 0; right: 0; z-index: 3; height: 5px; background: var(--accent); opacity: 0.4; border-radius: 5px 5px 0 0; filter: url(#couponcut); }
  .deco-bar-left { position: absolute; left: 0; top: 0; bottom: 0; z-index: 3; width: 5px; background: var(--accent); opacity: 0.4; border-radius: 5px 0 0 5px; filter: url(#couponcut); }
  .deco-outline { position: absolute; inset: 0; z-index: 3; border: 2px solid var(--accent); opacity: 0.2; border-radius: 5px; pointer-events: none; }
  .deco-corner { position: absolute; top: 0; right: 0; z-index: 3; width: 44px; height: 44px; background: var(--accent); opacity: 0.3; clip-path: polygon(0 0, 100% 0, 100% 100%); border-radius: 0 5px 0 0; }
  .deco-bar-bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 3; height: 5px; background: var(--accent); opacity: 0.4; border-radius: 0 0 5px 5px; filter: url(#couponcut); }
  .deco-inset { position: absolute; inset: 4px; z-index: 3; border: 1.5px solid var(--accent); opacity: 0.15; border-radius: 3px; pointer-events: none; }
  .deco-side-fade { position: absolute; left: 0; top: 0; bottom: 0; z-index: 3; width: 40%; pointer-events: none; background: linear-gradient(to right, color-mix(in srgb, var(--accent) 6%, transparent), transparent); border-radius: 5px 0 0 5px; }
  .deco-sandwich-top { position: absolute; top: 0; left: 0; right: 0; z-index: 3; height: 4px; background: var(--accent); opacity: 0.35; border-radius: 5px 5px 0 0; filter: url(#couponcut); }
  .deco-sandwich-bottom { position: absolute; bottom: 0; left: 0; right: 0; z-index: 3; height: 4px; background: var(--accent); opacity: 0.35; border-radius: 0 0 5px 5px; filter: url(#couponcut); }

  .coupon-body {
    position: relative; z-index: 2; padding: 0.75rem 0.85rem 0.7rem;
    text-shadow: -0.5px -0.5px 0 rgba(255,255,255,0.4), 0.5px 0.5px 0 rgba(0,0,0,0.08);
  }
  .pl-top { padding-top: 1rem; }
  .pl-left { padding-left: 1.1rem; }
  .pl-bottom { padding-bottom: 1rem; }
  .pl-sandwich { padding-top: 0.9rem; padding-bottom: 0.9rem; }

  .brand { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
  .brand-icon { display: flex; align-items: center; flex-shrink: 0; }
  .brand-name { font-family: 'Permanent Marker', cursive; font-size: 0.85rem; letter-spacing: 0.03em; text-shadow: -1px -1px 0 rgba(255,255,255,0.45), 1px 1px 0 rgba(0,0,0,0.1); }
  .model-name { font-family: 'Source Sans 3', sans-serif; font-size: 0.95rem; font-weight: 700; color: #2d2a26; margin-bottom: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: -1px -1px 0 rgba(255,255,255,0.5), 1px 1px 0 rgba(0,0,0,0.1); }

  .deal { padding: 0.4rem 0.5rem; border-radius: 4px; margin-bottom: 0.4rem; }
  .deal-free-bg { background: rgba(39,134,74,0.06); border: 1px solid rgba(39,134,74,0.15); }
  .deal-budget-bg { background: rgba(180,83,9,0.05); border: 1px solid rgba(180,83,9,0.12); }
  .deal-premium-bg { background: rgba(124,58,237,0.05); border: 1px solid rgba(124,58,237,0.12); }
  .deal-row { display: flex; align-items: baseline; gap: 0.45rem; flex-wrap: wrap; }
  .deal-zero { font-family: 'Permanent Marker', cursive; font-size: 1.6rem; color: #27864a; line-height: 1; text-shadow: -1px -1px 0 rgba(255,255,255,0.5), 1.5px 1.5px 0 rgba(0,0,0,0.12); }
  .deal-limits { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.3rem 0 0.15rem; }
  .lim { font-family: 'Special Elite', monospace; font-size: 0.65rem; background: rgba(39,134,74,0.08); border: 1px solid rgba(39,134,74,0.2); color: #27864a; padding: 2px 6px; border-radius: 3px; }
  .deal-after { font-family: 'Special Elite', monospace; font-size: 0.62rem; color: #9ca3af; margin-top: 0.15rem; }
  .deal-truly-free { color: #27864a; font-weight: bold; }
  .deal-price { font-family: 'Permanent Marker', cursive; font-size: 1.4rem; line-height: 1; text-shadow: -1px -1px 0 rgba(255,255,255,0.5), 1.5px 1.5px 0 rgba(0,0,0,0.12); }
  .deal-unit { font-family: 'Special Elite', monospace; font-size: 0.65rem; color: #9ca3af; }

  .specs { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .specs span { font-family: 'Special Elite', monospace; font-size: 0.58rem; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06); color: #8b8579; padding: 1px 5px; border-radius: 3px; }

  @media (max-width: 639px) {
    .coupon-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .coupon { transform: rotate(0deg) !important; }
    .tier-title { font-size: 1.4rem; }
    .specs span { font-size: 0.66rem; }
    .deal-after { font-size: 0.68rem; }
    .lim { font-size: 0.7rem; }
    .deal-unit { font-size: 0.7rem; }
    .brand-name { font-size: 0.78rem; }
  }
  @media (max-width: 440px) { .coupon-grid { grid-template-columns: 1fr; } }
</style>
