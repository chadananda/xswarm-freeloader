<script>
  // :arch: providers view — filterable catalog of all configured providers
  // :why: DashboardCard wrapping; table style matches dark paper palette
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import HealthBadge from '../components/HealthBadge.svelte'

  let providers = $state([])
  let error = $state('')
  let filterTier = $state('all')
  let filterCap = $state('')
  let search = $state('')

  const tiers = ['all', 'trusted', 'standard', 'experimental']

  onMount(async () => {
    try { providers = await api.providers() }
    catch (err) { error = err.message }
  })

  const filtered = $derived(providers.filter(p => {
    if (filterTier !== 'all' && p.trust_tier !== filterTier) return false
    if (filterCap && !(p.capabilities || []).includes(filterCap)) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }))

  const allCaps = $derived([...new Set(providers.flatMap(p => p.capabilities || []))])

  const inputStyle = "background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.35rem 0.75rem; font-size:0.8rem; color:#c8bdb6; outline:none;"

  const tierStyle = (tier) =>
    tier === 'trusted' ? 'background:rgba(39,134,74,0.2); color:#27864a;' :
    tier === 'standard' ? 'background:rgba(74,111,168,0.2); color:#4a6fa8;' :
    'background:rgba(212,131,26,0.2); color:#d4831a;'
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Providers</h1>
    <p style="color:#8a7f78; font-size:0.78rem;">all your freeloading sources</p>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center;">
    <input type="search" bind:value={search} placeholder="search providers..." style="{inputStyle} width:12rem;" />
    <select bind:value={filterTier} style={inputStyle}>
      {#each tiers as t}<option value={t}>{t === 'all' ? 'all tiers' : t}</option>{/each}
    </select>
    <select bind:value={filterCap} style={inputStyle}>
      <option value="">all capabilities</option>
      {#each allCaps as c}<option value={c}>{c}</option>{/each}
    </select>
    <span style="color:#8a7f78; font-size:0.78rem;">{filtered.length} providers</span>
  </div>
  <DashboardCard accent="green">
    <div style="overflow-x:auto;">
      <table style="width:100%; font-size:0.78rem; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #3a3530;">
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Provider</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Trust Tier</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Health</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Degradation</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Models</th>
            <th style="text-align:left; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Capabilities</th>
            <th style="text-align:right; padding:0.5rem 0.75rem; color:#8a7f78; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em;">Cost/1K</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as p}
            <tr style="border-bottom:1px solid rgba(58,53,48,0.5);">
              <td style="padding:0.5rem 0.75rem; color:#c8bdb6; font-weight:600;">{p.name}</td>
              <td style="padding:0.5rem 0.75rem;">
                <span style="padding:0.15rem 0.5rem; border-radius:10px; font-size:0.65rem; {tierStyle(p.trust_tier)}">{p.trust_tier || 'unknown'}</span>
              </td>
              <td style="padding:0.5rem 0.75rem;"><HealthBadge status={p.health} /></td>
              <td style="padding:0.5rem 0.75rem;">
                {#if p.degradation}
                  <span style="padding:0.15rem 0.5rem; border-radius:10px; font-size:0.65rem; {p.degradation.score > 0.8 ? 'background:rgba(39,134,74,0.2); color:#27864a;' : p.degradation.score > 0.5 ? 'background:rgba(212,131,26,0.2); color:#d4831a;' : 'background:rgba(192,57,43,0.2); color:#c0392b;'}">
                    {(p.degradation.score * 100).toFixed(0)}%
                  </span>
                  {#if p.degradation.p50 != null}
                    <span style="font-size:0.6rem; color:#8a7f78; margin-left:0.25rem;">p50:{Math.round(p.degradation.p50)}ms</span>
                  {/if}
                {:else}
                  <span style="font-size:0.65rem; color:#8a7f78;">—</span>
                {/if}
              </td>
              <td style="padding:0.5rem 0.75rem; color:#c8bdb6;">{(p.models || []).length} models</td>
              <td style="padding:0.5rem 0.75rem;">
                <div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
                  {#each (p.capabilities || []).slice(0, 3) as cap}
                    <span style="padding:0.1rem 0.4rem; background:#2e2a27; border-radius:4px; font-size:0.65rem; color:#c8bdb6;">{cap}</span>
                  {/each}
                </div>
              </td>
              <td style="padding:0.5rem 0.75rem; text-align:right; color:#27864a;">{p.costPer1k != null ? `$${p.costPer1k}` : 'free'}</td>
            </tr>
          {:else}
            <tr><td colspan="7" style="padding:2rem; text-align:center; color:#8a7f78;">no providers match your filters</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </DashboardCard>
</div>
