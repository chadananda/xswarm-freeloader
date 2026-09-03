<script>
  import { onMount, onDestroy } from 'svelte'
  import { api } from '../lib/api.js'
  import { navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import AreaChart from '../components/AreaChart.svelte'
  import DonutChart from '../components/DonutChart.svelte'
  import SavingsComparison from '../components/SavingsComparison.svelte'
  import HealthBadge from '../components/HealthBadge.svelte'
  //
  let overview = $state(null)
  let onboardingStatus = $state(null)
  let timeseries = $state([])
  let byProvider = $state([])
  let error = $state('')
  let interval = null

  async function load() {
    try {
      const [ov, ts, bp] = await Promise.all([
        api.overview(),
        api.usageTimeseries(30).catch(() => []),
        api.usageByProvider().catch(() => [])
      ])
      overview = ov
      timeseries = Array.isArray(ts) ? ts.map(d => ({ date: d.date, value: Number(d.total_cost || 0) })) : []
      byProvider = Array.isArray(bp) ? bp : []
      error = ''
    } catch (err) {
      error = err.message
    }
  }

  onMount(async () => {
    load()
    interval = setInterval(load, 5000)
    try { onboardingStatus = await api.onboardingStatus() } catch { /* ignore */ }
  })
  onDestroy(() => clearInterval(interval))

  const fmt = (n) => n == null ? '—' : `$${Number(n).toFixed(4)}`
  const fmtBig = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`

  const providerColors = ['#27864a', '#4a6fa8', '#d4831a', '#8b5cf6', '#c0392b', '#0891b2', '#ca8a04']
  const donutSegments = $derived(
    byProvider.slice(0, 7).map((p, i) => ({
      label: p.provider,
      value: Number(p.total_requests || 0),
      color: providerColors[i % providerColors.length]
    }))
  )

  const savingsActual = $derived(overview ? Number(overview.costMonth || 0) : 0)
  const savingsOpenai = $derived(overview ? Number(overview.savedMonth || 0) + savingsActual : 0)
  const savingsByProvider = $derived(
    byProvider.slice(0, 5).map(p => ({
      name: p.provider,
      cost: Number(p.total_cost || 0),
      openaiCost: Number(p.openai_equivalent || p.total_cost || 0) * 3
    }))
  )
</script>

<div class="space-y-5">
  <div class="flex items-baseline justify-between">
    <div>
      <h1 style="font-family:'Permanent Marker',cursive; color:#27864a; font-size:1.3rem; margin:0;">Overview</h1>
      <p style="color:#8b8579; font-size:0.85rem; margin:0.2rem 0 0;">your free tiers at work — live stats every 5s</p>
    </div>
    {#if error}
      <div style="color:#c0392b; font-size:0.8rem; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.2); border-radius:6px; padding:0.3rem 0.75rem;">{error}</div>
    {/if}
  </div>

  {#if onboardingStatus?.needed}
    <div style="position:relative; background:#f0ebe0; border:2px dashed #27864a; border-radius:10px; padding:2rem 2rem; overflow:hidden; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;"
      onclick={() => navigate('#/accounts')}
      onkeydown={(e) => { if (e.key === 'Enter') navigate('#/accounts') }}
      onmouseenter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(39,134,74,0.15)' }}
      onmouseleave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      role="button" tabindex="0">
      <div style="position:absolute; inset:0; background-image:url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E&quot;); background-size:300px; pointer-events:none; opacity:0.5; mix-blend-mode:multiply;"></div>
      <div style="position:relative; display:flex; align-items:center; gap:1.5rem;">
        <div style="font-size:3rem; flex-shrink:0;">🐝</div>
        <div style="flex:1;">
          <h2 style="font-family:'Permanent Marker',cursive; font-size:1.4rem; color:#27864a; margin:0 0 0.4rem;">Let's get you set up with free tiers!</h2>
          <p style="font-size:0.9rem; color:#6b6560; margin:0; line-height:1.5;">Connect API keys from Groq, Gemini, Mistral, and more — unlock thousands of free AI requests per day. Takes about 2 minutes.</p>
        </div>
        <div style="font-family:'Permanent Marker',cursive; font-size:1.1rem; color:#27864a; white-space:nowrap; flex-shrink:0;">Set Up →</div>
      </div>
    </div>
  {:else if onboardingStatus && onboardingStatus.free_tier_unconfigured?.length > 0}
    <div style="position:relative; display:flex; align-items:center; gap:0.75rem; background:#f0ebe0; border:1.5px dashed #d4cdc4; border-left:3px solid #27864a; border-radius:0 6px 6px 0; padding:0.7rem 1rem; overflow:hidden; cursor:pointer;"
      onclick={() => navigate('#/accounts')}
      onkeydown={(e) => { if (e.key === 'Enter') navigate('#/accounts') }}
      role="button" tabindex="0">
      <div style="position:absolute; inset:0; background-image:url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E&quot;); background-size:300px; pointer-events:none; opacity:0.35; mix-blend-mode:multiply;"></div>
      <span style="position:relative; font-size:0.85rem;">💡</span>
      <span style="position:relative; font-size:0.85rem; color:#6b6560; flex:1;">{onboardingStatus.free_tier_unconfigured.length} free-tier provider{onboardingStatus.free_tier_unconfigured.length !== 1 ? 's' : ''} still available — clip more coupons!</span>
      <span style="position:relative; color:#27864a; font-size:0.85rem; font-weight:600;">View Providers →</span>
    </div>
  {/if}
  {#if overview}
    <!-- Stat row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard accent="orange">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Cost today</div>
        <div style="font-size:1.6rem; font-weight:700; color:#d4831a; line-height:1;">{fmtBig(overview.costToday)}</div>
      </DashboardCard>
      <DashboardCard accent="orange">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Cost this month</div>
        <div style="font-size:1.6rem; font-weight:700; color:#d4831a; line-height:1;">{fmtBig(overview.costMonth)}</div>
      </DashboardCard>
      <DashboardCard accent="green">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Saved today</div>
        <div style="font-size:1.6rem; font-weight:700; color:#27864a; line-height:1;">{fmtBig(overview.savedToday)}</div>
      </DashboardCard>
      <DashboardCard accent="green">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Saved this month</div>
        <div style="font-size:1.6rem; font-weight:700; color:#27864a; line-height:1;">{fmtBig(overview.savedMonth)}</div>
      </DashboardCard>
    </div>

    <!-- Secondary stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <DashboardCard accent="blue">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Requests today</div>
        <div style="font-size:1.4rem; font-weight:700; color:#4a6fa8; line-height:1;">{overview.requestsToday ?? '—'}</div>
      </DashboardCard>
      <DashboardCard accent="green">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Free tier hits</div>
        <div style="font-size:1.4rem; font-weight:700; color:#27864a; line-height:1;">{overview.freeTierPct ?? 0}%</div>
        <div style="font-size:0.8rem; color:#8b8579; margin-top:0.2rem;">of all requests</div>
        <div style="margin-top:0.5rem; background:#d4cdc4; border-radius:3px; height:4px; overflow:hidden;">
          <div style="height:100%; background:#27864a; width:{overview.freeTierPct ?? 0}%; transition:width 0.8s ease;"></div>
        </div>
      </DashboardCard>
      <DashboardCard accent="blue">
        <div style="font-size:0.75rem; color:#8b8579; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.4rem;">Avg latency</div>
        <div style="font-size:1.4rem; font-weight:700; color:#4a6fa8; line-height:1;">{overview.avgLatencyMs ? `${overview.avgLatencyMs}ms` : '—'}</div>
      </DashboardCard>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DashboardCard title="Daily cost trend" accent="orange">
        {#if timeseries.length > 0}
          <AreaChart data={timeseries} height={180} color="#d4831a" />
        {:else}
          <div style="color:#8b8579; font-size:0.85rem; padding:2rem 0; text-align:center;">no timeseries data yet</div>
        {/if}
      </DashboardCard>
      <DashboardCard title="Provider distribution" accent="blue">
        {#if donutSegments.length > 0}
          <DonutChart segments={donutSegments} size={160} />
        {:else}
          <div style="color:#8b8579; font-size:0.85rem; padding:2rem 0; text-align:center;">make some requests first</div>
        {/if}
      </DashboardCard>
    </div>

    <!-- Savings comparison -->
    {#if savingsOpenai > 0}
      <DashboardCard title="Savings comparison" subtitle="you vs OpenAI equivalent" accent="green">
        <SavingsComparison
          actualCost={savingsActual}
          openaiEquivalent={savingsOpenai}
          byProvider={savingsByProvider}
        />
      </DashboardCard>
    {/if}

    <!-- Provider health -->
    <DashboardCard title="Provider health" accent="green">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {#each (overview.providers || []) as p}
          <div style="display:flex; align-items:center; justify-content:space-between; background:#e8e2d8; border-radius:6px; padding:0.4rem 0.75rem;">
            <span style="font-size:0.85rem; color:#2d2a26; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{p.name}</span>
            <HealthBadge status={p.health} />
          </div>
        {:else}
          <div style="color:#8b8579; font-size:0.85rem;">no providers configured</div>
        {/each}
      </div>
    </DashboardCard>

    <!-- Live request feed -->
    <DashboardCard title="Live request feed" accent="blue">
      <div style="max-height:14rem; overflow-y:auto;">
        {#each (overview.recentRequests || []) as req}
          <div style="display:flex; align-items:center; gap:0.75rem; font-size:0.8rem; background:#e8e2d8; border-radius:6px; padding:0.4rem 0.75rem; margin-bottom:0.35rem;">
            <span style="color:#8b8579; width:5rem; flex-shrink:0;">{new Date(req.timestamp).toLocaleTimeString()}</span>
            <span style="color:#4a6fa8; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{req.provider}</span>
            <span style="color:#2d2a26; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{req.model}</span>
            <span style="color:#27864a; width:4.5rem; text-align:right;">{fmt(req.cost)}</span>
            <span style="color:#8b8579; width:4rem; text-align:right;">{req.latencyMs}ms</span>
          </div>
        {:else}
          <div style="color:#8b8579; font-size:0.85rem; text-align:center; padding:1.5rem 0;">no requests yet — wake up those free tiers!</div>
        {/each}
      </div>
    </DashboardCard>
  {:else if !error}
    <div style="color:#8b8579; font-size:0.9rem;">loading the goods...</div>
  {/if}
</div>
