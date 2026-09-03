<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import { navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'
  import ProviderCard from '../components/ProviderCard.svelte'
  //
  let status = $state(null)
  let localResults = $state([])
  let discoveryDone = $state(false)
  let customEndpoint = $state('')
  let configuredProviders = $state(new Set())
  let registering = $state(false)
  let mounted = $state(false)
  // Email state
  let emailProvider = $state('none')
  let emailApiKey = $state('')
  let emailRecipient = $state('')
  let emailSmtp = $state({ host: '', port: 587, user: '', pass: '' })
  let emailSaving = $state(false)
  let emailSaved = $state('')
  // Network sharing state
  let networkPassword = $state('')
  let networkSaving = $state(false)
  let networkResult = $state('')
  //
  const inputStyle = "background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.5rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; width:100%; box-sizing:border-box; transition:border-color 0.2s;"
  //
  onMount(async () => {
    setTimeout(() => { mounted = true }, 50)
    try { status = await api.onboardingStatus() } catch { status = { needed: true, free_tier_unconfigured: [], accounts_count: 0 } }
    try {
      localResults = await api.discoverLocal()
      discoveryDone = true
    } catch { discoveryDone = true }
  })
  //
  const freeTierProviders = $derived(status?.free_tier_unconfigured?.filter(p => !['openai', 'anthropic', 'together'].includes(p.id)) || [])
  const paidProviders = $derived(status?.free_tier_unconfigured?.filter(p => ['openai', 'anthropic', 'together'].includes(p.id)) || [])
  const availableLocal = $derived(localResults.filter(r => r.available))
  const allLocalModels = $derived(availableLocal.flatMap(r => r.models.map(m => ({ ...m, source: r.name, url: r.url }))))
  const totalConfigured = $derived(configuredProviders.size + (status?.accounts_count || 0))
  // Step completion tracking
  const step1Done = $derived(totalConfigured > 0)
  const step2Done = $derived(discoveryDone)
  const step3Done = $derived(emailProvider !== 'none' || networkPassword.length >= 8)
  //
  function handleProviderConfigured(providerId) {
    configuredProviders = new Set([...configuredProviders, providerId])
  }
  //
  async function discoverCustom() {
    if (!customEndpoint.trim()) return
    try {
      const results = await api.discoverLocal([customEndpoint.trim()])
      localResults = [...localResults, ...results]
    } catch { /* ignore */ }
  }
  //
  async function registerLocalModels() {
    if (!allLocalModels.length) return
    registering = true
    try { await api.registerLocal(allLocalModels, availableLocal[0]?.url) } catch { /* ignore */ }
    registering = false
  }
  //
  async function saveEmail() {
    emailSaving = true
    try {
      await api.updateConfig({ email: { enabled: emailProvider !== 'none', provider: emailProvider, apiKey: emailProvider === 'resend' ? emailApiKey : undefined, smtp: emailProvider === 'smtp' ? emailSmtp : undefined, to: emailRecipient, digestFrequency: 'daily' } })
      emailSaved = 'Email configured!'
      setTimeout(() => { emailSaved = '' }, 3000)
    } catch { emailSaved = '' }
    emailSaving = false
  }
  //
  async function enableNetwork() {
    if (networkPassword.length < 8) { networkResult = 'Password must be at least 8 characters'; return }
    networkSaving = true
    try {
      await api.enablePassword(networkPassword)
      networkResult = 'Network sharing enabled! Server restart required.'
    } catch (err) { networkResult = `Failed: ${err.message}` }
    networkSaving = false
  }
  //
  function finish() { navigate('#/overview') }
</script>

<div class="onboarding-page" class:mounted>
  <div class="onboarding-container">
    <!-- Hero: Welcome -->
    <div class="hero" style="animation-delay:0.1s">
      <div class="hero-grain"></div>
      <div class="hero-inner">
        <div class="bee-badge">🐝</div>
        <h1 class="hero-title">Welcome to Freeloader</h1>
        <p class="hero-desc">
          A local AI router that maximizes free tier usage across LLM providers.
          It sits between your apps and AI services, automatically routing to free tiers first,
          then cheapest options. <strong>Your keys and data stay on this machine.</strong>
        </p>
        <div class="hero-cta">Let's set up your free tiers</div>
      </div>
    </div>
    <!-- Step timeline -->
    <div class="timeline">
      <div class="timeline-step" class:done={step1Done}>
        <div class="timeline-dot">{step1Done ? '✓' : '1'}</div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-step" class:done={step2Done && availableLocal.length > 0}>
        <div class="timeline-dot">{step2Done && availableLocal.length > 0 ? '✓' : '2'}</div>
        <div class="timeline-line"></div>
      </div>
      <div class="timeline-step" class:done={step3Done}>
        <div class="timeline-dot">{step3Done ? '✓' : '3'}</div>
      </div>
    </div>
    <!-- Step 1: Free Tier API Keys -->
    <section class="step" style="animation-delay:0.25s">
      <div class="step-header">
        <div class="step-number" class:done={step1Done}>{step1Done ? '✓' : '1'}</div>
        <div>
          <h2 class="step-title">Free Tier API Keys</h2>
          <p class="step-subtitle">Each provider offers free tiers. Get keys from any or all of them.</p>
        </div>
      </div>
      <div class="step-content">
        <div class="provider-stack">
          {#each freeTierProviders as provider}
            <ProviderCard {provider} configured={configuredProviders.has(provider.id)} onConfigured={handleProviderConfigured} />
          {/each}
        </div>
        {#if paidProviders.length > 0}
          <div class="paid-divider">
            <span class="paid-divider-line"></span>
            <span class="paid-divider-text">premium fallbacks (optional)</span>
            <span class="paid-divider-line"></span>
          </div>
          <div class="provider-stack">
            {#each paidProviders as provider}
              <ProviderCard {provider} configured={configuredProviders.has(provider.id)} onConfigured={handleProviderConfigured} />
            {/each}
          </div>
        {/if}
      </div>
    </section>
    <!-- Step 2: Local AI -->
    <section class="step" style="animation-delay:0.4s">
      <div class="step-header">
        <div class="step-number" class:done={step2Done && availableLocal.length > 0}>{step2Done && availableLocal.length > 0 ? '✓' : '2'}</div>
        <div>
          <h2 class="step-title">Local AI</h2>
          <p class="step-subtitle">Auto-detecting Ollama and LM Studio on this machine.</p>
        </div>
      </div>
      <div class="step-content">
        <DashboardCard accent="green">
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
                    <span class="model-tag">{model.name}</span>
                  {/each}
                </div>
              </div>
            {/each}
            <button onclick={registerLocalModels} disabled={registering} class="btn btn-green" style="margin-top:0.75rem;">
              {registering ? 'Registering...' : `Register ${allLocalModels.length} local model${allLocalModels.length !== 1 ? 's' : ''}`}
            </button>
          {:else}
            <div style="text-align:center; padding:0.75rem 0;">
              <p style="font-size:0.85rem; color:#8b8579; margin:0 0 0.25rem;">No local AI detected.</p>
              <p style="font-size:0.78rem; color:#a09789; margin:0;">No problem — free cloud tiers have you covered.</p>
            </div>
          {/if}
          <div class="custom-probe">
            <input type="text" bind:value={customEndpoint} placeholder="http://192.168.1.10:11434" aria-label="Custom endpoint URL" style={inputStyle} />
            <button onclick={discoverCustom} class="btn btn-outline">Probe</button>
          </div>
        </DashboardCard>
      </div>
    </section>
    <!-- Step 3: Email & Network (Optional) -->
    <section class="step" style="animation-delay:0.55s">
      <div class="step-header">
        <div class="step-number optional">{step3Done ? '✓' : '3'}</div>
        <div>
          <h2 class="step-title">Email & Network <span class="optional-badge">optional</span></h2>
          <p class="step-subtitle">Reports, key backup, and multi-device access.</p>
        </div>
      </div>
      <div class="step-content">
        <div class="step-cards">
          <DashboardCard accent="blue">
            <h3 class="card-section-title">Email Setup</h3>
            <div class="form-stack">
              <div>
                <label class="field-label" for="onb-email-provider">Email provider</label>
                <select id="onb-email-provider" bind:value={emailProvider} style={inputStyle}>
                  <option value="none">Skip for now</option>
                  <option value="resend">Resend (free — 100 emails/day)</option>
                  <option value="smtp">Custom SMTP</option>
                </select>
              </div>
              {#if emailProvider === 'resend'}
                <div>
                  <label class="field-label" for="onb-resend-key">Resend API key</label>
                  <input id="onb-resend-key" type="password" bind:value={emailApiKey} placeholder="re_..." style={inputStyle} />
                  <p class="field-hint">Get a free key at <a href="https://resend.com" target="_blank" class="link">resend.com</a></p>
                </div>
              {/if}
              {#if emailProvider === 'smtp'}
                <div class="smtp-grid">
                  <div>
                    <label class="field-label" for="onb-smtp-host">SMTP host</label>
                    <input id="onb-smtp-host" type="text" bind:value={emailSmtp.host} placeholder="smtp.example.com" style={inputStyle} />
                  </div>
                  <div>
                    <label class="field-label" for="onb-smtp-port">Port</label>
                    <input id="onb-smtp-port" type="number" bind:value={emailSmtp.port} style={inputStyle} />
                  </div>
                  <div>
                    <label class="field-label" for="onb-smtp-user">Username</label>
                    <input id="onb-smtp-user" type="text" bind:value={emailSmtp.user} style={inputStyle} />
                  </div>
                  <div>
                    <label class="field-label" for="onb-smtp-pass">Password</label>
                    <input id="onb-smtp-pass" type="password" bind:value={emailSmtp.pass} style={inputStyle} />
                  </div>
                </div>
              {/if}
              {#if emailProvider !== 'none'}
                <div>
                  <label class="field-label" for="onb-email-to">Your email</label>
                  <input id="onb-email-to" type="email" bind:value={emailRecipient} placeholder="you@example.com" style={inputStyle} />
                </div>
                <button onclick={saveEmail} disabled={emailSaving} class="btn btn-blue">
                  {emailSaving ? 'saving...' : 'Save email settings'}
                </button>
                {#if emailSaved}<div class="success-msg">{emailSaved}</div>{/if}
              {/if}
            </div>
          </DashboardCard>
          <DashboardCard accent="orange">
            <h3 class="card-section-title">Share across network</h3>
            <p class="field-hint" style="margin-bottom:0.75rem;">Set a password to access from other devices. It will be emailed for recovery.</p>
            <div class="custom-probe">
              <input type="password" bind:value={networkPassword} placeholder="Password (min 8 chars)" aria-label="Network sharing password" style={inputStyle} />
              <button onclick={enableNetwork} disabled={networkSaving} class="btn btn-orange">
                {networkSaving ? 'enabling...' : 'Enable'}
              </button>
            </div>
            {#if networkResult}
              <div class={networkResult.startsWith('Failed') ? 'error-msg' : 'success-msg'} style="margin-top:0.4rem;">{networkResult}</div>
            {/if}
            <p style="font-size:0.75rem; color:#a09789; margin:0.75rem 0 0;">I'll set this up later in Settings</p>
          </DashboardCard>
        </div>
      </div>
    </section>
    <!-- Summary -->
    <section class="summary" style="animation-delay:0.7s">
      <div class="summary-grain"></div>
      <div class="summary-inner">
        <h2 class="summary-title">You're all set!</h2>
        <div class="summary-stats">
          <div class="stat-box">
            <div class="stat-value">{totalConfigured}</div>
            <div class="stat-label">providers</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">{allLocalModels.length}</div>
            <div class="stat-label">local models</div>
          </div>
        </div>
        <div class="endpoint-box">
          <div class="field-label" style="margin-bottom:0.4rem;">Your endpoint</div>
          <code class="endpoint-code">http://localhost:4011/v1/chat/completions</code>
        </div>
        <button onclick={finish} class="finish-btn">
          Go to Dashboard →
        </button>
      </div>
    </section>
  </div>
</div>

<style>
  .onboarding-page {
    min-height: 100vh;
    background: #ede8df;
    padding: 0;
    overflow-y: auto;
  }
  .onboarding-container {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
  }
  /* Hero — full-screen splash */
  .hero {
    position: relative;
    background: #f0ebe0;
    overflow: hidden;
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 3rem;
    box-shadow: 0 4px 20px rgba(30,20,10,0.08), 0 1px 3px rgba(30,20,10,0.06);
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.6s ease forwards;
    border-bottom: 1px solid #d4cdc4;
  }
  .hero-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
    background-size: 300px;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: multiply;
  }
  .hero-inner {
    position: relative;
    padding: 4rem 2rem;
    text-align: center;
    max-width: 42rem;
  }
  .bee-badge {
    font-size: 5rem;
    margin-bottom: 1rem;
    animation: beeFloat 3s ease-in-out infinite;
  }
  .hero-title {
    font-family: 'Permanent Marker', cursive;
    font-size: 2.8rem;
    color: #27864a;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
    line-height: 1.1;
  }
  .hero-desc {
    font-size: 1.05rem;
    color: #6b6560;
    line-height: 1.7;
    max-width: 36rem;
    margin: 0 auto 1.5rem;
  }
  .hero-desc strong { color: #2d2a26; }
  .hero-cta {
    font-size: 1rem;
    color: #27864a;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .hero-cta::after {
    content: '↓';
    font-size: 1.2rem;
    animation: bounce 1.5s ease-in-out infinite;
  }
  /* Timeline */
  .timeline {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0;
    margin-bottom: 2.5rem;
    padding: 0 6rem;
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
  }
  .timeline-step {
    display: flex;
    align-items: center;
    flex: 1;
  }
  .timeline-step:last-child { flex: 0; }
  .timeline-dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #e8e2d8;
    border: 2px solid #d4cdc4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #8b8579;
    flex-shrink: 0;
    transition: all 0.4s ease;
  }
  .timeline-step.done .timeline-dot {
    background: #27864a;
    border-color: #27864a;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(39,134,74,0.15);
  }
  .timeline-line {
    flex: 1;
    height: 2px;
    background: repeating-linear-gradient(90deg, #d4cdc4, #d4cdc4 4px, transparent 4px, transparent 8px);
    margin: 0 0.25rem;
  }
  .timeline-step.done .timeline-line {
    background: repeating-linear-gradient(90deg, #27864a, #27864a 4px, transparent 4px, transparent 8px);
  }
  /* Steps */
  .step {
    margin-bottom: 2rem;
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.5s ease forwards;
  }
  .step-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .step-number {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: #e8e2d8;
    border: 2px solid #d4cdc4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #8b8579;
    flex-shrink: 0;
    margin-top: 0.1rem;
    transition: all 0.4s ease;
  }
  .step-number.done {
    background: #27864a;
    border-color: #27864a;
    color: #fff;
  }
  .step-number.optional { border-style: dashed; }
  .step-title {
    font-family: 'Permanent Marker', cursive;
    font-size: 1.05rem;
    color: #27864a;
    margin: 0;
    line-height: 1.2;
  }
  .step-subtitle {
    font-size: 0.78rem;
    color: #8b8579;
    margin: 0.15rem 0 0;
  }
  .step-content { padding-left: 2.5rem; padding-right: 0.5rem; }
  /* Provider grid — multi-column on wide screens */
  .provider-stack {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 0.75rem;
  }
  /* Paid providers divider */
  .paid-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.25rem 0;
  }
  .paid-divider-line {
    flex: 1;
    height: 1px;
    background: #d4cdc4;
  }
  .paid-divider-text {
    font-size: 0.72rem;
    color: #a09789;
    text-transform: lowercase;
    letter-spacing: 0.03em;
  }
  /* Optional badge */
  .optional-badge {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 0.65rem;
    background: #e8e2d8;
    color: #a09789;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    margin-left: 0.5rem;
    vertical-align: middle;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 600;
  }
  /* Local discovery */
  .scan-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }
  .scan-dot {
    width: 8px;
    height: 8px;
    background: #27864a;
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .local-service { margin-bottom: 0.75rem; }
  .local-service-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.35rem;
  }
  .local-check {
    color: #27864a;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .local-url {
    font-size: 0.72rem;
    color: #a09789;
    background: #e8e2d8;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    margin-left: auto;
  }
  .local-models {
    padding-left: 1.1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .model-tag {
    font-size: 0.72rem;
    background: #e8e2d8;
    color: #6b6560;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid #d4cdc4;
  }
  .custom-probe {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.75rem;
  }
  /* Step 3 cards — side by side on desktop */
  .step-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.75rem;
  }
  .card-section-title {
    font-weight: 600;
    color: #2d2a26;
    font-size: 0.88rem;
    margin: 0 0 0.75rem;
  }
  .form-stack {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .smtp-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .field-label {
    display: block;
    font-size: 0.75rem;
    color: #8b8579;
    margin-bottom: 0.3rem;
  }
  .field-hint {
    font-size: 0.75rem;
    color: #8b8579;
    margin: 0.3rem 0 0;
  }
  .link { color: #4a6fa8; text-decoration: none; }
  .link:hover { text-decoration: underline; }
  /* Summary */
  .summary {
    position: relative;
    background: #f0ebe0;
    border: 2px solid #27864a;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 0.5rem;
    box-shadow: 0 2px 12px rgba(39,134,74,0.1), 0 1px 3px rgba(30,20,10,0.06);
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.5s ease forwards;
  }
  .summary-grain {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.12' numOctaves='2' stitchTiles='stitch' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.12'/%3E%3C/svg%3E");
    background-size: 300px;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: multiply;
  }
  .summary-inner {
    position: relative;
    padding: 3rem 2rem;
    text-align: center;
    max-width: 32rem;
    margin: 0 auto;
  }
  .summary-title {
    font-family: 'Permanent Marker', cursive;
    font-size: 1.8rem;
    color: #27864a;
    margin: 0 0 1.5rem;
  }
  .summary-stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
  }
  .stat-box { text-align: center; }
  .stat-value {
    font-size: 2.8rem;
    font-weight: 800;
    color: #27864a;
    line-height: 1;
  }
  .stat-label {
    font-size: 0.72rem;
    color: #8b8579;
    margin-top: 0.2rem;
    text-transform: lowercase;
  }
  .stat-divider {
    width: 1px;
    height: 2.5rem;
    background: #d4cdc4;
  }
  .endpoint-box { margin-bottom: 1.25rem; }
  .endpoint-code {
    display: block;
    font-size: 0.82rem;
    color: #2d2a26;
    background: #e8e2d8;
    padding: 0.55rem 0.75rem;
    border-radius: 6px;
    border: 1px solid #d4cdc4;
    word-break: break-all;
  }
  .finish-btn {
    background: #27864a;
    color: #fff;
    font-family: 'Permanent Marker', cursive;
    font-size: 1.2rem;
    padding: 0.9rem 2rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    width: 100%;
    max-width: 20rem;
    margin: 0 auto;
    display: block;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 2px 8px rgba(39,134,74,0.2);
  }
  .finish-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(39,134,74,0.25);
  }
  .finish-btn:active { transform: translateY(0); }
  /* Buttons */
  .btn {
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn:disabled { opacity: 0.6; cursor: default; }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn-green { background: #27864a; color: #fff; }
  .btn-blue { background: #4a6fa8; color: #fff; align-self: flex-start; }
  .btn-orange { background: #d4831a; color: #fff; }
  .btn-outline {
    background: #e8e2d8;
    color: #2d2a26;
    border: 1px solid #d4cdc4;
  }
  /* Messages */
  .success-msg { font-size: 0.78rem; color: #27864a; margin-top: 0.3rem; }
  .error-msg { font-size: 0.78rem; color: #c0392b; }
  /* Animations */
  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes beeFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(3px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @media (max-width: 768px) {
    .hero { min-height: 60vh; }
    .hero-inner { padding: 2.5rem 1.5rem; }
    .hero-title { font-size: 1.8rem; }
    .hero-desc { font-size: 0.88rem; }
    .bee-badge { font-size: 3.5rem; }
    .onboarding-container { padding: 0 1rem 2rem; }
    .timeline { padding: 0 2rem; }
    .step-content { padding-left: 0; padding-right: 0; }
    .step-header { gap: 0.5rem; }
    .provider-stack { grid-template-columns: 1fr; }
    .step-cards { grid-template-columns: 1fr; }
    .smtp-grid { grid-template-columns: 1fr; }
    .summary-inner { padding: 2rem 1.5rem; }
    .summary-title { font-size: 1.3rem; }
    .stat-value { font-size: 2rem; }
  }
</style>
