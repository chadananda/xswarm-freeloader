<script>
  // :arch: Providers — 7 sections: Top Opportunities, Premium LLMs, LLM Providers, Other APIs, Local LLM, Email Sending, Account Details
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import DashboardCard from '../components/DashboardCard.svelte'

  let catalog = $state([])
  let accounts = $state([])
  let localResults = $state([])
  let discoveryDone = $state(false)
  let customEndpoint = $state('')
  let configuredIds = $state(new Set())
  let registering = $state(false)
  let error = $state('')
  let success = $state('')
  let selectedId = $state(null)
  // Section open state
  let sections = $state({ opportunities: true, premium: true, remote: true, other: true, local: false, email: true, accounts: false })
  // Per-provider key input state
  let keyInputs = $state({})
  let keyTesting = $state({})
  let keyErrors = $state({})
  let keySuccess = $state({})
  // Email state
  let emailProvider = $state('none')
  let emailApiKey = $state('')
  let emailRecipient = $state('')
  let emailSmtp = $state({ host: '', port: 587, user: '', pass: '' })
  let emailSaving = $state(false)
  let emailSaved = $state('')
  let emailConfigured = $state(false)
  // Accounts table
  let editAccount = $state(null)
  let editKey = $state('')
  let editing = $state(false)
  let testing = $state({})
  let testResults = $state({})

  const inputStyle = "background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; width:100%; box-sizing:border-box; transition:border-color 0.2s;"

  function providerValueScore(p) {
    const freeModels = (p.models || []).filter(m => m.free_tier)
    if (freeModels.length === 0) {
      const cheapest = Math.min(...(p.models || []).map(m => m.pricing_input || Infinity))
      return 1000 + cheapest
    }
    return -freeModels.reduce((sum, m) => sum + (m.free_tier_rpd || 0), 0)
  }

  function bestValueLine(p) {
    const free = (p.models || []).filter(m => m.free_tier)
    if (free.length > 0) {
      const best = free.reduce((a, b) => (b.free_tier_rpd || 0) > (a.free_tier_rpd || 0) ? b : a, free[0])
      return `${(best.free_tier_rpd || 0).toLocaleString()} req/day free`
    }
    const cheapest = Math.min(...(p.models || []).map(m => m.pricing_input ?? Infinity))
    return cheapest < Infinity ? `from $${cheapest}/M in` : 'paid'
  }

  function providerFlag(p) {
    const free = (p.models || []).filter(m => m.free_tier)
    const totalRpd = free.reduce((sum, m) => sum + (m.free_tier_rpd || 0), 0)
    if (totalRpd >= 10000) return 'best value'
    if (totalRpd >= 1000) return 'high value'
    if (free.length > 0) return 'free tier'
    return null
  }

  onMount(async () => {
    try {
      const [cat, accs, settings] = await Promise.all([api.catalog(), api.accounts(), api.settings()])
      catalog = cat
      accounts = accs
      configuredIds = new Set(accs.map(a => a.provider_id))
      const email = settings?.config?.email || {}
      emailProvider = email.provider || 'none'
      emailApiKey = email.apiKey || ''
      emailRecipient = email.to || ''
      emailConfigured = !!(email.enabled && email.provider !== 'none')
      if (email.smtp) emailSmtp = { host: email.smtp.host || '', port: email.smtp.port || 587, user: email.smtp.user || '', pass: email.smtp.pass || '' }
    } catch (err) { error = err.message }
    try {
      localResults = await api.discoverLocal()
      discoveryDone = true
    } catch { discoveryDone = true }
  })

  // Configured remote providers (have accounts)
  const configuredRemote = $derived(
    catalog.filter(p => !p.is_local && configuredIds.has(p.id))
      .sort((a, b) => providerValueScore(a) - providerValueScore(b))
  )
  // Top opportunities — unconfigured LLM providers WITH free tiers
  const opportunities = $derived(
    catalog.filter(p => !p.is_local && !configuredIds.has(p.id) && !keySuccess[p.id] && p.category !== 'service' && (p.models || []).some(m => m.free_tier))
      .sort((a, b) => providerValueScore(a) - providerValueScore(b))
  )
  // Premium LLMs — unconfigured providers with NO free tier
  const premiumLLMs = $derived(
    catalog.filter(p => !p.is_local && !configuredIds.has(p.id) && !keySuccess[p.id] && p.category !== 'service' && !(p.models || []).some(m => m.free_tier))
      .sort((a, b) => providerValueScore(a) - providerValueScore(b))
  )
  // Non-LLM service providers (search, TTS, translation, etc.)
  const serviceProviders = $derived(
    catalog.filter(p => p.category === 'service')
      .sort((a, b) => providerValueScore(a) - providerValueScore(b))
  )
  const availableLocal = $derived(localResults.filter(r => r.available))
  const allLocalModels = $derived(availableLocal.flatMap(r => r.models.map(m => ({ ...m, source: r.name, url: r.url }))))
  const localDetected = $derived(availableLocal.length > 0)
  const opportunityCount = $derived(opportunities.length + premiumLLMs.length + serviceProviders.length + (emailConfigured ? 0 : 1) + (localDetected ? 0 : 1))

  function select(id) { selectedId = selectedId === id ? null : id }
  function toggleSection(key) { sections = { ...sections, [key]: !sections[key] } }

  // Provider key actions
  async function addAndTest(providerId) {
    const key = (keyInputs[providerId] || '').trim()
    if (!key) return
    keyTesting = { ...keyTesting, [providerId]: true }
    keyErrors = { ...keyErrors, [providerId]: '' }
    try {
      const account = await api.createAccount({ provider_id: providerId, api_key: key })
      const test = await api.testAccount(account.id)
      if (test.ok) {
        keySuccess = { ...keySuccess, [providerId]: true }
        configuredIds = new Set([...configuredIds, providerId])
        reloadAccounts()
      } else {
        keyErrors = { ...keyErrors, [providerId]: test.error || 'Key validation failed' }
        await api.deleteAccount(account.id)
      }
    } catch (err) { keyErrors = { ...keyErrors, [providerId]: err.message } }
    finally { keyTesting = { ...keyTesting, [providerId]: false } }
  }

  async function reloadAccounts() {
    try {
      accounts = await api.accounts()
      configuredIds = new Set(accounts.map(a => a.provider_id))
    } catch { /* ignore */ }
  }

  async function discoverCustom() {
    if (!customEndpoint.trim()) return
    try {
      const results = await api.discoverLocal([customEndpoint.trim()])
      localResults = [...localResults, ...results]
    } catch { /* ignore */ }
  }

  async function registerLocalModels() {
    if (!allLocalModels.length) return
    registering = true
    try { await api.registerLocal(allLocalModels, availableLocal[0]?.url) } catch { /* ignore */ }
    registering = false
  }

  async function saveEmail() {
    emailSaving = true
    try {
      await api.updateConfig({ email: { enabled: emailProvider !== 'none', provider: emailProvider, apiKey: emailProvider === 'resend' ? emailApiKey : undefined, smtp: emailProvider === 'smtp' ? emailSmtp : undefined, to: emailRecipient, digestFrequency: 'daily' } })
      emailSaved = 'Email configured!'
      emailConfigured = emailProvider !== 'none'
      setTimeout(() => { emailSaved = '' }, 3000)
    } catch { emailSaved = '' }
    emailSaving = false
  }

  async function deleteAccount(id) {
    error = ''
    try {
      await api.deleteAccount(id)
      success = 'Account removed'
      setTimeout(() => { success = '' }, 3000)
      await reloadAccounts()
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
      await reloadAccounts()
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
    'background:rgba(212,205,196,0.5); color:#8b8579;'
</script>

<div class="providers-page">
  <div class="page-header">
    <h1 class="page-title">Providers</h1>
    <p class="page-subtitle">connect API keys, local models, and services — clip your coupons</p>
  </div>

  {#if error}
    <div class="msg msg-error">{error}</div>
  {/if}
  {#if success}
    <div class="msg msg-success">{success}</div>
  {/if}

  <!-- ═══ TOP OPPORTUNITIES ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('opportunities')}>
      <span class="toggle-icon" class:open={sections.opportunities}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">Top Opportunities</h2>
        <p class="section-hint">The best free-tier LLM offerings — clip these coupons</p>
      </div>
      {#if opportunities.length > 0}
        <span class="count-badge">{opportunities.length} free</span>
      {:else}
        <span class="section-status configured">all claimed</span>
      {/if}
    </button>
    {#if sections.opportunities}
      <div class="section-body">
        {#if opportunities.length > 0}
          <div class="pill-grid">
            {#each opportunities as p}
              {#if selectedId === p.id}
                <div class="pill-expanded">
                  <DashboardCard accent="blue">
                    <div class="config-inner">
                      <div class="config-header">
                        <h3 class="config-name">{p.name}</h3>
                        {#if providerFlag(p)}
                          <span class="pill-flag" class:best={providerFlag(p) === 'best value'}>{providerFlag(p)}</span>
                        {/if}
                        <button class="pill-close" onclick={() => select(p.id)} aria-label="Collapse">×</button>
                      </div>
                      <p class="config-desc">{p.description}</p>
                      {#if p.models?.length}
                        <div class="value-tags">
                          {#each (p.models || []).filter(m => m.free_tier).slice(0, 3) as model}
                            <span class="value-tag free">{model.name} — {model.free_tier_rpd?.toLocaleString() || '∞'} req/day free</span>
                          {/each}
                          {#each (p.models || []).filter(m => !m.free_tier).slice(0, 2) as model}
                            <span class="value-tag paid">{model.name} — ${model.pricing_input}/M in</span>
                          {/each}
                        </div>
                      {/if}
                      {#if p.signup_url}
                        <a href={p.signup_url} target="_blank" class="signup-link">
                          Get free key <span class="arrow">→</span>
                        </a>
                      {/if}
                      <div class="key-row">
                        <label for="key-{p.id}" class="sr-only">API key for {p.name}</label>
                        <input id="key-{p.id}" type="password" value={keyInputs[p.id] || ''} oninput={(e) => { keyInputs = { ...keyInputs, [p.id]: e.target.value } }} placeholder={p.key_format_hint || 'Paste your API key'} style={inputStyle} onkeydown={(e) => { if (e.key === 'Enter') addAndTest(p.id) }} />
                        <button onclick={() => addAndTest(p.id)} disabled={keyTesting[p.id] || !(keyInputs[p.id] || '').trim()} class="test-btn">
                          {#if keyTesting[p.id]}<span class="spinner"></span> testing{:else}Add & Test{/if}
                        </button>
                      </div>
                      {#if keyErrors[p.id]}<div class="error-row">{keyErrors[p.id]}</div>{/if}
                    </div>
                  </DashboardCard>
                </div>
              {:else}
                <button class="pill coupon" onclick={() => select(p.id)}>
                  <span class="coupon-grain"></span>
                  <div class="pill-top">
                    <span class="pill-name">{p.name}</span>
                    {#if p.new}<span class="pill-flag new">new</span>{/if}
                    {#if providerFlag(p)}<span class="pill-flag" class:best={providerFlag(p) === 'best value'}>{providerFlag(p)}</span>{/if}
                  </div>
                  <span class="pill-value">{bestValueLine(p)}</span>
                </button>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="empty-section"><p>All free-tier coupons clipped. Nice work.</p></div>
        {/if}
      </div>
    {/if}
  </section>

  <!-- ═══ PREMIUM LLMs (no free tier) ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('premium')}>
      <span class="toggle-icon" class:open={sections.premium}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">Premium LLMs</h2>
        <p class="section-hint">No free tier, but useful as high-quality fallbacks when you need them</p>
      </div>
      {#if premiumLLMs.length > 0}
        <span class="count-badge">{premiumLLMs.length}</span>
      {:else}
        <span class="section-status configured">all connected</span>
      {/if}
    </button>
    {#if sections.premium}
      <div class="section-body">
        {#if premiumLLMs.length > 0}
          <div class="pill-grid">
            {#each premiumLLMs as p}
              {#if selectedId === p.id}
                <div class="pill-expanded">
                  <DashboardCard accent="orange">
                    <div class="config-inner">
                      <div class="config-header">
                        <h3 class="config-name">{p.name}</h3>
                        <button class="pill-close" onclick={() => select(p.id)} aria-label="Collapse">×</button>
                      </div>
                      <p class="config-desc">{p.description}</p>
                      {#if p.models?.length}
                        <div class="value-tags">
                          {#each (p.models || []).filter(m => !m.free_tier).slice(0, 4) as model}
                            <span class="value-tag paid">{model.name} — ${model.pricing_input}/M in</span>
                          {/each}
                        </div>
                      {/if}
                      {#if p.signup_url}
                        <a href={p.signup_url} target="_blank" class="signup-link">Get API key <span class="arrow">→</span></a>
                      {/if}
                      <div class="key-row">
                        <label for="key-{p.id}" class="sr-only">API key for {p.name}</label>
                        <input id="key-{p.id}" type="password" value={keyInputs[p.id] || ''} oninput={(e) => { keyInputs = { ...keyInputs, [p.id]: e.target.value } }} placeholder={p.key_format_hint || 'Paste your API key'} style={inputStyle} onkeydown={(e) => { if (e.key === 'Enter') addAndTest(p.id) }} />
                        <button onclick={() => addAndTest(p.id)} disabled={keyTesting[p.id] || !(keyInputs[p.id] || '').trim()} class="test-btn">
                          {#if keyTesting[p.id]}<span class="spinner"></span> testing{:else}Add & Test{/if}
                        </button>
                      </div>
                      {#if keyErrors[p.id]}<div class="error-row">{keyErrors[p.id]}</div>{/if}
                    </div>
                  </DashboardCard>
                </div>
              {:else}
                <button class="pill coupon" onclick={() => select(p.id)}>
                  <span class="coupon-grain"></span>
                  <div class="pill-top"><span class="pill-name">{p.name}</span></div>
                  <span class="pill-value">{bestValueLine(p)}</span>
                </button>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="empty-section"><p>All premium providers connected.</p></div>
        {/if}
      </div>
    {/if}
  </section>

  <!-- ═══ LLM PROVIDERS (Configured) ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('remote')}>
      <span class="toggle-icon" class:open={sections.remote}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">LLM Providers</h2>
        <p class="section-hint">So far you have connected {configuredRemote.length} LLM provider{configuredRemote.length !== 1 ? 's' : ''}</p>
      </div>
      <span class="section-status configured">{configuredRemote.length} connected</span>
    </button>
    {#if sections.remote}
      <div class="section-body">
        {#if configuredRemote.length > 0}
          <div class="pill-grid">
            {#each configuredRemote as p}
              {#if selectedId === p.id}
                <div class="pill-expanded">
                  <DashboardCard accent="green">
                    <div class="config-inner">
                      <div class="config-header">
                        <h3 class="config-name">{p.name}</h3>
                        <span class="pill-check">✓</span>
                        <button class="pill-close" onclick={() => select(p.id)} aria-label="Collapse">×</button>
                      </div>
                      <p class="config-desc">{p.description}</p>
                      {#if p.models?.length}
                        <div class="value-tags">
                          {#each (p.models || []).filter(m => m.free_tier).slice(0, 3) as model}
                            <span class="value-tag free">{model.name} — {model.free_tier_rpd?.toLocaleString() || '∞'} req/day free</span>
                          {/each}
                          {#each (p.models || []).filter(m => !m.free_tier).slice(0, 2) as model}
                            <span class="value-tag paid">{model.name} — ${model.pricing_input}/M in</span>
                          {/each}
                        </div>
                      {/if}
                      <div class="done-row">Connected — {p.account_count || 1} key{(p.account_count || 1) !== 1 ? 's' : ''}</div>
                    </div>
                  </DashboardCard>
                </div>
              {:else}
                <button class="pill coupon configured" onclick={() => select(p.id)}>
                  <span class="coupon-grain"></span>
                  <div class="pill-top">
                    <span class="pill-name">{p.name}</span>
                    <span class="pill-check">✓</span>
                  </div>
                  <span class="pill-value">{bestValueLine(p)}</span>
                </button>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="empty-section"><p>No remote providers connected yet. Add one from Top Opportunities above.</p></div>
        {/if}
      </div>
    {/if}
  </section>

  <!-- ═══ OTHER APIs (non-LLM services) ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('other')}>
      <span class="toggle-icon" class:open={sections.other}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">Other APIs</h2>
        <p class="section-hint">Search, translation, and other services with free tiers to tap into</p>
      </div>
      {#if serviceProviders.length > 0}
        <span class="count-badge">{serviceProviders.length}</span>
      {/if}
    </button>
    {#if sections.other}
      <div class="section-body">
        <div class="pill-grid">
          {#each serviceProviders as p}
            {#if selectedId === p.id}
              <div class="pill-expanded">
                <DashboardCard accent="blue">
                  <div class="config-inner">
                    <div class="config-header">
                      <h3 class="config-name">{p.name}</h3>
                      {#if p.builtin}<span class="info-badge">built-in</span>{/if}
                      <button class="pill-close" onclick={() => select(p.id)} aria-label="Collapse">×</button>
                    </div>
                    <p class="config-desc">{p.description}</p>
                    {#if p.models?.length}
                      <div class="value-tags">
                        {#each (p.models || []).slice(0, 6) as model}
                          <span class="value-tag free">{model.name} — {model.free_tier_rpd?.toLocaleString() || '∞'} req/day</span>
                        {/each}
                      </div>
                    {/if}
                    {#if p.builtin}
                      <div class="done-row">Enabled by default — no configuration needed</div>
                    {:else if p.signup_url}
                      <a href={p.signup_url} target="_blank" class="signup-link">Get API key <span class="arrow">→</span></a>
                      <div class="key-row">
                        <label for="key-{p.id}" class="sr-only">API key for {p.name}</label>
                        <input id="key-{p.id}" type="password" value={keyInputs[p.id] || ''} oninput={(e) => { keyInputs = { ...keyInputs, [p.id]: e.target.value } }} placeholder={p.key_format_hint || 'Paste your API key'} style={inputStyle} onkeydown={(e) => { if (e.key === 'Enter') addAndTest(p.id) }} />
                        <button onclick={() => addAndTest(p.id)} disabled={keyTesting[p.id] || !(keyInputs[p.id] || '').trim()} class="test-btn">
                          {#if keyTesting[p.id]}<span class="spinner"></span> testing{:else}Add & Test{/if}
                        </button>
                      </div>
                      {#if keyErrors[p.id]}<div class="error-row">{keyErrors[p.id]}</div>{/if}
                    {/if}
                  </div>
                </DashboardCard>
              </div>
            {:else}
              <button class="pill coupon" class:configured={p.builtin} onclick={() => select(p.id)}>
                <span class="coupon-grain"></span>
                <div class="pill-top">
                  <span class="pill-name">{p.name}</span>
                  {#if p.builtin}<span class="pill-check">✓</span>{/if}
                  {#if p.new}<span class="pill-flag new">new</span>{/if}
                </div>
                <span class="pill-value">{p.builtin ? 'enabled' : bestValueLine(p)}</span>
              </button>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- ═══ LOCAL LLM ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('local')}>
      <span class="toggle-icon" class:open={sections.local}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">Local LLM</h2>
        <p class="section-hint">Have local AI on your network? Add it into the mix!</p>
      </div>
      {#if localDetected}
        <span class="section-status configured">{allLocalModels.length} model{allLocalModels.length !== 1 ? 's' : ''} detected</span>
      {:else if discoveryDone}
        <span class="section-status">not detected</span>
      {:else}
        <span class="section-status scanning">scanning...</span>
      {/if}
      <span class="info-badge">no key needed</span>
    </button>
    {#if sections.local}
      <div class="section-body">
        <DashboardCard accent="green">
          <p class="config-desc">Auto-detects Ollama, LM Studio, and custom endpoints on your network. Completely free and private — models run on your hardware.</p>
          {#if !discoveryDone}
            <div class="scan-indicator">
              <span class="scan-dot"></span>
              <span style="font-size:0.85rem; color:#8b8579;">Scanning local services...</span>
            </div>
          {:else if availableLocal.length > 0}
            {#each availableLocal as service}
              <div class="local-service">
                <div class="local-service-header">
                  <span class="local-check">✓</span>
                  <strong style="font-size:0.85rem;">{service.name}</strong>
                  <code class="local-url">{service.url}</code>
                </div>
                <div class="local-models">
                  {#each service.models as model}
                    <span class="model-tag" class:offline={model.status === 'offline'}>
                      {model.name || model.id}
                      {#if model.status === 'offline'}
                        <span class="offline-dot"></span>
                      {/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
            <button onclick={registerLocalModels} disabled={registering} class="btn btn-green" style="margin-top:0.5rem;">
              {registering ? 'Registering...' : `Register ${allLocalModels.length} local model${allLocalModels.length !== 1 ? 's' : ''}`}
            </button>
          {:else}
            <div style="padding:0.25rem 0;">
              <p style="font-size:0.82rem; color:#8b8579; margin:0;">No local AI running. Start Ollama or LM Studio, or probe a custom endpoint.</p>
            </div>
          {/if}
          <div class="custom-probe">
            <label for="custom-endpoint" class="sr-only">Custom endpoint URL</label>
            <input id="custom-endpoint" type="text" bind:value={customEndpoint} placeholder="http://192.168.1.10:11434 or https://boss.tail..." style={inputStyle} />
            <button onclick={discoverCustom} class="btn btn-outline">Probe</button>
          </div>
        </DashboardCard>
      </div>
    {/if}
  </section>

  <!-- ═══ EMAIL SENDING ═══ -->
  <section class="section">
    <button class="section-toggle" onclick={() => toggleSection('email')}>
      <span class="toggle-icon" class:open={sections.email}>▶</span>
      <div class="toggle-text">
        <h2 class="section-title">Email Sending</h2>
        <p class="section-hint">Choose an email provider so Freeloader can send you reports and updates securely</p>
      </div>
      {#if emailConfigured}
        <span class="section-status configured">configured</span>
      {:else}
        <span class="section-status">not configured</span>
      {/if}
      <span class="info-badge">free tier</span>
    </button>
    {#if sections.email}
      <div class="section-body">
        <DashboardCard accent="blue">
          <p class="config-desc">Freeloader uses email to send usage reports, key backups, and cost alerts directly to you. Your data stays private — reports are generated locally and sent only to your address. No data is shared with third parties. Resend offers 100 free emails per day with no credit card.</p>
          <div class="form-stack">
            <div>
              <label class="field-label" for="email-provider">Email provider</label>
              <select id="email-provider" bind:value={emailProvider} style={inputStyle}>
                <option value="none">Skip for now</option>
                <option value="resend">Resend (free — 100 emails/day)</option>
                <option value="smtp">Custom SMTP</option>
              </select>
            </div>
            {#if emailProvider === 'resend'}
              <div>
                <label class="field-label" for="resend-key">Resend API key</label>
                <input id="resend-key" type="password" bind:value={emailApiKey} placeholder="re_..." style={inputStyle} />
                <p class="field-hint">Get a free key at <a href="https://resend.com" target="_blank" class="link">resend.com</a> — no credit card required</p>
              </div>
            {/if}
            {#if emailProvider === 'smtp'}
              <div class="smtp-grid">
                <div>
                  <label class="field-label" for="smtp-host">SMTP host</label>
                  <input id="smtp-host" type="text" bind:value={emailSmtp.host} placeholder="smtp.example.com" style={inputStyle} />
                </div>
                <div>
                  <label class="field-label" for="smtp-port">Port</label>
                  <input id="smtp-port" type="number" bind:value={emailSmtp.port} style={inputStyle} />
                </div>
                <div>
                  <label class="field-label" for="smtp-user">Username</label>
                  <input id="smtp-user" type="text" bind:value={emailSmtp.user} style={inputStyle} />
                </div>
                <div>
                  <label class="field-label" for="smtp-pass">Password</label>
                  <input id="smtp-pass" type="password" bind:value={emailSmtp.pass} style={inputStyle} />
                </div>
              </div>
            {/if}
            {#if emailProvider !== 'none'}
              <div>
                <label class="field-label" for="email-to">Your email</label>
                <input id="email-to" type="email" bind:value={emailRecipient} placeholder="you@example.com" style={inputStyle} />
              </div>
              <button onclick={saveEmail} disabled={emailSaving} class="btn btn-blue">
                {emailSaving ? 'saving...' : 'Save email settings'}
              </button>
              {#if emailSaved}<div class="success-msg">{emailSaved}</div>{/if}
            {/if}
          </div>
        </DashboardCard>
      </div>
    {/if}
  </section>

  <!-- ═══ CONFIGURED ACCOUNTS (details table) ═══ -->
  {#if accounts.length > 0}
    <section class="section">
      <button class="section-toggle" onclick={() => toggleSection('accounts')}>
        <span class="toggle-icon" class:open={sections.accounts}>▶</span>
        <div class="toggle-text">
          <h2 class="section-title">Account Details</h2>
          <p class="section-hint">Manage your connected API keys — test, rotate, or remove</p>
        </div>
        <span class="count-badge">{accounts.length}</span>
      </button>
      {#if sections.accounts}
        <div class="section-body">
          <DashboardCard accent="green">
            <div style="overflow-x:auto;">
              <table class="accounts-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th>Test</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {#each accounts as acc}
                    <tr>
                      <td style="font-weight:600;">{acc.provider?.name || acc.provider_id}</td>
                      <td>
                        <span class="status-badge" style={statusStyle(acc.status)}>{acc.status || 'unknown'}</span>
                      </td>
                      <td style="color:#8b8579; font-size:0.75rem;">
                        {acc.created_at ? new Date(acc.created_at * 1000).toLocaleDateString() : '—'}
                      </td>
                      <td style="font-size:0.75rem;">
                        {#if testing[acc.id]}
                          <span style="color:#8b8579;">testing...</span>
                        {:else if testResults[acc.id] != null}
                          {#if testResults[acc.id].ok}
                            <span style="color:#27864a;">active</span>
                          {:else}
                            <span style="color:#c0392b;">{testResults[acc.id].error || 'invalid'}</span>
                          {/if}
                        {:else}
                          <span style="color:#a09789;">—</span>
                        {/if}
                      </td>
                      <td style="text-align:right;">
                        <div class="action-btns">
                          <button onclick={() => testAccount(acc.id)} disabled={testing[acc.id]} class="action-btn action-test">
                            {testing[acc.id] ? '...' : 'test'}
                          </button>
                          <button onclick={() => openEdit(acc)} class="action-btn action-rotate">rotate</button>
                          <button onclick={() => deleteAccount(acc.id)} class="action-btn action-remove">remove</button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      {/if}
    </section>
  {/if}
</div>

<!-- Edit key modal -->
{#if editAccount}
  <div class="modal-overlay" onclick={() => { editAccount = null }}>
    <div class="modal-box" onclick={(e) => e.stopPropagation()}>
      <h2 style="font-family:'Permanent Marker',cursive; color:#27864a; margin:0 0 0.3rem;">Rotate API Key</h2>
      <p style="color:#8b8579; font-size:0.78rem; margin:0 0 1rem;">
        Update the API key for <span style="color:#2d2a26;">{editAccount.provider?.name || editAccount.provider_id}</span>
      </p>
      <label for="edit-key" class="sr-only">New API key</label>
      <input id="edit-key" type="password" bind:value={editKey} placeholder="new API key..."
        style="width:100%; background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; box-sizing:border-box; margin-bottom:1rem;" />
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button onclick={() => { editAccount = null }} class="btn btn-outline">cancel</button>
        <button onclick={saveKey} disabled={editing || !editKey} class="btn btn-blue" style="opacity:{editing || !editKey ? 0.5 : 1};">
          {editing ? 'saving...' : 'save key'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .providers-page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .page-header { margin-bottom: 0.25rem; }
  .page-title { font-family: 'Permanent Marker', cursive; color: #27864a; font-size: 1.25rem; margin: 0; }
  .page-subtitle { color: #8b8579; font-size: 0.78rem; margin: 0.15rem 0 0; }
  .msg { font-size: 0.75rem; border-radius: 6px; padding: 0.4rem 0.75rem; }
  .msg-error { color: #c0392b; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); }
  .msg-success { color: #27864a; background: rgba(39,134,74,0.08); border: 1px solid rgba(39,134,74,0.2); }

  /* Sections — full-width dividers */
  .section {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #d4cdc4;
    padding-bottom: 0.25rem;
  }
  .section-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: inherit;
    transition: background 0.15s;
  }
  .section-toggle:hover { background: rgba(0,0,0,0.02); }
  .toggle-text { flex: 1; min-width: 0; }
  .section-hint {
    font-size: 0.7rem;
    color: #a09789;
    margin: 0.1rem 0 0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toggle-icon {
    font-size: 0.55rem;
    color: #8b8579;
    transition: transform 0.2s;
    flex-shrink: 0;
    width: 0.8rem;
  }
  .toggle-icon.open { transform: rotate(90deg); }
  .section-title {
    font-family: 'Permanent Marker', cursive;
    font-size: 0.95rem;
    color: #27864a;
    margin: 0;
  }
  .section-status {
    font-size: 0.72rem;
    color: #8b8579;
    margin-left: auto;
  }
  .section-status.configured { color: #27864a; font-weight: 600; }
  .section-status.scanning { color: #4a6fa8; }
  .count-badge {
    font-size: 0.65rem;
    font-weight: 700;
    background: rgba(39,134,74,0.15);
    color: #27864a;
    padding: 0.1rem 0.4rem;
    border-radius: 10px;
    min-width: 1rem;
    text-align: center;
    margin-left: auto;
  }
  .info-badge {
    font-size: 0.6rem;
    font-weight: 600;
    background: #e8e2d8;
    color: #a09789;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .section-body {
    padding: 0 0 0.75rem;
    animation: slideDown 0.2s ease;
  }
  .empty-section {
    padding: 0.5rem 0;
  }
  .empty-section p { font-size: 0.82rem; color: #8b8579; margin: 0; }

  /* Coupon grid — clip these deals */
  .pill-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .pill.coupon {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.55rem 0.75rem 0.55rem 0.9rem;
    background: #f0ebe0;
    border: 1.5px dashed #c4bdb4;
    border-left: 2.5px dashed #b0a89e;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(30,20,10,0.08), 0 2px 6px rgba(30,20,10,0.04);
    text-align: left;
    min-width: 8rem;
    font-family: inherit;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .coupon-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
    background-size: 300px;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: multiply;
  }
  .pill.coupon:hover {
    box-shadow: 0 3px 10px rgba(30,20,10,0.12);
    transform: translateY(-2px);
  }
  .pill.coupon.configured {
    border-color: rgba(39,134,74,0.4);
    border-style: dashed;
    border-left-width: 2.5px;
  }
  .pill-top { display: flex; align-items: center; gap: 0.3rem; position: relative; z-index: 1; }
  .pill-name { font-weight: 700; font-size: 0.8rem; color: #2d2a26; }
  .pill-check {
    display: inline-flex; align-items: center; justify-content: center;
    width: 0.9rem; height: 0.9rem;
    background: #27864a; color: #fff; border-radius: 50%;
    font-size: 0.5rem; font-weight: 700; flex-shrink: 0;
  }
  .pill-flag {
    font-size: 0.55rem; font-weight: 700;
    padding: 0.1rem 0.4rem; border-radius: 2px;
    text-transform: uppercase; letter-spacing: 0.05em;
    background: #27864a; color: #fff;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(39,134,74,0.3);
  }
  .pill-flag.best {
    background: #d4831a; color: #fff;
    animation: flagPulse 3s ease-in-out infinite;
    box-shadow: 0 1px 3px rgba(212,131,26,0.3);
  }
  .pill-flag.new {
    background: #4a6fa8; color: #fff;
    box-shadow: 0 1px 2px rgba(74,111,168,0.3);
    animation: newPulse 2.5s ease-in-out infinite;
  }
  .pill-value { font-size: 0.68rem; color: #8b8579; white-space: nowrap; position: relative; z-index: 1; }

  /* Expanded card — inline accordion */
  .pill-expanded {
    flex-basis: 100%;
    animation: cardExpand 0.3s ease-out;
    transform-origin: top left;
  }
  .pill-close {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: #8b8579;
    line-height: 1;
    padding: 0 0.15rem;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .pill-close:hover { color: #2d2a26; background: rgba(0,0,0,0.05); }
  .config-inner { display: flex; flex-direction: column; gap: 0.5rem; }
  .config-header { display: flex; align-items: center; gap: 0.4rem; }
  .config-name { font-weight: 700; color: #2d2a26; font-size: 0.92rem; margin: 0; }
  .config-desc { font-size: 0.78rem; color: #8b8579; margin: 0; line-height: 1.45; }
  .value-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .value-tag { font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px; white-space: nowrap; }
  .value-tag.free { background: rgba(39,134,74,0.12); color: #1e6b3a; border: 1px solid rgba(39,134,74,0.2); }
  .value-tag.paid { background: rgba(212,205,196,0.5); color: #6b6560; border: 1px solid #d4cdc4; }
  .signup-link {
    font-size: 0.78rem; color: #4a6fa8; text-decoration: none;
    display: inline-flex; align-items: center; gap: 0.2rem; transition: color 0.15s;
  }
  .signup-link:hover { color: #27864a; }
  .signup-link .arrow { transition: transform 0.15s; }
  .signup-link:hover .arrow { transform: translateX(2px); }
  .key-row { display: flex; gap: 0.5rem; align-items: center; }
  .test-btn {
    background: #27864a; color: #fff; font-size: 0.78rem; font-weight: 600;
    padding: 0.5rem 0.75rem; border-radius: 6px; border: none; cursor: pointer;
    white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;
    transition: opacity 0.15s, transform 0.1s;
  }
  .test-btn:disabled { opacity: 0.5; cursor: default; }
  .test-btn:active:not(:disabled) { transform: scale(0.97); }
  .spinner {
    width: 12px; height: 12px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: spin 0.6s linear infinite;
  }
  .error-row { font-size: 0.75rem; color: #c0392b; background: rgba(192,57,43,0.06); padding: 0.3rem 0.5rem; border-radius: 4px; }
  .done-row { font-size: 0.78rem; color: #27864a; font-weight: 600; }

  /* Local discovery */
  .scan-indicator { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; }
  .scan-dot { width: 8px; height: 8px; background: #27864a; border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
  .local-service { margin-bottom: 0.75rem; }
  .local-service-header { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
  .local-check { color: #27864a; font-weight: 700; font-size: 0.85rem; }
  .local-url { font-size: 0.72rem; color: #a09789; background: #e8e2d8; padding: 0.1rem 0.4rem; border-radius: 3px; margin-left: auto; }
  .local-models { padding-left: 1.1rem; display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .model-tag {
    font-size: 0.72rem; background: #e8e2d8; color: #6b6560;
    padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid #d4cdc4;
    display: inline-flex; align-items: center; gap: 0.25rem;
  }
  .model-tag.offline { opacity: 0.55; }
  .offline-dot { width: 5px; height: 5px; background: #c0392b; border-radius: 50%; }
  .custom-probe { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem; }

  /* Email form */
  .form-stack { display: flex; flex-direction: column; gap: 0.7rem; margin-top: 0.5rem; }
  .smtp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .field-label { display: block; font-size: 0.75rem; color: #8b8579; margin-bottom: 0.3rem; }
  .field-hint { font-size: 0.75rem; color: #8b8579; margin: 0.3rem 0 0; }
  .link { color: #4a6fa8; text-decoration: none; }
  .link:hover { text-decoration: underline; }
  .success-msg { font-size: 0.78rem; color: #27864a; margin-top: 0.3rem; }

  /* Buttons */
  .btn {
    font-size: 0.78rem; font-weight: 600; padding: 0.45rem 0.75rem;
    border-radius: 6px; border: none; cursor: pointer; white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:disabled { opacity: 0.6; cursor: default; }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn-green { background: #27864a; color: #fff; }
  .btn-blue { background: #4a6fa8; color: #fff; }
  .btn-outline { background: #e8e2d8; color: #2d2a26; border: 1px solid #d4cdc4; }

  /* Accounts table */
  .accounts-table { width: 100%; font-size: 0.78rem; border-collapse: collapse; }
  .accounts-table th {
    text-align: left; padding: 0.5rem 0.75rem; color: #8b8579;
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid #d4cdc4; font-weight: 600;
  }
  .accounts-table td { padding: 0.5rem 0.75rem; color: #2d2a26; border-bottom: 1px solid rgba(212,205,196,0.5); }
  .status-badge { padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.75rem; }
  .action-btns { display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; }
  .action-btn { padding: 0.2rem 0.6rem; font-size: 0.75rem; border-radius: 5px; border: none; cursor: pointer; }
  .action-test { background: rgba(74,111,168,0.2); color: #4a6fa8; }
  .action-rotate { background: #e8e2d8; color: #2d2a26; }
  .action-remove { background: rgba(192,57,43,0.2); color: #c0392b; }
  .action-btn:disabled { opacity: 0.5; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 50;
  }
  .modal-box {
    background: #f0ebe0; border: 1px solid #d4cdc4; border-radius: 12px;
    padding: 1.5rem; width: 100%; max-width: 26rem; margin: 0 1rem;
  }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes cardExpand {
    from { opacity: 0; transform: scale(0.92); clip-path: inset(0 50% 50% 0 round 6px); }
    to { opacity: 1; transform: scale(1); clip-path: inset(0 0 0 0 round 6px); }
  }
  @keyframes flagPulse {
    0%, 100% { box-shadow: 0 1px 3px rgba(212,131,26,0.3); }
    50% { box-shadow: 0 1px 6px rgba(212,131,26,0.5); }
  }
  @keyframes newPulse {
    0%, 100% { box-shadow: 0 1px 2px rgba(74,111,168,0.3); }
    50% { box-shadow: 0 1px 5px rgba(74,111,168,0.5); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .pill-grid { flex-direction: column; }
    .pill.coupon { min-width: 0; }
    .smtp-grid { grid-template-columns: 1fr; }
    .action-btns { flex-wrap: wrap; }
    .key-row { flex-direction: column; }
    .key-row .test-btn { width: 100%; justify-content: center; }
    .section-toggle { padding: 0.55rem 0.75rem; }
    .section-body { padding: 0 0.75rem 0.75rem; }
  }
</style>
