<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

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
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Usage</h1>
    <p class="text-gray-400 text-sm">every token squeezed from the free tier</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  <div class="flex flex-wrap gap-3 mb-4">
    <select bind:value={filters.provider} onchange={load} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
      <option value="">all providers</option>
      {#each providerList as p}<option value={p}>{p}</option>{/each}
    </select>
    <input type="date" bind:value={filters.date_from} onchange={load} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
    <input type="date" bind:value={filters.date_to} onchange={load} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
    <select bind:value={filters.limit} onchange={load} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
      <option value={50}>50 rows</option>
      <option value={100}>100 rows</option>
      <option value={500}>500 rows</option>
    </select>
    <button onclick={load} class="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">{loading ? '...' : 'refresh'}</button>
  </div>
  {#if breakdown.byProvider?.length}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">cost by provider</h2>
        <div class="space-y-2">
          {#each breakdown.byProvider as row}
            <div class="flex justify-between text-sm">
              <span class="text-gray-300">{row.provider}</span>
              <span class="text-red-400">{fmtCost(row.total_cost)}</span>
            </div>
          {/each}
        </div>
      </div>
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">cost by day</h2>
        <div class="space-y-2">
          {#each breakdown.byDay as row}
            <div class="flex justify-between text-sm">
              <span class="text-gray-300">{row.date}</span>
              <span class="text-red-400">{fmtCost(row.total_cost)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
  <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-gray-700 text-gray-400 uppercase">
          <th class="text-left px-4 py-3">Time</th>
          <th class="text-left px-4 py-3">Provider</th>
          <th class="text-left px-4 py-3">Model</th>
          <th class="text-left px-4 py-3">App</th>
          <th class="text-right px-4 py-3">Tokens</th>
          <th class="text-right px-4 py-3">Cost</th>
          <th class="text-right px-4 py-3">Latency</th>
          <th class="text-right px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each requests as req}
          <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
            <td class="px-4 py-2.5 text-gray-400">{new Date(req.timestamp).toLocaleString()}</td>
            <td class="px-4 py-2.5 text-blue-300">{req.provider}</td>
            <td class="px-4 py-2.5 text-gray-300">{req.model}</td>
            <td class="px-4 py-2.5 text-gray-400">{req.app_name || '—'}</td>
            <td class="px-4 py-2.5 text-right text-gray-300">{req.total_tokens ?? '—'}</td>
            <td class="px-4 py-2.5 text-right text-green-400">{fmtCost(req.cost)}</td>
            <td class="px-4 py-2.5 text-right text-gray-400">{req.latency_ms ? `${req.latency_ms}ms` : '—'}</td>
            <td class="px-4 py-2.5 text-right">
              <span class="px-1.5 py-0.5 rounded text-xs {req.status === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}">{req.status || 'ok'}</span>
            </td>
          </tr>
        {:else}
          <tr><td colspan="8" class="px-4 py-8 text-center text-gray-500">no usage data yet</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
