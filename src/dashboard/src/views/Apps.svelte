<script>
  // :arch: apps view — create/delete apps, view API keys, per-app budgets
  // :why: DashboardCard wrapping for consistent dark paper theme
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import { navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'

  let apps = $state([])
  let error = $state('')
  let showCreate = $state(false)
  let creating = $state(false)
  let form = $state({ name: '', trust_tier: 'standard', budget_day: '', budget_month: '', sanitization_profile: 'off' })
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
        budget_month: form.budget_month ? Number(form.budget_month) : null,
        sanitization_profile: form.sanitization_profile
      })
      form = { name: '', trust_tier: 'standard', budget_day: '', budget_month: '', sanitization_profile: 'off' }
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
    } catch (err) { error = err.message }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    copiedKey = key
    setTimeout(() => { copiedKey = '' }, 2000)
  }

  const tierStyle = (tier) =>
    tier === 'trusted' ? 'background:rgba(39,134,74,0.2); color:#27864a;' :
    tier === 'standard' ? 'background:rgba(74,111,168,0.2); color:#4a6fa8;' :
    'background:rgba(212,131,26,0.2); color:#d4831a;'

  const inputStyle = "background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.85rem; color:#c8bdb6; outline:none; width:100%;"
</script>

<div class="space-y-5">
  <div style="display:flex; align-items:center; justify-content:space-between;">
    <div>
      <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Apps</h1>
      <p style="color:#8a7f78; font-size:0.78rem;">manage your API consumers</p>
    </div>
    <button onclick={() => { showCreate = !showCreate }}
      style="background:#27864a; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer;">
      + new app
    </button>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  {#if showCreate}
    <DashboardCard title="New app" accent="green">
      <form onsubmit={createApp}>
        <div class="grid grid-cols-2 gap-4" style="margin-bottom:1rem;">
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">App name</label>
            <input bind:value={form.name} required placeholder="my-cool-app" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Trust tier</label>
            <select bind:value={form.trust_tier} style={inputStyle}>
              {#each tiers as t}<option value={t}>{t}</option>{/each}
            </select>
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Daily budget ($, optional)</label>
            <input type="number" step="0.01" bind:value={form.budget_day} placeholder="0.50" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Monthly budget ($, optional)</label>
            <input type="number" step="0.01" bind:value={form.budget_month} placeholder="5.00" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Sanitization</label>
            <select bind:value={form.sanitization_profile} style={inputStyle}>
              <option value="off">off</option>
              <option value="standard">standard</option>
              <option value="aggressive">aggressive</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button type="submit" disabled={creating}
            style="background:#27864a; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; opacity:{creating ? 0.6 : 1};">
            {creating ? 'creating...' : 'create app'}
          </button>
          <button type="button" onclick={() => { showCreate = false }}
            style="background:#2e2a27; color:#c8bdb6; font-size:0.8rem; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer;">
            cancel
          </button>
        </div>
      </form>
    </DashboardCard>
  {/if}
  <div class="space-y-3">
    {#each apps as app}
      <DashboardCard accent="blue">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.75rem;">
          <div>
            <span onclick={() => navigate(`#/apps/${app.id}`)} style="font-weight:600; color:#c8bdb6; cursor:pointer; text-decoration:underline; text-decoration-color:#3a3530;">{app.name}</span>
            <span style="margin-left:0.5rem; padding:0.15rem 0.5rem; border-radius:10px; font-size:0.65rem; {tierStyle(app.trust_tier)}">{app.trust_tier}</span>
          </div>
          <button onclick={() => deleteApp(app.id)}
            style="color:#8a7f78; font-size:0.78rem; background:none; border:none; cursor:pointer;">delete</button>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem; background:#2e2a27; border-radius:6px; padding:0.4rem 0.75rem; margin-bottom:0.75rem;">
          <code style="font-size:0.72rem; color:#c8bdb6; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{app.api_key?.substring(0, 8)}...</code>
          <button onclick={() => copyKey(app.api_key)}
            style="font-size:0.7rem; background:none; border:none; cursor:pointer; color:{copiedKey === app.api_key ? '#27864a' : '#8a7f78'};">
            {copiedKey === app.api_key ? 'copied!' : 'copy'}
          </button>
        </div>
        <div style="display:flex; gap:1rem; font-size:0.72rem; color:#8a7f78; flex-wrap:wrap;">
          {#if app.budget_day}<span>daily limit: <span style="color:#c8bdb6;">${app.budget_day}</span></span>{/if}
          {#if app.budget_month}<span>monthly limit: <span style="color:#c8bdb6;">${app.budget_month}</span></span>{/if}
          <span>requests today: <span style="color:#4a6fa8;">{app.requests_today ?? 0}</span></span>
          <span>cost today: <span style="color:#c0392b;">${(app.cost_today ?? 0).toFixed(4)}</span></span>
        </div>
      </DashboardCard>
    {:else}
      <DashboardCard accent="orange">
        <div style="text-align:center; padding:2rem 0;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📦</div>
          <div style="font-size:0.85rem; color:#8a7f78;">no apps yet — create one to start freeloading</div>
        </div>
      </DashboardCard>
    {/each}
  </div>
</div>
