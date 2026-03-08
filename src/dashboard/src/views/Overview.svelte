<script>
  import { onMount, onDestroy } from 'svelte'
  import { api } from '../lib/api.js'
  import StatCard from '../components/StatCard.svelte'
  import HealthBadge from '../components/HealthBadge.svelte'

  let overview = $state(null)
  let error = $state('')
  let interval = null

  async function load() {
    try {
      overview = await api.overview()
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
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Overview</h1>
    <p class="text-gray-400 text-sm">your free tiers at work — live stats every 5s</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  {#if overview}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Cost today" value={fmtBig(overview.costToday)} accent="red" subtitle="actual spend" />
      <StatCard label="Cost this month" value={fmtBig(overview.costMonth)} accent="red" subtitle="actual spend" />
      <StatCard label="Saved today" value={fmtBig(overview.savedToday)} accent="green" subtitle="vs paid equivalent" />
      <StatCard label="Saved this month" value={fmtBig(overview.savedMonth)} accent="green" subtitle="freeloading like a boss" />
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <StatCard label="Requests today" value={overview.requestsToday ?? '—'} accent="blue" />
      <StatCard label="Free tier hits" value={`${overview.freeTierPct ?? 0}%`} accent="green" subtitle="of all requests" />
      <StatCard label="Avg latency" value={overview.avgLatencyMs ? `${overview.avgLatencyMs}ms` : '—'} accent="blue" />
    </div>
    <div class="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
      <h2 class="text-sm font-semibold text-gray-300 mb-3">Provider Health</h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {#each (overview.providers || []) as p}
          <div class="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
            <span class="text-sm text-white truncate">{p.name}</span>
            <HealthBadge status={p.health} />
          </div>
        {/each}
      </div>
    </div>
    <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h2 class="text-sm font-semibold text-gray-300 mb-3">Live Request Feed</h2>
      <div class="space-y-2 max-h-72 overflow-y-auto">
        {#each (overview.recentRequests || []) as req}
          <div class="flex items-center gap-3 text-xs bg-gray-700/50 rounded-lg px-3 py-2">
            <span class="text-gray-400 w-20 shrink-0">{new Date(req.timestamp).toLocaleTimeString()}</span>
            <span class="text-blue-300 truncate flex-1">{req.provider}</span>
            <span class="text-gray-300 truncate flex-1">{req.model}</span>
            <span class="text-green-400 w-16 text-right">{fmt(req.cost)}</span>
            <span class="text-gray-400 w-16 text-right">{req.latencyMs}ms</span>
          </div>
        {:else}
          <div class="text-gray-500 text-sm text-center py-4">no requests yet — wake up those free tiers!</div>
        {/each}
      </div>
    </div>
  {:else if !error}
    <div class="text-gray-400 text-sm">loading the goods...</div>
  {/if}
</div>
