<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import HealthBadge from '../components/HealthBadge.svelte'

  let providers = $state([])
  let error = $state('')
  let filterTier = $state('all')
  let filterCap = $state('')
  let search = $state('')

  const tiers = ['all', 'trusted', 'standard', 'experimental']

  onMount(async () => {
    try { providers = await api.providers() }
    catch (err) { error = err.message }
  })

  const filtered = $derived(providers.filter(p => {
    if (filterTier !== 'all' && p.trust_tier !== filterTier) return false
    if (filterCap && !(p.capabilities || []).includes(filterCap)) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }))

  const allCaps = $derived([...new Set(providers.flatMap(p => p.capabilities || []))])
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Providers</h1>
    <p class="text-gray-400 text-sm">all your freeloading sources</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  <div class="flex flex-wrap gap-3 mb-4">
    <input
      type="search"
      bind:value={search}
      placeholder="search providers..."
      class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
    />
    <select bind:value={filterTier} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
      {#each tiers as t}<option value={t}>{t === 'all' ? 'all tiers' : t}</option>{/each}
    </select>
    <select bind:value={filterCap} class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
      <option value="">all capabilities</option>
      {#each allCaps as c}<option value={c}>{c}</option>{/each}
    </select>
    <span class="text-gray-400 text-sm self-center">{filtered.length} providers</span>
  </div>
  <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-700 text-gray-400 text-xs uppercase">
          <th class="text-left px-4 py-3">Provider</th>
          <th class="text-left px-4 py-3">Trust Tier</th>
          <th class="text-left px-4 py-3">Health</th>
          <th class="text-left px-4 py-3">Models</th>
          <th class="text-left px-4 py-3">Capabilities</th>
          <th class="text-right px-4 py-3">Cost/1K tokens</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as p}
          <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
            <td class="px-4 py-3 font-medium text-white">{p.name}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs
                {p.trust_tier === 'trusted' ? 'bg-green-900/50 text-green-400' :
                 p.trust_tier === 'standard' ? 'bg-blue-900/50 text-blue-400' :
                 'bg-yellow-900/50 text-yellow-400'}"
              >{p.trust_tier || 'unknown'}</span>
            </td>
            <td class="px-4 py-3"><HealthBadge status={p.health} /></td>
            <td class="px-4 py-3 text-gray-300">{(p.models || []).length} models</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                {#each (p.capabilities || []).slice(0, 3) as cap}
                  <span class="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{cap}</span>
                {/each}
              </div>
            </td>
            <td class="px-4 py-3 text-right text-green-400">{p.costPer1k != null ? `$${p.costPer1k}` : 'free'}</td>
          </tr>
        {:else}
          <tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">no providers match your filters</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
