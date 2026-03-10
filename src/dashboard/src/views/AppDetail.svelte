<script>
  // :arch: app detail view — per-app stats, keys, policy, sanitization, cost breakdown
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import { routeParams, navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import DonutChart from '../components/DonutChart.svelte'
  import AreaChart from '../components/AreaChart.svelte'
  //
  let detail = $state(null)
  let usage = $state([])
  let policy = $state(null)
  let keys = $state([])
  let error = $state('')
  let newKeyShown = $state(null)
  let policyForm = $state({ allowed_providers: '', blocked_providers: '', data_residency: 'any', force_local_on_pii: false, max_cost_per_request: '', rate_limit_rpm: '', token_limit_daily: '' })
  let savingPolicy = $state(false)
  let policySaved = $state(false)
  //
  const appId = $derived(routeParams.id)
  //
  onMount(async () => {
    await loadAll()
  })
  //
  async function loadAll() {
    try {
      const [d, u, p] = await Promise.all([
        api.getAppDetail(appId),
        api.getAppUsage(appId, { days: 30 }),
        api.getAppPolicy(appId)
      ])
      detail = d
      usage = u
      keys = d.keys || []
      policy = p
      if (p && Object.keys(p).length > 0) {
        policyForm = {
          allowed_providers: (p.allowed_providers || []).join(', '),
          blocked_providers: (p.blocked_providers || []).join(', '),
          data_residency: p.data_residency || 'any',
          force_local_on_pii: !!p.force_local_on_pii,
          max_cost_per_request: p.max_cost_per_request || '',
          rate_limit_rpm: p.rate_limit_rpm || '',
          token_limit_daily: p.token_limit_daily || ''
        }
      }
    } catch (err) { error = err.message }
  }
  //
  async function createKey() {
    try {
      const result = await api.createAppKey(appId, {})
      newKeyShown = result.key
      keys = await api.appKeys(appId)
    } catch (err) { error = err.message }
  }
  //
  async function revokeKey(keyId) {
    if (!confirm('Revoke this key? It will stop working immediately.')) return
    try {
      await api.revokeAppKey(appId, keyId)
      keys = await api.appKeys(appId)
    } catch (err) { error = err.message }
  }
  //
  async function rotateKey(keyId) {
    try {
      const result = await api.rotateAppKey(appId, keyId)
      newKeyShown = result.key
      keys = await api.appKeys(appId)
    } catch (err) { error = err.message }
  }
  //
  async function savePolicy(e) {
    e.preventDefault()
    savingPolicy = true
    try {
      const data = {
        allowed_providers: policyForm.allowed_providers ? policyForm.allowed_providers.split(',').map(s => s.trim()).filter(Boolean) : null,
        blocked_providers: policyForm.blocked_providers ? policyForm.blocked_providers.split(',').map(s => s.trim()).filter(Boolean) : null,
        data_residency: policyForm.data_residency,
        force_local_on_pii: policyForm.force_local_on_pii ? 1 : 0,
        max_cost_per_request: policyForm.max_cost_per_request ? Number(policyForm.max_cost_per_request) : null,
        rate_limit_rpm: policyForm.rate_limit_rpm ? Number(policyForm.rate_limit_rpm) : null,
        token_limit_daily: policyForm.token_limit_daily ? Number(policyForm.token_limit_daily) : null
      }
      await api.updateAppPolicy(appId, data)
      policySaved = true
      setTimeout(() => { policySaved = false }, 2000)
    } catch (err) { error = err.message }
    finally { savingPolicy = false }
  }
  //
  const donutData = $derived(
    detail?.costByProvider?.map(p => ({
      label: p.provider_name || p.provider_id,
      value: p.total_cost || 0
    })) || []
  )
  //
  const inputStyle = "background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.85rem; color:#c8bdb6; outline:none; width:100%; box-sizing:border-box;"
</script>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="space-y-5">
  <div style="display:flex; align-items:center; gap:1rem;">
    <span onclick={() => navigate('#/apps')} style="cursor:pointer; color:#8a7f78; font-size:0.85rem;">← Apps</span>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">{detail?.app?.name || 'App Detail'}</h1>
    {#if detail?.app?.trust_tier}
      <span style="padding:0.15rem 0.5rem; border-radius:10px; font-size:0.65rem; background:rgba(74,111,168,0.2); color:#4a6fa8;">{detail.app.trust_tier}</span>
    {/if}
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  {#if detail}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard accent="green">
        <div style="font-size:0.65rem; color:#8a7f78; text-transform:uppercase;">Requests Today</div>
        <div style="font-size:1.5rem; font-weight:700; color:#c8bdb6;">{detail.stats?.today?.requests || 0}</div>
      </DashboardCard>
      <DashboardCard accent="blue">
        <div style="font-size:0.65rem; color:#8a7f78; text-transform:uppercase;">Cost Today</div>
        <div style="font-size:1.5rem; font-weight:700; color:#c8bdb6;">${(detail.stats?.today?.total_cost || 0).toFixed(4)}</div>
      </DashboardCard>
      <DashboardCard accent="orange">
        <div style="font-size:0.65rem; color:#8a7f78; text-transform:uppercase;">Avg Latency</div>
        <div style="font-size:1.5rem; font-weight:700; color:#c8bdb6;">{Math.round(detail.stats?.today?.avg_latency || 0)}ms</div>
      </DashboardCard>
      <DashboardCard accent="green">
        <div style="font-size:0.65rem; color:#8a7f78; text-transform:uppercase;">Cost This Month</div>
        <div style="font-size:1.5rem; font-weight:700; color:#c8bdb6;">${(detail.stats?.month?.total_cost || 0).toFixed(2)}</div>
      </DashboardCard>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <DashboardCard title="Usage Over Time" accent="blue">
        {#if usage.length > 0}
          <AreaChart data={usage.map(u => ({ label: u.date, value: u.cost || 0 }))} color="#4a6fa8" height={200} />
        {:else}
          <div style="text-align:center; color:#8a7f78; padding:2rem;">No usage data yet</div>
        {/if}
      </DashboardCard>
      <DashboardCard title="Backend Mix" accent="green">
        {#if donutData.length > 0}
          <DonutChart data={donutData} height={200} />
        {:else}
          <div style="text-align:center; color:#8a7f78; padding:2rem;">No provider data yet</div>
        {/if}
      </DashboardCard>
    </div>
    <DashboardCard title="API Keys" accent="blue">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <span style="font-size:0.78rem; color:#8a7f78;">{keys.filter(k => !k.revoked_at).length} active keys</span>
        <button onclick={createKey}
          style="background:#27864a; color:#fff; font-size:0.75rem; font-weight:600; padding:0.3rem 0.75rem; border-radius:6px; border:none; cursor:pointer;">
          + new key
        </button>
      </div>
      {#if newKeyShown}
        <div style="background:rgba(39,134,74,0.1); border:1px solid rgba(39,134,74,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem;">
          <div style="font-size:0.72rem; color:#27864a; margin-bottom:0.3rem;">New key (copy now — you won't see it again)</div>
          <code style="font-size:0.78rem; color:#c8bdb6; word-break:break-all;">{newKeyShown}</code>
        </div>
      {/if}
      {#each keys.filter(k => !k.revoked_at) as key}
        <div style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem; background:#2e2a27; border-radius:6px; margin-bottom:0.5rem;">
          <div>
            <code style="font-size:0.78rem; color:#c8bdb6;">{key.key_prefix}...</code>
            <span style="margin-left:0.5rem; font-size:0.65rem; color:#8a7f78;">
              {key.last_used_at ? `used ${new Date(key.last_used_at * 1000).toLocaleDateString()}` : 'never used'}
            </span>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button onclick={() => rotateKey(key.id)} style="font-size:0.7rem; background:none; border:none; cursor:pointer; color:#4a6fa8;">rotate</button>
            <button onclick={() => revokeKey(key.id)} style="font-size:0.7rem; background:none; border:none; cursor:pointer; color:#c0392b;">revoke</button>
          </div>
        </div>
      {:else}
        <div style="text-align:center; color:#8a7f78; font-size:0.78rem; padding:1rem;">No active keys</div>
      {/each}
    </DashboardCard>
    <DashboardCard title="Routing Policy" accent="orange">
      <form onsubmit={savePolicy} style="display:flex; flex-direction:column; gap:1rem;">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Allowed providers (comma-separated)</label>
            <input bind:value={policyForm.allowed_providers} placeholder="openai, anthropic" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Blocked providers (comma-separated)</label>
            <input bind:value={policyForm.blocked_providers} placeholder="cerebras" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Data residency</label>
            <select bind:value={policyForm.data_residency} style={inputStyle}>
              <option value="any">any</option>
              <option value="local">local only</option>
            </select>
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Max cost per request ($)</label>
            <input type="number" step="0.001" bind:value={policyForm.max_cost_per_request} placeholder="0.10" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Rate limit (RPM)</label>
            <input type="number" bind:value={policyForm.rate_limit_rpm} placeholder="60" style={inputStyle} />
          </div>
          <div>
            <label style="display:block; font-size:0.72rem; color:#8a7f78; margin-bottom:0.3rem;">Token limit (daily)</label>
            <input type="number" bind:value={policyForm.token_limit_daily} placeholder="1000000" style={inputStyle} />
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <input type="checkbox" id="force_local_pii" bind:checked={policyForm.force_local_on_pii} style="accent-color:#27864a;" />
          <label for="force_local_pii" style="font-size:0.85rem; color:#c8bdb6;">Force local providers when PII detected</label>
        </div>
        {#if policySaved}
          <div style="font-size:0.78rem; color:#27864a;">Policy saved!</div>
        {/if}
        <button type="submit" disabled={savingPolicy}
          style="background:#d4831a; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; opacity:{savingPolicy ? 0.6 : 1}; align-self:flex-start;">
          {savingPolicy ? 'saving...' : 'save policy'}
        </button>
      </form>
    </DashboardCard>
  {:else if !error}
    <div style="color:#8a7f78; font-size:0.85rem;">loading app detail...</div>
  {/if}
</div>
