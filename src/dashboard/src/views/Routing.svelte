<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

  let routing = $state(null)
  let error = $state('')
  let saving = $state(false)
  let saved = $state(false)

  const presets = {
    balanced: { cost_weight: 0.33, speed_weight: 0.34, quality_weight: 0.33 },
    'cost-first': { cost_weight: 0.7, speed_weight: 0.2, quality_weight: 0.1 },
    'speed-first': { cost_weight: 0.2, speed_weight: 0.7, quality_weight: 0.1 },
    'quality-first': { cost_weight: 0.1, speed_weight: 0.2, quality_weight: 0.7 }
  }

  onMount(async () => {
    try { routing = await api.routing() }
    catch (err) { error = err.message }
  })

  function applyPreset(key) {
    if (!routing) return
    Object.assign(routing, presets[key])
    normalize()
  }

  function normalize() {
    if (!routing) return
    const sum = routing.cost_weight + routing.speed_weight + routing.quality_weight
    if (sum === 0) return
    routing.cost_weight = Math.round((routing.cost_weight / sum) * 100) / 100
    routing.speed_weight = Math.round((routing.speed_weight / sum) * 100) / 100
    routing.quality_weight = Math.round((1 - routing.cost_weight - routing.speed_weight) * 100) / 100
  }

  async function save() {
    saving = true
    try {
      await api.updateRouting(routing)
      saved = true
      setTimeout(() => { saved = false }, 2000)
    } catch (err) {
      error = err.message
    } finally {
      saving = false
    }
  }

  const total = $derived(routing ? Math.round((routing.cost_weight + routing.speed_weight + routing.quality_weight) * 100) / 100 : 0)
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Routing Strategy</h1>
    <p class="text-gray-400 text-sm">tune the freeloading algorithm</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  {#if routing}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 class="text-sm font-semibold text-gray-300 mb-4">presets</h2>
        <div class="grid grid-cols-2 gap-2 mb-6">
          {#each Object.keys(presets) as key}
            <button onclick={() => applyPreset(key)} class="bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-lg px-3 py-2 transition-colors text-left">
              <div class="font-medium capitalize">{key}</div>
              <div class="text-xs text-gray-400">cost {Math.round(presets[key].cost_weight*100)}% / speed {Math.round(presets[key].speed_weight*100)}% / quality {Math.round(presets[key].quality_weight*100)}%</div>
            </button>
          {/each}
        </div>
        <h2 class="text-sm font-semibold text-gray-300 mb-4">manual weights</h2>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="text-red-400">cost</span><span class="text-white">{Math.round(routing.cost_weight * 100)}%</span></div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.cost_weight} oninput={normalize} class="w-full accent-red-400" />
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="text-blue-400">speed</span><span class="text-white">{Math.round(routing.speed_weight * 100)}%</span></div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.speed_weight} oninput={normalize} class="w-full accent-blue-400" />
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1"><span class="text-green-400">quality</span><span class="text-white">{Math.round(routing.quality_weight * 100)}%</span></div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.quality_weight} oninput={normalize} class="w-full accent-green-400" />
          </div>
        </div>
        <div class="mt-3 text-xs {Math.abs(total - 1) > 0.01 ? 'text-red-400' : 'text-gray-400'}">
          total: {Math.round(total * 100)}% {Math.abs(total - 1) > 0.01 ? '(should sum to 100%)' : ''}
        </div>
        <button onclick={save} disabled={saving} class="mt-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {saving ? 'saving...' : saved ? 'saved!' : 'save weights'}
        </button>
      </div>
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 class="text-sm font-semibold text-gray-300 mb-4">per-tier overrides</h2>
        <div class="space-y-3">
          {#each (routing.tier_overrides || []) as tier}
            <div class="bg-gray-700/50 rounded-lg p-3">
              <div class="font-medium text-sm text-white mb-1 capitalize">{tier.name}</div>
              <div class="grid grid-cols-3 gap-2 text-xs text-gray-400">
                <span>cost: {Math.round((tier.cost_weight || 0) * 100)}%</span>
                <span>speed: {Math.round((tier.speed_weight || 0) * 100)}%</span>
                <span>quality: {Math.round((tier.quality_weight || 0) * 100)}%</span>
              </div>
            </div>
          {:else}
            <div class="text-gray-500 text-sm">no tier overrides configured — using global weights</div>
          {/each}
        </div>
        {#if routing.strategy}
          <div class="mt-4 pt-4 border-t border-gray-700">
            <div class="text-xs text-gray-400">active strategy</div>
            <div class="text-sm text-green-400 font-medium capitalize mt-1">{routing.strategy}</div>
          </div>
        {/if}
      </div>
    </div>
  {:else if !error}
    <div class="text-gray-400 text-sm">loading routing config...</div>
  {/if}
</div>
