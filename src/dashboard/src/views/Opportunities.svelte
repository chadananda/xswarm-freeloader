<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import ProviderCard from '../components/ProviderCard.svelte'
  //
  let status = $state(null)
  let loading = $state(true)
  let configuredProviders = $state(new Set())
  //
  onMount(async () => {
    try { status = await api.onboardingStatus() } catch { status = null }
    loading = false
  })
  //
  const unconfigured = $derived(status?.free_tier_unconfigured?.filter(p => !configuredProviders.has(p.id)) || [])
  //
  function handleConfigured(id) {
    configuredProviders = new Set([...configuredProviders, id])
  }
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Opportunities</h1>
    <p style="color:#8b8579; font-size:0.78rem;">ways to save more money and route smarter</p>
  </div>
  {#if loading}
    <div style="color:#8b8579; font-size:0.85rem;">analyzing your setup...</div>
  {:else}
    <div class="space-y-4">
      {#each unconfigured as provider}
        <ProviderCard {provider} onConfigured={handleConfigured} />
      {/each}
      {#if unconfigured.length === 0}
        <DashboardCard accent="green">
          <div style="text-align:center; padding:1rem 0;">
            <div style="font-size:1.5rem; margin-bottom:0.5rem;">🎉</div>
            <p style="font-size:0.9rem; color:#27864a; font-weight:600; margin:0 0 0.25rem;">All free tiers configured!</p>
            <p style="font-size:0.78rem; color:#8b8579; margin:0;">You're getting the most out of every provider.</p>
          </div>
        </DashboardCard>
      {/if}
      <div style="border-left:3px solid #4a6fa8; border-radius:0 8px 8px 0;">
        <DashboardCard accent="blue">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;">
            <div>
              <h3 style="font-weight:600; color:#2d2a26; font-size:0.9rem; margin:0 0 0.3rem;">Set up a local model</h3>
              <p style="font-size:0.78rem; color:#8b8579; margin:0;">Install Ollama and run a local model for completely private, zero-cost requests.</p>
            </div>
            <span style="font-size:0.75rem; background:#e8e2d8; padding:0.25rem 0.6rem; border-radius:5px; color:#2d2a26; white-space:nowrap; flex-shrink:0;">Private + free</span>
          </div>
        </DashboardCard>
      </div>
    </div>
  {/if}
</div>
