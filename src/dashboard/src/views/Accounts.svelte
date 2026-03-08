<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

  let accounts = $state([])
  let providers = $state([])
  let error = $state('')
  let success = $state('')
  // Add form
  let newProviderId = $state('')
  let newApiKey = $state('')
  let adding = $state(false)
  // Edit key modal
  let editAccount = $state(null)
  let editKey = $state('')
  let editing = $state(false)
  // Test status per id
  let testing = $state({})
  let testResults = $state({})

  async function load() {
    try {
      const [accs, provs] = await Promise.all([api.accounts(), api.providers()])
      accounts = accs
      providers = provs
      error = ''
    } catch (err) { error = err.message }
  }

  onMount(load)

  const usedProviderIds = $derived(new Set(accounts.map(a => a.provider_id)))
  const availableProviders = $derived(providers.filter(p => !usedProviderIds.has(p.id)))

  async function addAccount() {
    if (!newProviderId || !newApiKey) return
    adding = true
    error = ''
    try {
      await api.createAccount({ provider_id: newProviderId, api_key: newApiKey })
      newProviderId = ''
      newApiKey = ''
      success = 'Account added'
      setTimeout(() => { success = '' }, 3000)
      await load()
    } catch (err) { error = err.message }
    adding = false
  }

  async function deleteAccount(id) {
    error = ''
    try {
      await api.deleteAccount(id)
      success = 'Account removed'
      setTimeout(() => { success = '' }, 3000)
      await load()
    } catch (err) { error = err.message }
  }

  function openEdit(account) {
    editAccount = account
    editKey = ''
  }

  async function saveKey() {
    if (!editKey || !editAccount) return
    editing = true
    error = ''
    try {
      await api.updateAccountKey(editAccount.id, editKey)
      success = 'API key updated'
      setTimeout(() => { success = '' }, 3000)
      editAccount = null
      editKey = ''
      await load()
    } catch (err) { error = err.message }
    editing = false
  }

  async function testAccount(id) {
    testing = { ...testing, [id]: true }
    testResults = { ...testResults, [id]: null }
    try {
      const result = await api.testAccount(id)
      testResults = { ...testResults, [id]: result }
    } catch (err) {
      testResults = { ...testResults, [id]: { ok: false, error: err.message } }
    }
    testing = { ...testing, [id]: false }
  }

  const statusColor = (status) =>
    status === 'active' ? 'text-green-400' :
    status === 'invalid' ? 'text-red-400' :
    'text-gray-400'

  const statusBg = (status) =>
    status === 'active' ? 'bg-green-900/50 text-green-400' :
    status === 'invalid' ? 'bg-red-900/50 text-red-400' :
    'bg-gray-700 text-gray-400'
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Accounts</h1>
    <p class="text-gray-400 text-sm">manage API keys for each provider</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  {#if success}
    <div class="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded-lg p-3 mb-4">{success}</div>
  {/if}
  <!-- Add account form -->
  <div class="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
    <h2 class="text-sm font-semibold text-gray-300 mb-3">Add Provider Account</h2>
    <div class="flex flex-wrap gap-3">
      <select
        bind:value={newProviderId}
        class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 min-w-40"
      >
        <option value="">select provider...</option>
        {#each availableProviders as p}
          <option value={p.id}>{p.name}</option>
        {/each}
        {#each providers.filter(p => usedProviderIds.has(p.id)) as p}
          <option value={p.id}>{p.name} (add another key)</option>
        {/each}
      </select>
      <input
        type="password"
        bind:value={newApiKey}
        placeholder="API key..."
        class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 flex-1 min-w-48"
      />
      <button
        onclick={addAccount}
        disabled={adding || !newProviderId || !newApiKey}
        class="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
      >
        {adding ? 'adding...' : 'Add Account'}
      </button>
    </div>
  </div>
  <!-- Accounts table -->
  <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-700 text-gray-400 text-xs uppercase">
          <th class="text-left px-4 py-3">Provider</th>
          <th class="text-left px-4 py-3">Status</th>
          <th class="text-left px-4 py-3">Added</th>
          <th class="text-left px-4 py-3">Test Result</th>
          <th class="text-right px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each accounts as acc}
          <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
            <td class="px-4 py-3 font-medium text-white">
              {acc.provider?.name || acc.provider_id}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs {statusBg(acc.status)}">
                {acc.status || 'unknown'}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-400 text-xs">
              {acc.created_at ? new Date(acc.created_at * 1000).toLocaleDateString() : '—'}
            </td>
            <td class="px-4 py-3 text-xs">
              {#if testing[acc.id]}
                <span class="text-gray-400">testing...</span>
              {:else if testResults[acc.id] != null}
                {#if testResults[acc.id].ok}
                  <span class="text-green-400">active</span>
                {:else}
                  <span class="text-red-400">{testResults[acc.id].error || 'invalid'}</span>
                {/if}
              {:else}
                <span class="text-gray-600">—</span>
              {/if}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  onclick={() => testAccount(acc.id)}
                  disabled={testing[acc.id]}
                  class="px-2.5 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {testing[acc.id] ? '...' : 'test'}
                </button>
                <button
                  onclick={() => openEdit(acc)}
                  class="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                >
                  rotate key
                </button>
                <button
                  onclick={() => deleteAccount(acc.id)}
                  class="px-2.5 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 text-xs rounded-lg transition-colors"
                >
                  remove
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="5" class="px-4 py-8 text-center text-gray-500">
              no accounts yet — add your first provider API key above
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<!-- Edit key modal -->
{#if editAccount}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick={() => { editAccount = null }}>
    <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-white font-semibold mb-1">Rotate API Key</h2>
      <p class="text-gray-400 text-sm mb-4">
        Update the API key for <span class="text-white">{editAccount.provider?.name || editAccount.provider_id}</span>
      </p>
      <input
        type="password"
        bind:value={editKey}
        placeholder="new API key..."
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
      />
      <div class="flex justify-end gap-3">
        <button
          onclick={() => { editAccount = null }}
          class="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
        >
          cancel
        </button>
        <button
          onclick={saveKey}
          disabled={editing || !editKey}
          class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
        >
          {editing ? 'saving...' : 'save key'}
        </button>
      </div>
    </div>
  </div>
{/if}
