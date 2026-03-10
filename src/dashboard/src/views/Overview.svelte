<script>
  // :arch: overview dashboard — primary status screen with savings, charts, provider health
  // :why: replaces raw gray-800 divs with DashboardCard dark paper theme; uses task-1 APIs
  // :deps: api.overview, api.usageTimeseries, api.usageByProvider → DashboardCard, AreaChart, DonutChart, SavingsComparison
  import { onMount, onDestroy } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import AreaChart from '../components/AreaChart.svelte'
  import DonutChart from '../components/DonutChart.svelte'
  import SavingsComparison from '../components/SavingsComparison.svelte'
  import HealthBadge from '../components/HealthBadge.svelte'

  let overview = $state(null)
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

  onMount(() => {
    load()
    interval = setInterval(load, 5000)
  })
  onDestroy(() => clearInterval(interval))

  const fmt = (n) => n == null ? '—' : `$${Number(n).toFixed(4)}`
  const fmtBig = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`

  // Provider donut: color rotation
  const providerColors = ['#27864a', '#4a6fa8', '#d4831a', '#8b5cf6', '#c0392b', '#0891b2', '#ca8a04']
  const donutSegments = $derived(
    byProvider.slice(0, 7).map((p, i) => ({
      label: p.provider,
      value: Number(p.total_requests || 0),
      color: providerColors[i % providerColors.length]
    }))
  )

  // Savings comparison data
  const savingsActual = $derived(overview ? Number(overview.costMonth || 0) : 0)
  const savingsOpenai = $derived(overview ? Number(overview.savedMonth || 0) + savingsActual : 0)
  const savingsByProvider = $derived(
    byProvider.slice(0, 5).map(p => ({
      name: p.provider,
      cost: Number(p.total_cost || 0),
      openaiCost: Number(p.openai_equivalent || p.total_cost || 0) * 3
    }))
  )

  // Budget progress: cost this month vs some cap (show 0–100% bar)
  const budgetPct = $derived(() => {
    if (!overview) return 0
    const cap = 10 // default display cap $10
    return Math.min(100, (Number(overview.costMonth || 0) / cap) * 100)
  })
</script>

<div class="space-y-5">
  <div class="flex items-baseline justify-between">
    <div>
      <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Overview</h1>
      <p style="color:#8a7f78; font-size:0.78rem;">your free tiers at work — live stats every 5s</p>
    </div>
    {#if error}
      <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.3rem 0.75rem;">{error}</div>
    {/if}
  </div>

  {#if overview}
    <!-- Stat row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard accent="orange" subtitle="actual spend">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Cost today</div>
        <div style="font-size:1.6rem; font-weight:800; color:#d4831a; line-height:1;">{fmtBig(overview.costToday)}</div>
      </DashboardCard>
      <DashboardCard accent="orange" subtitle="actual spend">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Cost this month</div>
        <div style="font-size:1.6rem; font-weight:800; color:#d4831a; line-height:1;">{fmtBig(overview.costMonth)}</div>
      </DashboardCard>
      <DashboardCard accent="green" subtitle="vs paid equivalent">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Saved today</div>
        <div style="font-size:1.6rem; font-weight:800; color:#27864a; line-height:1;">{fmtBig(overview.savedToday)}</div>
      </DashboardCard>
      <DashboardCard accent="green" subtitle="freeloading like a boss">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Saved this month</div>
        <div style="font-size:1.6rem; font-weight:800; color:#27864a; line-height:1;">{fmtBig(overview.savedMonth)}</div>
      </DashboardCard>
    </div>

    <!-- Secondary stats -->
    <div class="grid grid-cols-3 gap-4">
      <DashboardCard accent="blue">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Requests today</div>
        <div style="font-size:1.4rem; font-weight:800; color:#4a6fa8; line-height:1;">{overview.requestsToday ?? '—'}</div>
      </DashboardCard>
      <DashboardCard accent="green">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Free tier hits</div>
        <div style="font-size:1.4rem; font-weight:800; color:#27864a; line-height:1;">{overview.freeTierPct ?? 0}%</div>
        <div style="font-size:0.65rem; color:#8a7f78; margin-top:0.2rem;">of all requests</div>
        <!-- Setup progress indicator -->
        <div style="margin-top:0.5rem; background:#3a3530; border-radius:3px; height:4px; overflow:hidden;">
          <div style="height:100%; background:#27864a; width:{overview.freeTierPct ?? 0}%; transition:width 0.8s ease;"></div>
        </div>
      </DashboardCard>
      <DashboardCard accent="blue">
        <div style="font-family:'Special Elite',serif; font-size:0.65rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.3rem;">Avg latency</div>
        <div style="font-size:1.4rem; font-weight:800; color:#4a6fa8; line-height:1;">{overview.avgLatencyMs ? `${overview.avgLatencyMs}ms` : '—'}</div>
      </DashboardCard>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DashboardCard title="Daily cost trend" accent="orange">
        {#if timeseries.length > 0}
          <AreaChart data={timeseries} height={180} color="#d4831a" />
        {:else}
          <div style="color:#8a7f78; font-size:0.78rem; padding:2rem 0; text-align:center;">no timeseries data yet</div>
        {/if}
      </DashboardCard>
      <DashboardCard title="Provider distribution" accent="blue">
        {#if donutSegments.length > 0}
          <DonutChart segments={donutSegments} size={160} />
        {:else}
          <div style="color:#8a7f78; font-size:0.78rem; padding:2rem 0; text-align:center;">make some requests first</div>
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
          <div style="display:flex; align-items:center; justify-content:space-between; background:#2e2a27; border-radius:6px; padding:0.4rem 0.75rem;">
            <span style="font-size:0.8rem; color:#c8bdb6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{p.name}</span>
            <HealthBadge status={p.health} />
          </div>
        {:else}
          <div style="color:#8a7f78; font-size:0.78rem;">no providers configured</div>
        {/each}
      </div>
    </DashboardCard>

    <!-- Live request feed -->
    <DashboardCard title="Live request feed" accent="blue">
      <div style="max-height:14rem; overflow-y:auto;">
        {#each (overview.recentRequests || []) as req}
          <div style="display:flex; align-items:center; gap:0.75rem; font-size:0.72rem; background:#2e2a27; border-radius:6px; padding:0.35rem 0.75rem; margin-bottom:0.35rem;">
            <span style="color:#8a7f78; width:5rem; flex-shrink:0;">{new Date(req.timestamp).toLocaleTimeString()}</span>
            <span style="color:#4a6fa8; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{req.provider}</span>
            <span style="color:#c8bdb6; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{req.model}</span>
            <span style="color:#27864a; width:4.5rem; text-align:right;">{fmt(req.cost)}</span>
            <span style="color:#8a7f78; width:4rem; text-align:right;">{req.latencyMs}ms</span>
          </div>
        {:else}
          <div style="color:#8a7f78; font-size:0.78rem; text-align:center; padding:1.5rem 0;">no requests yet — wake up those free tiers!</div>
        {/each}
      </div>
    </DashboardCard>
  {:else if !error}
    <div style="color:#8a7f78; font-size:0.85rem;">loading the goods...</div>
  {/if}
</div>
