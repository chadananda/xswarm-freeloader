<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

  let apps = $state([])
  let error = $state('')
  let showCreate = $state(false)
  let creating = $state(false)
  let form = $state({ name: '', trust_tier: 'standard', budget_day: '', budget_month: '' })
  let copiedKey = $state('')

  const tiers = ['trusted', 'standard', 'experimental']

  onMount(loadApps)

  async function loadApps() {
    try { apps = await api.apps() }
    catch (err) { error = err.message }
  }

  async function createApp(e) {
    e.preventDefault()
    creating = true
    try {
      await api.createApp({
        name: form.name,
        trust_tier: form.trust_tier,
        budget_day: form.budget_day ? Number(form.budget_day) : null,
        budget_month: form.budget_month ? Number(form.budget_month) : null
      })
      form = { name: '', trust_tier: 'standard', budget_day: '', budget_month: '' }
      showCreate = false
      await loadApps()
    } catch (err) {
      error = err.message
    } finally {
      creating = false
    }
  }

  async function deleteApp(id) {
    if (!confirm('delete this app? the API key stops working immediately.')) return
    try {
      await api.deleteApp(id)
      await loadApps()
    } catch (err) {
      error = err.message
    }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    copiedKey = key
    setTimeout(() => { copiedKey = '' }, 2000)
  }
</script>

<div>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-xl font-bold text-white">Apps</h1>
      <p class="text-gray-400 text-sm">manage your API consumers</p>
    </div>
    <button onclick={() => { showCreate = !showCreate }} class="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
      + new app
    </button>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  {#if showCreate}
    <form onsubmit={createApp} class="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
      <h2 class="text-sm font-semibold text-gray-300 mb-4">new app</h2>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">App name</label>
          <input bind:value={form.name} required placeholder="my-cool-app" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Trust tier</label>
          <select bind:value={form.trust_tier} class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500">
            {#each tiers as t}<option value={t}>{t}</option>{/each}
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Daily budget ($, optional)</label>
          <input type="number" step="0.01" bind:value={form.budget_day} placeholder="0.50" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Monthly budget ($, optional)</label>
          <input type="number" step="0.01" bind:value={form.budget_month} placeholder="5.00" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
        </div>
      </div>
      <div class="flex gap-3">
        <button type="submit" disabled={creating} class="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {creating ? 'creating...' : 'create app'}
        </button>
        <button type="button" onclick={() => { showCreate = false }} class="text-gray-400 hover:text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">cancel</button>
      </div>
    </form>
  {/if}
  <div class="space-y-3">
    {#each apps as app}
      <div class="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <div class="flex items-start justify-between mb-3">
          <div>
            <span class="font-medium text-white">{app.name}</span>
            <span class="ml-2 px-2 py-0.5 rounded-full text-xs
              {app.trust_tier === 'trusted' ? 'bg-green-900/50 text-green-400' :
               app.trust_tier === 'standard' ? 'bg-blue-900/50 text-blue-400' :
               'bg-yellow-900/50 text-yellow-400'}">{app.trust_tier}</span>
          </div>
          <button onclick={() => deleteApp(app.id)} class="text-gray-500 hover:text-red-400 text-sm transition-colors">delete</button>
        </div>
        <div class="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2 mb-3">
          <code class="text-xs text-gray-300 flex-1 truncate">{app.api_key}</code>
          <button onclick={() => copyKey(app.api_key)} class="text-xs {copiedKey === app.api_key ? 'text-green-400' : 'text-gray-400 hover:text-white'} transition-colors">
            {copiedKey === app.api_key ? 'copied!' : 'copy'}
          </button>
        </div>
        <div class="flex gap-4 text-xs text-gray-400">
          {#if app.budget_day}<span>daily limit: <span class="text-white">${app.budget_day}</span></span>{/if}
          {#if app.budget_month}<span>monthly limit: <span class="text-white">${app.budget_month}</span></span>{/if}
          <span>requests today: <span class="text-blue-400">{app.requests_today ?? 0}</span></span>
          <span>cost today: <span class="text-red-400">${(app.cost_today ?? 0).toFixed(4)}</span></span>
        </div>
      </div>
    {:else}
      <div class="text-center text-gray-500 py-12 bg-gray-800 rounded-xl border border-gray-700">
        <div class="text-3xl mb-2">📦</div>
        <div class="text-sm">no apps yet — create one to start freeloading</div>
      </div>
    {/each}
  </div>
</div>
