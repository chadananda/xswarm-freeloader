<script>
  import { api } from '../lib/api.js'
  import { setToken } from '../lib/stores.js'
  import { navigate } from '../lib/router.js'

  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function handleLogin(e) {
    e.preventDefault()
    loading = true
    error = ''
    try {
      const { token } = await api.login(password)
      setToken(token)
      navigate('#/overview')
    } catch (err) {
      error = 'Wrong password. Nice try though.'
    } finally {
      loading = false
    }
  }
</script>

<div class="min-h-screen bg-gray-900 flex items-center justify-center">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="text-5xl mb-3">🐝</div>
      <h1 class="text-2xl font-bold text-white">xswarm freeloader</h1>
      <p class="text-gray-400 text-sm mt-1">breaking into your own dashboard...</p>
    </div>
    <form onsubmit={handleLogin} class="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
      <div class="mb-4">
        <label class="block text-sm text-gray-400 mb-2" for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="shhh, it's a secret"
          autocomplete="current-password"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>
      {#if error}
        <div class="mb-4 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</div>
      {/if}
      <button
        type="submit"
        disabled={loading}
        class="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'sneaking in...' : 'break in'}
      </button>
    </form>
    <p class="text-center text-xs text-gray-600 mt-4">your free tiers are waiting</p>
  </div>
</div>
