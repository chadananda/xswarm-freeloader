<script>
  import { api } from '../lib/api.js'
  import { setToken } from '../lib/stores.js'
  import { navigate } from '../lib/router.js'
  import DashboardCard from '../components/DashboardCard.svelte'

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

<div style="min-height:100vh; background:#1a1816; display:flex; align-items:center; justify-content:center;">
  <div style="width:100%; max-width:22rem; padding:0 1rem;">
    <div style="text-align:center; margin-bottom:2rem;">
      <div style="font-size:3rem; margin-bottom:0.5rem;">🐝</div>
      <h1 style="font-family:'Permanent Marker',cursive; font-size:1.4rem; color:#27864a; margin:0;">xswarm freeloader</h1>
      <p style="color:#8a7f78; font-size:0.78rem; margin:0.4rem 0 0;">breaking into your own dashboard...</p>
    </div>
    <DashboardCard accent="green">
      <form onsubmit={handleLogin} style="display:flex; flex-direction:column; gap:1rem;">
        <div>
          <label style="display:block; font-size:0.75rem; color:#8a7f78; margin-bottom:0.4rem;" for="password">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="shhh, it's a secret"
            autocomplete="current-password"
            style="width:100%; background:#2e2a27; border:1px solid #3a3530; border-radius:6px; padding:0.6rem 0.75rem; color:#c8bdb6; font-size:0.85rem; outline:none; box-sizing:border-box;"
          />
        </div>
        {#if error}
          <div style="font-size:0.78rem; color:#c0392b; background:rgba(192,57,43,0.1); border:1px solid rgba(192,57,43,0.3); border-radius:6px; padding:0.4rem 0.75rem;">{error}</div>
        {/if}
        <button
          type="submit"
          disabled={loading}
          style="background:#27864a; color:#fff; font-family:'Permanent Marker',cursive; font-size:0.9rem; padding:0.65rem; border-radius:6px; border:none; cursor:pointer; opacity:{loading ? 0.6 : 1}; transition:opacity 0.2s;"
        >
          {loading ? 'sneaking in...' : 'break in'}
        </button>
      </form>
    </DashboardCard>
    <p style="text-align:center; font-size:0.7rem; color:#5a5248; margin-top:1rem;">your free tiers are waiting</p>
  </div>
</div>
