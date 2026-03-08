<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

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

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Opportunities</h1>
    <p class="text-gray-400 text-sm">ways to save more money and route smarter</p>
  </div>
  {#if loading}
    <div class="text-gray-400 text-sm">analyzing your setup...</div>
  {:else}
    <div class="space-y-4">
      {#each opportunities() as op}
        <div class="bg-gray-800 rounded-xl border-l-4 {op.type === 'free_tier' ? 'border-green-500' : 'border-blue-500'} border border-gray-700 p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-medium text-white">{op.title}</h3>
              <p class="text-sm text-gray-400 mt-1">{op.description}</p>
            </div>
            <span class="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300 whitespace-nowrap shrink-0">{op.impact}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
