<script>
  // :arch: accounts view — manage provider API keys with add/rotate/test/delete
  // :why: DashboardCard theming; inline table replaces raw gray-800 divs
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'

  let accounts = $state([])
  let providers = $state([])
  let error = $state('')
  let success = $state('')
  let newProviderId = $state('')
  let newApiKey = $state('')
  let adding = $state(false)
  let editAccount = $state(null)
  let editKey = $state('')
  let editing = $state(false)
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

  function openEdit(account) { editAccount = account; editKey = '' }

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

  const statusStyle = (status) =>
    status === 'active' ? 'background:rgba(39,134,74,0.2); color:#27864a;' :
    status === 'invalid' ? 'background:rgba(192,57,43,0.2); color:#c0392b;' :
    'background:rgba(58,53,48,0.5); color:#8a7f78;'

  const inputStyle = "background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.35rem 0.75rem; font-size:0.8rem; color:#c8bdb6; outline:none;"
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Accounts</h1>
    <p style="color:#8a7f78; font-size:0.78rem;">manage API keys for each provider</p>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  {#if success}
    <div style="color:#27864a; font-size:0.75rem; background:rgba(39,134,74,0.1); border:1px solid rgba(39,134,74,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{success}</div>
  {/if}
  <!-- Add account -->
  <DashboardCard title="Add provider account" accent="green">
    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
      <select bind:value={newProviderId} style="{inputStyle} min-width:10rem;">
        <option value="">select provider...</option>
        {#each availableProviders as p}<option value={p.id}>{p.name}</option>{/each}
        {#each providers.filter(p => usedProviderIds.has(p.id)) as p}
          <option value={p.id}>{p.name} (add another key)</option>
        {/each}
      </select>
      <input type="password" bind:value={newApiKey} placeholder="API key..." style="{inputStyle} flex:1; min-width:12rem;" />
      <button onclick={addAccount} disabled={adding || !newProviderId || !newApiKey}
        style="background:#27864a; color:#fff; font-size:0.8rem; padding:0.35rem 0.9rem; border-radius:6px; border:none; cursor:pointer; opacity:{adding || !newProviderId || !newApiKey ? 0.5 : 1};">
        {adding ? 'adding...' : 'Add Account'}
      </button>
    </div>
  </DashboardCard>
  <!-- Accounts table -->
  <DashboardCard title="Provider accounts" accent="green">
    <div style="overflow-x:auto;">
      <table style="width:100%; font-size:0.78rem; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #3a3530;">
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Provider</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Status</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Added</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Test Result</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each accounts as acc}
            <tr style="border-bottom:1px solid rgba(58,53,48,0.5);">
              <td style="padding:0.5rem 0.75rem; color:#c8bdb6; font-weight:600;">{acc.provider?.name || acc.provider_id}</td>
              <td style="padding:0.5rem 0.75rem;">
                <span style="padding:0.15rem 0.5rem; border-radius:10px; font-size:0.65rem; {statusStyle(acc.status)}">{acc.status || 'unknown'}</span>
              </td>
              <td style="padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.7rem;">
                {acc.created_at ? new Date(acc.created_at * 1000).toLocaleDateString() : '—'}
              </td>
              <td style="padding:0.5rem 0.75rem; font-size:0.7rem;">
                {#if testing[acc.id]}
                  <span style="color:#8a7f78;">testing...</span>
                {:else if testResults[acc.id] != null}
                  {#if testResults[acc.id].ok}
                    <span style="color:#27864a;">active</span>
                  {:else}
                    <span style="color:#c0392b;">{testResults[acc.id].error || 'invalid'}</span>
                  {/if}
                {:else}
                  <span style="color:#5a5248;">—</span>
                {/if}
              </td>
              <td style="padding:0.5rem 0.75rem; text-align:right;">
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:0.4rem;">
                  <button onclick={() => testAccount(acc.id)} disabled={testing[acc.id]}
                    style="padding:0.2rem 0.6rem; background:rgba(74,111,168,0.2); color:#4a6fa8; font-size:0.7rem; border-radius:5px; border:none; cursor:pointer; opacity:{testing[acc.id] ? 0.5 : 1};">
                    {testing[acc.id] ? '...' : 'test'}
                  </button>
                  <button onclick={() => openEdit(acc)}
                    style="padding:0.2rem 0.6rem; background:#2e2a27; color:#c8bdb6; font-size:0.7rem; border-radius:5px; border:none; cursor:pointer;">
                    rotate key
                  </button>
                  <button onclick={() => deleteAccount(acc.id)}
                    style="padding:0.2rem 0.6rem; background:rgba(192,57,43,0.2); color:#c0392b; font-size:0.7rem; border-radius:5px; border:none; cursor:pointer;">
                    remove
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            <tr><td colspan="5" style="padding:2rem; text-align:center; color:#8a7f78;">no accounts yet — add your first provider API key above</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </DashboardCard>
</div>

<!-- Edit key modal -->
{#if editAccount}
  <div style="position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:50;" onclick={() => { editAccount = null }}>
    <div style="background:#252220; border:1px solid #3a3530; border-radius:12px; padding:1.5rem; width:100%; max-width:26rem; margin:0 1rem;" onclick={(e) => e.stopPropagation()}>
      <h2 style="font-family:'Permanent Marker',cursive; color:#27864a; margin:0 0 0.3rem;">Rotate API Key</h2>
      <p style="color:#8a7f78; font-size:0.78rem; margin:0 0 1rem;">
        Update the API key for <span style="color:#c8bdb6;">{editAccount.provider?.name || editAccount.provider_id}</span>
      </p>
      <input type="password" bind:value={editKey} placeholder="new API key..."
        style="width:100%; background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#c8bdb6; outline:none; box-sizing:border-box; margin-bottom:1rem;" />
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button onclick={() => { editAccount = null }}
          style="padding:0.4rem 1rem; background:#2e2a27; color:#c8bdb6; font-size:0.8rem; border-radius:6px; border:none; cursor:pointer;">
          cancel
        </button>
        <button onclick={saveKey} disabled={editing || !editKey}
          style="padding:0.4rem 1rem; background:#4a6fa8; color:#fff; font-size:0.8rem; border-radius:6px; border:none; cursor:pointer; opacity:{editing || !editKey ? 0.5 : 1};">
          {editing ? 'saving...' : 'save key'}
        </button>
      </div>
    </div>
  </div>
{/if}
