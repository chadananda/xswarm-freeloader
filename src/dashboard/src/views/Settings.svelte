<script>
  import { onMount } from 'svelte'
  import { api } from '../lib/api.js'

  let settings = $state(null)
  let error = $state('')
  let saving = $state(false)
  let saved = $state('')
  let pwForm = $state({ current: '', next: '', confirm: '' })
  let pwError = $state('')
  let pwSaved = $state(false)

  onMount(async () => {
    try { settings = await api.settings() }
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
</script>

<div>
  <div class="mb-6">
    <h1 class="text-xl font-bold text-white">Settings</h1>
    <p class="text-gray-400 text-sm">tune the machine</p>
  </div>
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">{error}</div>
  {/if}
  {#if settings}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onsubmit={saveSettings} class="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 class="text-sm font-semibold text-gray-300 mb-4">general</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Router port</label>
            <input type="number" bind:value={settings.port} class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Email (for digests)</label>
            <input type="email" bind:value={settings.email} placeholder="you@example.com" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Digest frequency</label>
            <select bind:value={settings.digest_frequency} class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              {#each digestOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
            </select>
          </div>
          <div class="flex items-center gap-3">
            <input type="checkbox" id="update_check" bind:checked={settings.update_check} class="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500" />
            <label for="update_check" class="text-sm text-gray-300">check for updates automatically</label>
          </div>
        </div>
        {#if saved}
          <div class="mt-4 text-sm text-green-400">{saved}</div>
        {/if}
        <button type="submit" disabled={saving} class="mt-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {saving ? 'saving...' : 'save settings'}
        </button>
      </form>
      <div class="space-y-6">
        <form onsubmit={changePassword} class="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-4">change password</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Current password</label>
              <input type="password" bind:value={pwForm.current} autocomplete="current-password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">New password</label>
              <input type="password" bind:value={pwForm.next} autocomplete="new-password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Confirm new password</label>
              <input type="password" bind:value={pwForm.confirm} autocomplete="new-password" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          {#if pwError}
            <div class="mt-3 text-sm text-red-400">{pwError}</div>
          {/if}
          {#if pwSaved}
            <div class="mt-3 text-sm text-green-400">password changed — try not to forget it this time</div>
          {/if}
          <button type="submit" class="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            change password
          </button>
        </form>
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-3">about</h2>
          <p class="text-sm text-gray-400">xswarm-freeloader v2.0</p>
          <p class="text-sm text-gray-500 mt-1">your AI provider's worst nightmare</p>
          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div class="bg-gray-700/50 rounded-lg p-2"><span class="text-gray-400">router port</span><div class="text-white font-mono">4011</div></div>
            <div class="bg-gray-700/50 rounded-lg p-2"><span class="text-gray-400">dashboard port</span><div class="text-white font-mono">4010</div></div>
          </div>
        </div>
      </div>
    </div>
  {:else if !error}
    <div class="text-gray-400 text-sm">loading settings...</div>
  {/if}
</div>
