<script>
  // :arch: routing strategy view — cost/speed/quality weight sliders with presets
  // :why: DashboardCard wrapping for dark paper theme; logic unchanged
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'

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

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Routing Strategy</h1>
    <p style="color:#8a7f78; font-size:0.78rem;">tune the freeloading algorithm</p>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  {#if routing}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <DashboardCard title="Presets &amp; weights" accent="green">
        <div class="grid grid-cols-2 gap-2" style="margin-bottom:1.5rem;">
          {#each Object.keys(presets) as key}
            <button onclick={() => applyPreset(key)}
              style="background:#2e2a27; border:1px solid #3a3530; color:#c8bdb6; font-size:0.78rem; border-radius:6px; padding:0.5rem 0.75rem; cursor:pointer; text-align:left;">
              <div style="font-weight:600; text-transform:capitalize;">{key}</div>
              <div style="font-size:0.65rem; color:#8a7f78;">cost {Math.round(presets[key].cost_weight*100)}% / speed {Math.round(presets[key].speed_weight*100)}% / quality {Math.round(presets[key].quality_weight*100)}%</div>
            </button>
          {/each}
        </div>
        <div style="font-family:'Special Elite',serif; font-size:0.7rem; color:#8a7f78; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:1rem;">Manual weights</div>
        <div class="space-y-4">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.25rem;">
              <span style="color:#c0392b;">cost</span><span style="color:#c8bdb6;">{Math.round(routing.cost_weight * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.cost_weight} oninput={normalize} style="width:100%; accent-color:#c0392b;" />
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.25rem;">
              <span style="color:#4a6fa8;">speed</span><span style="color:#c8bdb6;">{Math.round(routing.speed_weight * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.speed_weight} oninput={normalize} style="width:100%; accent-color:#4a6fa8;" />
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.25rem;">
              <span style="color:#27864a;">quality</span><span style="color:#c8bdb6;">{Math.round(routing.quality_weight * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" bind:value={routing.quality_weight} oninput={normalize} style="width:100%; accent-color:#27864a;" />
          </div>
        </div>
        <div style="margin-top:0.75rem; font-size:0.72rem; color:{Math.abs(total - 1) > 0.01 ? '#c0392b' : '#8a7f78'};">
          total: {Math.round(total * 100)}% {Math.abs(total - 1) > 0.01 ? '(should sum to 100%)' : ''}
        </div>
        <button onclick={save} disabled={saving}
          style="margin-top:1rem; background:#27864a; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; opacity:{saving ? 0.6 : 1};">
          {saving ? 'saving...' : saved ? 'saved!' : 'save weights'}
        </button>
      </DashboardCard>
      <DashboardCard title="Per-tier overrides" accent="blue">
        <div class="space-y-3">
          {#each (routing.tier_overrides || []) as tier}
            <div style="background:#2e2a27; border-radius:6px; padding:0.75rem;">
              <div style="font-weight:600; font-size:0.85rem; color:#c8bdb6; margin-bottom:0.4rem; text-transform:capitalize;">{tier.name}</div>
              <div class="grid grid-cols-3 gap-2" style="font-size:0.72rem; color:#8a7f78;">
                <span>cost: {Math.round((tier.cost_weight || 0) * 100)}%</span>
                <span>speed: {Math.round((tier.speed_weight || 0) * 100)}%</span>
                <span>quality: {Math.round((tier.quality_weight || 0) * 100)}%</span>
              </div>
            </div>
          {:else}
            <div style="color:#8a7f78; font-size:0.78rem;">no tier overrides configured — using global weights</div>
          {/each}
        </div>
        {#if routing.strategy}
          <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid #3a3530;">
            <div style="font-size:0.72rem; color:#8a7f78;">active strategy</div>
            <div style="font-size:0.9rem; color:#27864a; font-weight:600; text-transform:capitalize; margin-top:0.25rem;">{routing.strategy}</div>
          </div>
        {/if}
      </DashboardCard>
    </div>
  {:else if !error}
    <div style="color:#8a7f78; font-size:0.85rem;">loading routing config...</div>
  {/if}
</div>
