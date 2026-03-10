<script>
  // :arch: opportunities view — actionable tips to save more and route smarter
  // :why: DashboardCard with accent-colored left borders for visual hierarchy
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'

  let providers = $state([])
  let loading = $state(true)

  onMount(async () => {
    try { providers = await api.providers() }
    catch { providers = [] }
    loading = false
  })

  const opportunities = $derived(() => {
    const ops = []
    for (const p of providers) {
      const freeModels = (p.models || []).filter(m => m.free_tier)
      if (freeModels.length > 0 && p.health !== 'healthy') {
        ops.push({
          type: 'free_tier',
          title: `${p.name} has ${freeModels.length} free model(s)`,
          description: `Enable ${p.name} to access free tier models like ${freeModels[0].name}.`,
          impact: 'Could save $$$'
        })
      }
    }
    ops.push({
      type: 'tip',
      title: 'Add more provider API keys',
      description: 'More API keys = more free tier capacity. Add Groq, Mistral, and Gemini for maximum free routing.',
      impact: 'More free requests'
    })
    ops.push({
      type: 'tip',
      title: 'Set up a local model',
      description: 'Install Ollama and run a local model for completely private, zero-cost requests.',
      impact: 'Private + free'
    })
    return ops
  })
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Opportunities</h1>
    <p style="color:#8a7f78; font-size:0.78rem;">ways to save more money and route smarter</p>
  </div>
  {#if loading}
    <div style="color:#8a7f78; font-size:0.85rem;">analyzing your setup...</div>
  {:else}
    <div class="space-y-4">
      {#each opportunities() as op}
        <div style="position:relative; border-left:3px solid {op.type === 'free_tier' ? '#27864a' : '#4a6fa8'}; border-radius:0 8px 8px 0;">
          <DashboardCard accent={op.type === 'free_tier' ? 'green' : 'blue'}>
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;">
              <div>
                <h3 style="font-weight:600; color:#c8bdb6; font-size:0.9rem; margin:0 0 0.3rem;">{op.title}</h3>
                <p style="font-size:0.78rem; color:#8a7f78; margin:0;">{op.description}</p>
              </div>
              <span style="font-size:0.7rem; background:#2e2a27; padding:0.25rem 0.6rem; border-radius:5px; color:#c8bdb6; white-space:nowrap; flex-shrink:0;">{op.impact}</span>
            </div>
          </DashboardCard>
        </div>
      {/each}
    </div>
  {/if}
</div>
