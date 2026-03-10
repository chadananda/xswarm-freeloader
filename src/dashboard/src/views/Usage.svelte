<script>
  // :arch: usage view — filterable request log with cost breakdown charts
  // :why: dark paper DashboardCard wrapping; BarChart for by-provider, AreaChart for by-day
  // :deps: api.usage, api.usageTimeseries, api.usageByProvider → DashboardCard, BarChart, AreaChart
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import BarChart from '../components/BarChart.svelte'
  import AreaChart from '../components/AreaChart.svelte'

  let requests = $state([])
  let breakdown = $state({ byProvider: [], byDay: [] })
  let error = $state('')
  let loading = $state(false)
  let filters = $state({ provider: '', app: '', date_from: '', date_to: '', limit: 50 })

  onMount(() => load())

  async function load() {
    loading = true
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      const data = await api.usage(params)
      requests = data.requests || data
      breakdown = data.breakdown || { byProvider: [], byDay: [] }
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  const fmtCost = (n) => n == null ? '—' : `$${Number(n).toFixed(4)}`
  const providerList = $derived([...new Set(requests.map(r => r.provider).filter(Boolean))])

  // Chart data
  const providerBarData = $derived(
    (breakdown.byProvider || []).map((row, i) => ({
      label: row.provider,
      value: Number(row.total_cost || 0),
      color: ['#27864a','#4a6fa8','#d4831a','#8b5cf6','#c0392b'][i % 5]
    }))
  )
  const dayAreaData = $derived(
    (breakdown.byDay || []).map(row => ({ date: row.date, value: Number(row.total_cost || 0) }))
  )

  // input/select shared style
  const inputStyle = "background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.3rem 0.75rem; font-size:0.8rem; color:#c8bdb6; outline:none;"
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Usage</h1>
    <p style="color:#8a7f78; font-size:0.78rem;">every token squeezed from the free tier</p>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  <!-- Filters -->
  <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
    <select bind:value={filters.provider} onchange={load} style={inputStyle}>
      <option value="">all providers</option>
      {#each providerList as p}<option value={p}>{p}</option>{/each}
    </select>
    <input type="date" bind:value={filters.date_from} onchange={load} style={inputStyle} />
    <input type="date" bind:value={filters.date_to} onchange={load} style={inputStyle} />
    <select bind:value={filters.limit} onchange={load} style={inputStyle}>
      <option value={50}>50 rows</option>
      <option value={100}>100 rows</option>
      <option value={500}>500 rows</option>
    </select>
    <button onclick={load} style="background:#27864a; color:#fff; font-size:0.8rem; padding:0.3rem 0.9rem; border-radius:6px; border:none; cursor:pointer; opacity:{loading ? 0.6 : 1};">
      {loading ? '...' : 'refresh'}
    </button>
  </div>

  <!-- Breakdown charts -->
  {#if breakdown.byProvider?.length}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DashboardCard title="Cost by provider" accent="green">
        <BarChart data={providerBarData} height={160} showLabels={true} />
      </DashboardCard>
      <DashboardCard title="Cost by day" accent="orange">
        {#if dayAreaData.length > 0}
          <AreaChart data={dayAreaData} height={160} color="#d4831a" />
        {:else}
          <div style="text-align:center; padding:1.5rem 0; color:#8a7f78; font-size:0.78rem;">no daily data</div>
        {/if}
      </DashboardCard>
    </div>
  {/if}

  <!-- Request table -->
  <DashboardCard title="Request log" accent="blue">
    <div style="overflow-x:auto;">
      <table style="width:100%; font-size:0.72rem; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #3a3530;">
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Time</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Provider</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Model</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">App</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Tokens</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Cost</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Latency</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; text-transform:uppercase; font-size:0.62rem; letter-spacing:0.06em;">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each requests as req}
            <tr style="border-bottom:1px solid rgba(58,53,48,0.5);">
              <td style="padding:0.4rem 0.75rem; color:#8a7f78;">{new Date(req.timestamp).toLocaleString()}</td>
              <td style="padding:0.4rem 0.75rem; color:#4a6fa8;">{req.provider}</td>
              <td style="padding:0.4rem 0.75rem; color:#c8bdb6;">{req.model}</td>
              <td style="padding:0.4rem 0.75rem; color:#8a7f78;">{req.app_name || '—'}</td>
              <td style="padding:0.4rem 0.75rem; text-align:right; color:#c8bdb6;">{req.total_tokens ?? '—'}</td>
              <td style="padding:0.4rem 0.75rem; text-align:right; color:#27864a;">{fmtCost(req.cost)}</td>
              <td style="padding:0.4rem 0.75rem; text-align:right; color:#8a7f78;">{req.latency_ms ? `${req.latency_ms}ms` : '—'}</td>
              <td style="padding:0.4rem 0.75rem; text-align:right;">
                <span style="padding:0.1rem 0.4rem; border-radius:4px; font-size:0.65rem; background:{req.status === 'success' ? 'rgba(39,134,74,0.2)' : 'rgba(192,57,43,0.2)'}; color:{req.status === 'success' ? '#27864a' : '#c0392b'};">{req.status || 'ok'}</span>
              </td>
            </tr>
          {:else}
            <tr><td colspan="8" style="padding:2rem; text-align:center; color:#8a7f78;">no usage data yet</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </DashboardCard>
</div>
