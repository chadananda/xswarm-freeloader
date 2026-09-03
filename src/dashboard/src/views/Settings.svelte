<script>
  // :arch: settings view — general config, email reports (Resend/SMTP), password change, about
  // :why: DashboardCard wrapping for light paper theme; Resend as simple email provider option
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'
  import { navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'

  let settings = $state(null)
  let error = $state('')
  let saving = $state(false)
  let saved = $state('')
  let pwForm = $state({ current: '', next: '', confirm: '' })
  let pwError = $state('')
  let pwSaved = $state(false)
  let configVersions = $state([])
  // Email report state
  let emailProvider = $state('none')
  let emailApiKey = $state('')
  let emailRecipient = $state('')
  let emailFrequency = $state('daily')
  let emailSmtp = $state({ host: '', port: 587, user: '', pass: '' })
  let emailSaving = $state(false)
  let emailSaved = $state('')
  let emailError = $state('')
  let testSending = $state(false)
  let testResult = $state('')
  // Key management state
  let exportPassphrase = $state('')
  let exportError = $state('')
  let exportSuccess = $state('')
  let importing = $state(false)
  let importPassphrase = $state('')
  let importFile = $state(null)
  let importResult = $state('')

  onMount(async () => {
    try {
      settings = await api.settings()
      // Load email settings from config
      const email = settings?.config?.email || {}
      emailProvider = email.provider || 'none'
      emailApiKey = email.apiKey || ''
      emailRecipient = email.to || ''
      emailFrequency = email.digestFrequency || 'daily'
      if (email.smtp) emailSmtp = { host: email.smtp.host || '', port: email.smtp.port || 587, user: email.smtp.user || '', pass: email.smtp.pass || '' }
    }
    catch (err) { error = err.message }
  })

  async function saveSettings(e) {
    e.preventDefault()
    saving = true
    try {
      await api.updateSettings(settings)
      saved = 'settings saved!'
      setTimeout(() => { saved = '' }, 2000)
    } catch (err) {
      error = err.message
    } finally {
      saving = false
    }
  }

  async function saveEmailSettings(e) {
    e.preventDefault()
    emailSaving = true
    emailError = ''
    try {
      const emailConfig = {
        enabled: emailProvider !== 'none',
        provider: emailProvider,
        apiKey: emailProvider === 'resend' ? emailApiKey : undefined,
        smtp: emailProvider === 'smtp' ? emailSmtp : undefined,
        to: emailRecipient,
        digestFrequency: emailFrequency
      }
      await api.updateConfig({ email: emailConfig })
      emailSaved = 'email settings saved!'
      setTimeout(() => { emailSaved = '' }, 2000)
    } catch (err) {
      emailError = err.message
    } finally {
      emailSaving = false
    }
  }

  async function sendTestReport() {
    testSending = true
    testResult = ''
    try {
      const result = await api.sendTestReport()
      testResult = result.emailed ? `Test report sent to ${result.emailed}` : 'Report generated (no email configured)'
      setTimeout(() => { testResult = '' }, 4000)
    } catch (err) {
      testResult = `Failed: ${err.message}`
    } finally {
      testSending = false
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    pwError = ''
    if (pwForm.next !== pwForm.confirm) { pwError = 'passwords do not match'; return }
    if (pwForm.next.length < 8) { pwError = 'password must be at least 8 characters'; return }
    try {
      await api.changePassword({ current_password: pwForm.current, new_password: pwForm.next })
      pwForm = { current: '', next: '', confirm: '' }
      pwSaved = true
      setTimeout(() => { pwSaved = false }, 2000)
    } catch (err) {
      pwError = err.message
    }
  }

  const digestOptions = [
    { value: 'never', label: 'never' },
    { value: 'daily', label: 'daily' },
    { value: 'weekly', label: 'weekly' }
  ]

  const inputStyle = "background:#e8e2d8; border:1px solid #d4cdc4; border-radius:6px; padding:0.45rem 0.75rem; font-size:0.85rem; color:#2d2a26; outline:none; width:100%; box-sizing:border-box;"

  async function loadVersions() {
    try { configVersions = await api.getConfigVersions(10) }
    catch (err) { error = err.message }
  }

  async function rollbackVersion(versionNumber) {
    if (!confirm(`Rollback to config version ${versionNumber}?`)) return
    try {
      await api.rollbackConfig(versionNumber)
      saved = 'rolled back!'
      setTimeout(() => { saved = '' }, 2000)
    } catch (err) { error = err.message }
  }
  //
  async function exportKeys() {
    if (exportPassphrase.length < 8) { exportError = 'Passphrase must be at least 8 characters'; return }
    exportError = ''
    try {
      const result = await api.exportKeys(exportPassphrase)
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'xswarm-keys-export.json'
      a.click()
      URL.revokeObjectURL(url)
      exportSuccess = `Exported ${result.count} keys`
      exportPassphrase = ''
      setTimeout(() => { exportSuccess = '' }, 3000)
    } catch (err) { exportError = err.message }
  }
  //
  async function importKeys() {
    if (!importFile || importPassphrase.length < 8) { importResult = 'Select file and enter passphrase (min 8 chars)'; return }
    importing = true
    importResult = ''
    try {
      const text = await importFile.text()
      const bundle = JSON.parse(text)
      const result = await api.importKeys(importPassphrase, bundle)
      importResult = `Imported ${result.imported}, skipped ${result.skipped}${result.errors.length ? ', errors: ' + result.errors.join('; ') : ''}`
      importPassphrase = ''
      importFile = null
    } catch (err) { importResult = `Failed: ${err.message}` }
    importing = false
  }
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-lg font-bold" style="font-family:'Permanent Marker',cursive; color:#27864a;">Settings</h1>
    <p style="color:#8b8579; font-size:0.78rem;">tune the machine</p>
  </div>
  {#if error}
    <div style="color:#c0392b; font-size:0.75rem; background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.2); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
  {/if}
  {#if settings}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="space-y-5">
        <DashboardCard title="General" accent="green">
          <form onsubmit={saveSettings} style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label for="set-port" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Router port</label>
              <input id="set-port" type="number" bind:value={settings.port} style={inputStyle} />
            </div>
            <div>
              <label for="set-email" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Email (for digests)</label>
              <input id="set-email" type="email" bind:value={settings.email} placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label for="set-digest-freq" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Digest frequency</label>
              <select id="set-digest-freq" bind:value={settings.digest_frequency} style={inputStyle}>
                {#each digestOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <input type="checkbox" id="update_check" bind:checked={settings.update_check}
                style="accent-color:#27864a; width:1rem; height:1rem;" />
              <label for="update_check" style="font-size:0.85rem; color:#2d2a26;">check for updates automatically</label>
            </div>
            {#if saved}
              <div style="font-size:0.78rem; color:#27864a;">{saved}</div>
            {/if}
            <button type="submit" disabled={saving}
              style="background:#27864a; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; opacity:{saving ? 0.6 : 1}; align-self:flex-start;">
              {saving ? 'saving...' : 'save settings'}
            </button>
          </form>
        </DashboardCard>
        <DashboardCard title="Email Reports" accent="blue">
          <form onsubmit={saveEmailSettings} style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label for="set-email-provider" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Email provider</label>
              <select id="set-email-provider" bind:value={emailProvider} style={inputStyle}>
                <option value="none">Disabled</option>
                <option value="resend">Resend (free — 100 emails/day)</option>
                <option value="smtp">Custom SMTP</option>
              </select>
            </div>
            {#if emailProvider === 'resend'}
              <div>
                <label for="set-resend-key" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Resend API key</label>
                <input id="set-resend-key" type="password" bind:value={emailApiKey} placeholder="re_..." style={inputStyle} />
                <div style="font-size:0.75rem; color:#8b8579; margin-top:0.3rem;">
                  Get a free key at <a href="https://resend.com" target="_blank" style="color:#4a6fa8;">resend.com</a> (100 emails/day free)
                </div>
              </div>
            {/if}
            {#if emailProvider === 'smtp'}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="set-smtp-host" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">SMTP host</label>
                  <input id="set-smtp-host" type="text" bind:value={emailSmtp.host} placeholder="smtp.example.com" style={inputStyle} />
                </div>
                <div>
                  <label for="set-smtp-port" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Port</label>
                  <input id="set-smtp-port" type="number" bind:value={emailSmtp.port} style={inputStyle} />
                </div>
                <div>
                  <label for="set-smtp-user" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Username</label>
                  <input id="set-smtp-user" type="text" bind:value={emailSmtp.user} style={inputStyle} />
                </div>
                <div>
                  <label for="set-smtp-pass" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Password</label>
                  <input id="set-smtp-pass" type="password" bind:value={emailSmtp.pass} style={inputStyle} />
                </div>
              </div>
            {/if}
            {#if emailProvider !== 'none'}
              <div>
                <label for="set-email-to" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Recipient email</label>
                <input id="set-email-to" type="email" bind:value={emailRecipient} placeholder="you@example.com" style={inputStyle} />
              </div>
              <div>
                <label for="set-report-freq" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Report frequency</label>
                <select id="set-report-freq" bind:value={emailFrequency} style={inputStyle}>
                  {#each digestOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
                </select>
              </div>
            {/if}
            {#if emailError}
              <div style="font-size:0.78rem; color:#c0392b;">{emailError}</div>
            {/if}
            {#if emailSaved}
              <div style="font-size:0.78rem; color:#27864a;">{emailSaved}</div>
            {/if}
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <button type="submit" disabled={emailSaving}
                style="background:#4a6fa8; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; opacity:{emailSaving ? 0.6 : 1};">
                {emailSaving ? 'saving...' : 'save email settings'}
              </button>
              {#if emailProvider !== 'none'}
                <button type="button" onclick={sendTestReport} disabled={testSending}
                  style="background:#e8e2d8; color:#2d2a26; font-size:0.8rem; padding:0.4rem 1rem; border-radius:6px; border:1px solid #d4cdc4; cursor:pointer; opacity:{testSending ? 0.6 : 1};">
                  {testSending ? 'sending...' : 'send test report'}
                </button>
              {/if}
            </div>
            {#if testResult}
              <div style="font-size:0.78rem; color:{testResult.startsWith('Failed') ? '#c0392b' : '#27864a'};">{testResult}</div>
            {/if}
          </form>
        </DashboardCard>
      </div>
      <div class="space-y-5">
        <DashboardCard title="Change password" accent="blue">
          <form onsubmit={changePassword} style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label for="set-pw-current" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Current password</label>
              <input id="set-pw-current" type="password" bind:value={pwForm.current} autocomplete="current-password" style={inputStyle} />
            </div>
            <div>
              <label for="set-pw-new" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">New password</label>
              <input id="set-pw-new" type="password" bind:value={pwForm.next} autocomplete="new-password" style={inputStyle} />
            </div>
            <div>
              <label for="set-pw-confirm" style="display:block; font-size:0.75rem; color:#8b8579; margin-bottom:0.3rem;">Confirm new password</label>
              <input id="set-pw-confirm" type="password" bind:value={pwForm.confirm} autocomplete="new-password" style={inputStyle} />
            </div>
            {#if pwError}
              <div style="font-size:0.78rem; color:#c0392b;">{pwError}</div>
            {/if}
            {#if pwSaved}
              <div style="font-size:0.78rem; color:#27864a;">password changed — try not to forget it this time</div>
            {/if}
            <button type="submit"
              style="background:#4a6fa8; color:#fff; font-size:0.8rem; font-weight:600; padding:0.4rem 1rem; border-radius:6px; border:none; cursor:pointer; align-self:flex-start;">
              change password
            </button>
          </form>
        </DashboardCard>
        <DashboardCard title="About" accent="orange">
          <p style="font-size:0.85rem; color:#2d2a26; margin:0 0 0.25rem;">xswarm-freeloader v2.0</p>
          <p style="font-size:0.78rem; color:#8b8579; margin:0 0 0.75rem;">your AI provider's worst nightmare</p>
          <div class="grid grid-cols-2 gap-2">
            <div style="background:#e8e2d8; border-radius:6px; padding:0.5rem 0.75rem;">
              <div style="font-size:0.75rem; color:#8b8579;">router port</div>
              <div style="font-family:monospace; color:#2d2a26; font-size:0.85rem;">4011</div>
            </div>
            <div style="background:#e8e2d8; border-radius:6px; padding:0.5rem 0.75rem;">
              <div style="font-size:0.75rem; color:#8b8579;">dashboard port</div>
              <div style="font-family:monospace; color:#2d2a26; font-size:0.85rem;">4010</div>
            </div>
          </div>
        </DashboardCard>
        <DashboardCard title="Config Versions" accent="green">
          <div style="font-size:0.78rem; color:#8b8579;">
            <button onclick={loadVersions}
              style="background:#e8e2d8; color:#2d2a26; font-size:0.75rem; padding:0.3rem 0.75rem; border-radius:6px; border:1px solid #d4cdc4; cursor:pointer; margin-bottom:0.75rem;">
              load version history
            </button>
            {#each configVersions as v}
              <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; border-bottom:1px solid rgba(212,205,196,0.5);">
                <div>
                  <span style="color:#2d2a26;">v{v.version_number}</span>
                  <span style="margin-left:0.5rem; font-size:0.75rem;">{v.change_description || 'no description'}</span>
                </div>
                <button onclick={() => rollbackVersion(v.version_number)}
                  style="font-size:0.75rem; background:none; border:none; cursor:pointer; color:#d4831a;">
                  rollback
                </button>
              </div>
            {:else}
              <div style="color:#8b8579; font-size:0.78rem;">click to load versions</div>
            {/each}
          </div>
        </DashboardCard>
        <DashboardCard title="Key Management" accent="orange">
          <div style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <h4 style="font-size:0.85rem; font-weight:600; color:#2d2a26; margin:0 0 0.5rem;">Export Keys</h4>
              <p style="font-size:0.75rem; color:#8b8579; margin:0 0 0.5rem;">Download an encrypted backup of all API keys.</p>
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="password" bind:value={exportPassphrase} placeholder="Passphrase (min 8 chars)" aria-label="Export passphrase" style={inputStyle} />
                <button onclick={exportKeys} style="background:#d4831a; color:#fff; font-size:0.78rem; font-weight:600; padding:0.45rem 0.75rem; border-radius:6px; border:none; cursor:pointer; white-space:nowrap;">Export</button>
              </div>
              {#if exportError}<div style="font-size:0.75rem; color:#c0392b; margin-top:0.3rem;">{exportError}</div>{/if}
              {#if exportSuccess}<div style="font-size:0.75rem; color:#27864a; margin-top:0.3rem;">{exportSuccess}</div>{/if}
            </div>
            <div style="border-top:1px solid #d4cdc4; padding-top:1rem;">
              <h4 style="font-size:0.85rem; font-weight:600; color:#2d2a26; margin:0 0 0.5rem;">Import Keys</h4>
              <p style="font-size:0.75rem; color:#8b8579; margin:0 0 0.5rem;">Restore keys from an encrypted backup file.</p>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                <input type="file" accept=".json" onchange={(e) => importFile = e.target.files[0]} aria-label="Key backup file" style="font-size:0.78rem; color:#6b6560;" />
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="password" bind:value={importPassphrase} placeholder="Passphrase" aria-label="Import passphrase" style={inputStyle} />
                  <button onclick={importKeys} disabled={importing} style="background:#d4831a; color:#fff; font-size:0.78rem; font-weight:600; padding:0.45rem 0.75rem; border-radius:6px; border:none; cursor:pointer; white-space:nowrap; opacity:{importing ? 0.6 : 1};">{importing ? 'importing...' : 'Import'}</button>
                </div>
              </div>
              {#if importResult}<div style="font-size:0.75rem; color:{importResult.startsWith('Failed') ? '#c0392b' : '#27864a'}; margin-top:0.3rem;">{importResult}</div>{/if}
            </div>
            <div style="border-top:1px solid #d4cdc4; padding-top:0.75rem;">
              <button onclick={() => navigate('#/onboarding')} style="background:none; border:none; cursor:pointer; color:#4a6fa8; font-size:0.78rem; padding:0;">Re-run Setup Wizard →</button>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  {:else if !error}
    <div style="color:#8b8579; font-size:0.85rem;">loading settings...</div>
  {/if}
</div>
