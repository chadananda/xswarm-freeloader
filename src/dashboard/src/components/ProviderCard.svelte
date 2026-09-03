<script>
  import { api } from '../lib/api.js'
  import DashboardCard from './DashboardCard.svelte'
  //
  let { provider, configured = false, onConfigured = () => {}, showValueSummary = false } = $props()
  let apiKey = $state('')
  let testing = $state(false)
  let error = $state('')
  let success = $state(false)
  //
  const inputStyle = "background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; width:100%; box-sizing:border-box; transition:border-color 0.2s;"
  //
  async function addAndTest() {
    if (!apiKey.trim()) return
    testing = true
    error = ''
    try {
      const account = await api.createAccount({ provider_id: provider.id, api_key: apiKey.trim() })
      const test = await api.testAccount(account.id)
      if (test.ok) { success = true; onConfigured(provider.id) }
      else { error = test.error || 'Key validation failed'; await api.deleteAccount(account.id) }
    } catch (err) { error = err.message }
    finally { testing = false }
  }
  //
  const done = $derived(configured || success)
</script>

<div class="provider-card" class:done>
  <DashboardCard accent={done ? 'green' : 'blue'}>
    <div class="card-layout">
      <div class="card-body">
        <div class="card-name-row">
          <h3 class="card-name">{provider.name}</h3>
          {#if done}
            <span class="check-badge">✓</span>
          {/if}
        </div>
        <p class="card-desc">{provider.description}</p>
        {#if showValueSummary && provider.models?.length}
          <div class="value-tags">
            {#each (provider.models || []).filter(m => m.free_tier).slice(0, 3) as model}
              <span class="value-tag free">{model.name} — {model.free_tier_rpd?.toLocaleString() || '∞'} req/day free</span>
            {/each}
            {#each (provider.models || []).filter(m => !m.free_tier).slice(0, 2) as model}
              <span class="value-tag paid">{model.name} — ${model.pricing_input}/M in</span>
            {/each}
          </div>
        {/if}
        {#if !done}
          <div class="card-actions">
            {#if provider.signup_url}
              <a href={provider.signup_url} target="_blank" class="signup-link">
                Get free key <span class="arrow">→</span>
              </a>
            {/if}
            <div class="key-row">
              <label for="key-{provider.id}" class="sr-only">API key for {provider.name}</label>
              <input
                id="key-{provider.id}"
                type="password"
                bind:value={apiKey}
                placeholder={provider.key_format_hint || 'Paste your API key'}
                style={inputStyle}
                onkeydown={(e) => { if (e.key === 'Enter') addAndTest() }}
              />
              <button onclick={addAndTest} disabled={testing || !apiKey.trim()} class="test-btn">
                {#if testing}
                  <span class="spinner"></span> testing
                {:else}
                  Add & Test
                {/if}
              </button>
            </div>
            {#if error}
              <div class="error-row">{error}</div>
            {/if}
          </div>
        {:else}
          <div class="done-row">Configured and verified</div>
        {/if}
      </div>
    </div>
  </DashboardCard>
</div>

<style>
  .provider-card { transition: transform 0.2s ease; }
  .provider-card.done { opacity: 0.85; }
  .card-layout {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .card-body { flex: 1; min-width: 0; }
  .card-name-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.25rem;
  }
  .card-name {
    font-weight: 700;
    color: #2d2a26;
    font-size: 0.88rem;
    margin: 0;
  }
  .check-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2rem;
    height: 1.2rem;
    background: #27864a;
    color: #fff;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 700;
    animation: popIn 0.3s ease;
  }
  .card-desc {
    font-size: 0.78rem;
    color: #8b8579;
    margin: 0 0 0.6rem;
    line-height: 1.4;
  }
  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .signup-link {
    font-size: 0.78rem;
    color: #4a6fa8;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    transition: color 0.15s;
  }
  .signup-link:hover { color: #27864a; }
  .signup-link .arrow { transition: transform 0.15s; }
  .signup-link:hover .arrow { transform: translateX(2px); }
  .key-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .test-btn {
    background: #27864a;
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    transition: opacity 0.15s, transform 0.1s;
  }
  .test-btn:disabled { opacity: 0.5; cursor: default; }
  .test-btn:active:not(:disabled) { transform: scale(0.97); }
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .error-row {
    font-size: 0.75rem;
    color: #c0392b;
    background: rgba(192,57,43,0.06);
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
  }
  .done-row {
    font-size: 0.78rem;
    color: #27864a;
    font-weight: 600;
  }
  @keyframes popIn {
    0% { transform: scale(0); }
    60% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border: 0;
  }
  .value-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
  }
  .value-tag {
    font-size: 0.68rem;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    white-space: nowrap;
  }
  .value-tag.free {
    background: rgba(39,134,74,0.12);
    color: #1e6b3a;
    border: 1px solid rgba(39,134,74,0.2);
  }
  .value-tag.paid {
    background: rgba(212,205,196,0.5);
    color: #6b6560;
    border: 1px solid #d4cdc4;
  }
</style>
