<script>
  // :arch: apps view — create/delete apps, expandable cards with instructions/settings, per-app budgets
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
  let expandedId = $state(null)
  let editingApp = $state(null)
  let editForm = $state({})
  let saving = $state(false)
  let saved = $state('')

  const tiers = [
    { value: 'trusted', label: 'Trusted', desc: 'Full access to all models including premium' },
    { value: 'standard', label: 'Standard', desc: 'Default tier — balanced cost/quality routing' },
    { value: 'experimental', label: 'Experimental', desc: 'Cheaper models preferred, higher risk tolerance' }
  ]

  const sanitizationOptions = [
    { value: 'off', label: 'Off', desc: 'No content filtering' },
    { value: 'standard', label: 'Standard', desc: 'Block obvious prompt injections' },
    { value: 'aggressive', label: 'Aggressive', desc: 'Strict filtering for untrusted input' }
  ]

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
    } catch (err) { error = err.message }
    finally { creating = false }
  }

  async function deleteApp(id) {
    if (!confirm('Delete this app? Its API key stops working immediately.')) return
    try {
      await api.deleteApp(id)
      if (expandedId === id) expandedId = null
      await loadApps()
    } catch (err) { error = err.message }
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    copiedKey = key
    setTimeout(() => { copiedKey = '' }, 2000)
  }

  function toggle(id) {
    expandedId = expandedId === id ? null : id
    editingApp = null
  }

  function startEdit(app) {
    editingApp = app.id
    editForm = {
      name: app.name,
      trust_tier: app.trust_tier || 'standard',
      sanitization_profile: app.sanitization_profile || 'off',
      budget_daily_hard: app.budget_daily_hard ?? '',
      budget_monthly_hard: app.budget_monthly_hard ?? ''
    }
  }

  async function saveEdit(id) {
    saving = true
    try {
      await api.updateApp(id, {
        name: editForm.name,
        trust_tier: editForm.trust_tier,
        sanitization_profile: editForm.sanitization_profile,
        budget_daily_hard: editForm.budget_daily_hard ? Number(editForm.budget_daily_hard) : null,
        budget_monthly_hard: editForm.budget_monthly_hard ? Number(editForm.budget_monthly_hard) : null
      })
      editingApp = null
      saved = id
      setTimeout(() => { saved = '' }, 2000)
      await loadApps()
    } catch (err) { error = err.message }
    finally { saving = false }
  }

  const tierStyle = (tier) =>
    tier === 'trusted' ? 'background:rgba(39,134,74,0.2); color:#27864a;' :
    tier === 'standard' ? 'background:rgba(74,111,168,0.2); color:#4a6fa8;' :
    'background:rgba(212,131,26,0.2); color:#d4831a;'

  const inputStyle = "background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; width:100%; box-sizing:border-box;"
</script>

<div class="apps-page">
  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Apps</h1>
      <p class="page-subtitle">issue separate API keys to track costs, enforce budgets, and apply security rules per service</p>
    </div>
    <button onclick={() => { showCreate = !showCreate }} class="btn btn-green">
      {showCreate ? 'cancel' : '+ new app'}
    </button>
  </div>

  <!-- Why apps matter -->
  {#if apps.length === 0 && !showCreate}
    <DashboardCard accent="blue">
      <div class="explainer">
        <div class="explainer-icon">📦</div>
        <h3 class="explainer-title">Why create apps?</h3>
        <p class="explainer-text">
          Without apps, all requests use one shared key and you can't tell which service costs what.
          Each app gets its own API key so you can:
        </p>
        <div class="explainer-grid">
          <div class="explainer-item">
            <span class="explainer-emoji">📊</span>
            <div>
              <strong>Track usage separately</strong>
              <span>See exactly how many tokens and dollars each service uses</span>
            </div>
          </div>
          <div class="explainer-item">
            <span class="explainer-emoji">💰</span>
            <div>
              <strong>Set spending limits</strong>
              <span>Daily and monthly budgets that cut off when exceeded</span>
            </div>
          </div>
          <div class="explainer-item">
            <span class="explainer-emoji">🔒</span>
            <div>
              <strong>Apply security rules</strong>
              <span>Content filtering, provider restrictions, PII protection per app</span>
            </div>
          </div>
          <div class="explainer-item">
            <span class="explainer-emoji">🎯</span>
            <div>
              <strong>Control routing quality</strong>
              <span>Trust tiers determine which models each app can access</span>
            </div>
          </div>
        </div>
        <div class="explainer-example">
          <div class="explainer-example-label">Example</div>
          <p>Create "chatbot" for your customer-facing bot (standard tier, $5/day limit, standard sanitization) and "internal-tool" for your dev tools (trusted tier, no limit, off sanitization). Each gets a separate key and dashboard.</p>
        </div>
        <button onclick={() => { showCreate = true }} class="btn btn-green" style="margin-top:1rem;">Create your first app</button>
      </div>
    </DashboardCard>
  {/if}

  {#if error}
    <div class="msg msg-error">{error}</div>
  {/if}

  <!-- Create form -->
  {#if showCreate}
    <DashboardCard title="New app" accent="green">
      <form onsubmit={createApp}>
        <div class="create-grid">
          <div>
            <label for="app-name" class="field-label">App name</label>
            <input id="app-name" bind:value={form.name} required placeholder="my-cool-app" style={inputStyle} />
            <span class="field-hint">A short name to identify this service</span>
          </div>
          <div>
            <label for="app-tier" class="field-label">Trust tier</label>
            <select id="app-tier" bind:value={form.trust_tier} style={inputStyle}>
              {#each tiers as t}<option value={t.value}>{t.label} — {t.desc}</option>{/each}
            </select>
          </div>
          <div>
            <label for="app-budget-day" class="field-label">Daily budget ($)</label>
            <input id="app-budget-day" type="number" step="0.01" bind:value={form.budget_day} placeholder="no limit" style={inputStyle} />
            <span class="field-hint">Requests blocked when exceeded</span>
          </div>
          <div>
            <label for="app-budget-month" class="field-label">Monthly budget ($)</label>
            <input id="app-budget-month" type="number" step="0.01" bind:value={form.budget_month} placeholder="no limit" style={inputStyle} />
          </div>
          <div>
            <label for="app-sanitize" class="field-label">Content filtering</label>
            <select id="app-sanitize" bind:value={form.sanitization_profile} style={inputStyle}>
              {#each sanitizationOptions as s}<option value={s.value}>{s.label} — {s.desc}</option>{/each}
            </select>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem; margin-top:1rem;">
          <button type="submit" disabled={creating} class="btn btn-green" style="opacity:{creating ? 0.6 : 1};">
            {creating ? 'creating...' : 'create app'}
          </button>
          <button type="button" onclick={() => { showCreate = false }} class="btn btn-outline">cancel</button>
        </div>
      </form>
    </DashboardCard>
  {/if}

  <!-- App cards -->
  {#each apps as app}
    <div class="app-card">
      <DashboardCard accent={expandedId === app.id ? 'green' : 'blue'}>
        <!-- Collapsed header — always visible -->
        <button class="app-header" onclick={() => toggle(app.id)}>
          <div class="app-header-left">
            <span class="expand-icon" class:open={expandedId === app.id}>▶</span>
            <span class="app-name">{app.name}</span>
            <span class="tier-badge" style={tierStyle(app.trust_tier)}>{app.trust_tier || 'open'}</span>
          </div>
          <div class="app-header-stats">
            <span class="stat">{app.requests_today ?? 0} <span class="stat-label">req today</span></span>
            <span class="stat cost">${(app.cost_today ?? 0).toFixed(4)}</span>
          </div>
        </button>

        <!-- Expanded content -->
        {#if expandedId === app.id}
          <div class="app-expanded">
            <!-- API Key -->
            <div class="expanded-section">
              <h4 class="expanded-section-title">API Key</h4>
              <div class="key-row">
                <code class="key-display">{app.api_key || '(hidden)'}</code>
                {#if app.api_key}
                  <button onclick={() => copyKey(app.api_key)} class="btn-inline">
                    {copiedKey === app.api_key ? 'copied!' : 'copy'}
                  </button>
                {/if}
              </div>
            </div>

            <!-- Usage Instructions -->
            <div class="expanded-section">
              <h4 class="expanded-section-title">How to use</h4>
              <p class="hint-text">Point any OpenAI-compatible SDK at your Freeloader instance with this app's key. The router picks the best model automatically.</p>
              <div class="code-block">
                <div class="code-comment"># Drop-in replacement for any OpenAI-compatible client</div>
                <div>curl http://localhost:4011/v1/chat/completions \</div>
                <div>&nbsp; -H "x-api-key: {app.api_key?.substring(0, 12) || 'your-key'}..." \</div>
                <div>&nbsp; -H "Content-Type: application/json" \</div>
                <div>&nbsp; -d '{JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] })}'</div>
              </div>
              <div class="code-block" style="margin-top:0.5rem;">
                <div class="code-comment"># Python (openai SDK)</div>
                <div>client = OpenAI(base_url="http://localhost:4011/v1", api_key="{app.api_key?.substring(0, 12) || 'your-key'}...")</div>
                <div>response = client.chat.completions.create(</div>
                <div>&nbsp; messages=[{JSON.stringify({ role: 'user', content: 'hello' })}]</div>
                <div>)</div>
              </div>
            </div>

            <!-- Settings (inline edit or display) -->
            <div class="expanded-section">
              <div class="section-title-row">
                <h4 class="expanded-section-title">Settings</h4>
                {#if editingApp !== app.id}
                  <button onclick={() => startEdit(app)} class="btn-inline">edit</button>
                {/if}
              </div>
              {#if editingApp === app.id}
                <div class="settings-grid">
                  <div>
                    <label for="edit-name-{app.id}" class="field-label">Name</label>
                    <input id="edit-name-{app.id}" bind:value={editForm.name} style={inputStyle} />
                  </div>
                  <div>
                    <label for="edit-tier-{app.id}" class="field-label">Trust tier</label>
                    <select id="edit-tier-{app.id}" bind:value={editForm.trust_tier} style={inputStyle}>
                      {#each tiers as t}<option value={t.value}>{t.label}</option>{/each}
                    </select>
                  </div>
                  <div>
                    <label for="edit-sanitize-{app.id}" class="field-label">Content filtering</label>
                    <select id="edit-sanitize-{app.id}" bind:value={editForm.sanitization_profile} style={inputStyle}>
                      {#each sanitizationOptions as s}<option value={s.value}>{s.label}</option>{/each}
                    </select>
                  </div>
                  <div>
                    <label for="edit-budget-day-{app.id}" class="field-label">Daily budget ($)</label>
                    <input id="edit-budget-day-{app.id}" type="number" step="0.01" bind:value={editForm.budget_daily_hard} placeholder="no limit" style={inputStyle} />
                  </div>
                  <div>
                    <label for="edit-budget-month-{app.id}" class="field-label">Monthly budget ($)</label>
                    <input id="edit-budget-month-{app.id}" type="number" step="0.01" bind:value={editForm.budget_monthly_hard} placeholder="no limit" style={inputStyle} />
                  </div>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
                  <button onclick={() => saveEdit(app.id)} disabled={saving} class="btn btn-green btn-sm" style="opacity:{saving ? 0.6 : 1};">
                    {saving ? 'saving...' : 'save'}
                  </button>
                  <button onclick={() => { editingApp = null }} class="btn btn-outline btn-sm">cancel</button>
                </div>
              {:else}
                <div class="settings-display">
                  <div class="setting-item">
                    <span class="setting-label">Trust tier</span>
                    <span class="tier-badge" style={tierStyle(app.trust_tier)}>{app.trust_tier || 'open'}</span>
                  </div>
                  <div class="setting-item">
                    <span class="setting-label">Content filtering</span>
                    <span class="setting-value">{app.sanitization_profile || 'off'}</span>
                  </div>
                  <div class="setting-item">
                    <span class="setting-label">Daily budget</span>
                    <span class="setting-value">{app.budget_daily_hard ? `$${app.budget_daily_hard}` : 'no limit'}</span>
                  </div>
                  <div class="setting-item">
                    <span class="setting-label">Monthly budget</span>
                    <span class="setting-value">{app.budget_monthly_hard ? `$${app.budget_monthly_hard}` : 'no limit'}</span>
                  </div>
                </div>
                {#if saved === app.id}
                  <div class="success-msg" style="margin-top:0.5rem;">Settings saved</div>
                {/if}
              {/if}
            </div>

            <!-- Actions -->
            <div class="expanded-section expanded-actions">
              <button onclick={() => navigate(`#/apps/${app.id}`)} class="btn btn-blue btn-sm">
                View full dashboard
              </button>
              <button onclick={() => deleteApp(app.id)} class="btn btn-danger btn-sm">
                Delete app
              </button>
            </div>
          </div>
        {/if}
      </DashboardCard>
    </div>
  {/each}

  <!-- Helpful context when apps exist -->
  {#if apps.length > 0}
    <div class="page-footer-hint">
      Each app gets a unique API key. Use it as the <code>x-api-key</code> header (or <code>api_key</code> in OpenAI SDKs) when making requests to <code>http://localhost:4011/v1/</code>. The router tracks costs, enforces budgets, and applies security rules per app.
    </div>
  {/if}
</div>

<style>
  .apps-page {
    max-width: 42rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  .page-title {
    font-family: 'Permanent Marker', cursive;
    color: #27864a;
    font-size: 1.25rem;
    margin: 0;
  }
  .page-subtitle {
    color: #8b8579;
    font-size: 0.78rem;
    margin: 0.15rem 0 0;
    max-width: 28rem;
  }
  .msg { font-size: 0.75rem; border-radius: 6px; padding: 0.4rem 0.75rem; }
  .msg-error { color: #c0392b; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); }
  /* Explainer */
  .explainer { text-align: center; padding: 1rem 0; }
  .explainer-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .explainer-title { font-family: 'Permanent Marker', cursive; color: #27864a; font-size: 1.05rem; margin: 0 0 0.5rem; }
  .explainer-text { font-size: 0.85rem; color: #6b6560; max-width: 30rem; margin: 0 auto 1.25rem; line-height: 1.5; }
  .explainer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    text-align: left;
    max-width: 30rem;
    margin: 0 auto;
  }
  .explainer-item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .explainer-emoji { font-size: 1.1rem; flex-shrink: 0; margin-top: 0.1rem; }
  .explainer-item strong {
    display: block;
    font-size: 0.82rem;
    color: #2d2a26;
    margin-bottom: 0.1rem;
  }
  .explainer-item span {
    font-size: 0.75rem;
    color: #8b8579;
    line-height: 1.4;
  }
  .explainer-example {
    text-align: left;
    max-width: 30rem;
    margin: 1.25rem auto 0;
    background: #e8e2d8;
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }
  .explainer-example-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a09789;
    margin-bottom: 0.35rem;
  }
  .explainer-example p {
    font-size: 0.78rem;
    color: #6b6560;
    line-height: 1.55;
    margin: 0;
  }
  /* Create form */
  .create-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .field-label {
    display: block;
    font-size: 0.75rem;
    color: #8b8579;
    margin-bottom: 0.3rem;
  }
  .field-hint {
    display: block;
    font-size: 0.7rem;
    color: #a09789;
    margin-top: 0.2rem;
  }
  /* Buttons */
  .btn {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:disabled { opacity: 0.6; cursor: default; }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn-sm { font-size: 0.75rem; padding: 0.3rem 0.75rem; }
  .btn-green { background: #27864a; color: #fff; }
  .btn-blue { background: #4a6fa8; color: #fff; }
  .btn-outline { background: #e8e2d8; color: #2d2a26; border: 1px solid #d4cdc4; }
  .btn-danger { background: rgba(192,57,43,0.15); color: #c0392b; }
  .btn-inline {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: #4a6fa8;
    padding: 0;
    text-decoration: underline;
    text-decoration-color: #d4cdc4;
  }
  .btn-inline:hover { color: #27864a; }
  /* App card header */
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    gap: 0.75rem;
    font-family: inherit;
    text-align: left;
  }
  .app-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  .expand-icon {
    font-size: 0.6rem;
    color: #8b8579;
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .expand-icon.open { transform: rotate(90deg); }
  .app-name {
    font-weight: 600;
    color: #2d2a26;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tier-badge {
    padding: 0.12rem 0.45rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .app-header-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }
  .stat {
    font-size: 0.78rem;
    color: #2d2a26;
    font-weight: 600;
  }
  .stat .stat-label {
    font-weight: 400;
    color: #8b8579;
    font-size: 0.72rem;
  }
  .stat.cost { color: #c0392b; }
  /* Expanded content */
  .app-expanded {
    border-top: 1px solid #d4cdc4;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .expanded-section {}
  .expanded-section-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #8b8579;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem;
  }
  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .section-title-row .expanded-section-title { margin: 0; }
  .hint-text {
    font-size: 0.78rem;
    color: #8b8579;
    margin: 0 0 0.5rem;
    line-height: 1.45;
  }
  /* Key row */
  .key-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #e8e2d8;
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
  }
  .key-display {
    font-size: 0.78rem;
    color: #2d2a26;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Code block */
  .code-block {
    background: #e8e2d8;
    border: 1px solid #d4cdc4;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    font-family: 'SFMono-Regular', 'Consolas', monospace;
    font-size: 0.72rem;
    color: #2d2a26;
    overflow-x: auto;
    line-height: 1.55;
  }
  .code-comment {
    color: #a09789;
  }
  /* Settings display */
  .settings-display {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .setting-label {
    font-size: 0.7rem;
    color: #a09789;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .setting-value {
    font-size: 0.82rem;
    color: #2d2a26;
  }
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .success-msg { font-size: 0.78rem; color: #27864a; }
  /* Actions row */
  .expanded-actions {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(212,205,196,0.5);
  }
  /* Footer hint */
  .page-footer-hint {
    font-size: 0.75rem;
    color: #a09789;
    line-height: 1.5;
    padding: 0.5rem 0;
  }
  .page-footer-hint code {
    background: #e8e2d8;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-size: 0.72rem;
    color: #6b6560;
  }
  /* Mobile */
  @media (max-width: 768px) {
    .page-header { flex-direction: column; }
    .create-grid { grid-template-columns: 1fr; }
    .explainer-grid { grid-template-columns: 1fr; }
    .settings-grid { grid-template-columns: 1fr; }
    .settings-display { grid-template-columns: 1fr; }
    .app-header { flex-direction: column; align-items: flex-start; }
    .app-header-stats { align-self: flex-end; margin-top: -1.2rem; }
    .expanded-actions { flex-wrap: wrap; }
  }
</style>
