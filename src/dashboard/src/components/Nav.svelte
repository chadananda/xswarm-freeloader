<script>
  // :arch: sidebar nav — dark paper theme with Permanent Marker branding
  // :why: matches DashboardCard dark palette; active state uses green accent
  import { navigate } from '../lib/router.js'
  import { clearToken } from '../lib/stores.js'

  let { view } = $props()

  const links = [
    { hash: '#/overview', label: 'Overview', icon: '📊' },
    { hash: '#/providers', label: 'Providers', icon: '🔌' },
    { hash: '#/apps', label: 'Apps', icon: '📦' },
    { hash: '#/accounts', label: 'Accounts', icon: '🔑' },
    { hash: '#/routing', label: 'Routing', icon: '🗺️' },
    { hash: '#/usage', label: 'Usage', icon: '📈' },
    { hash: '#/opportunities', label: 'Opportunities', icon: '💡' },
    { hash: '#/settings', label: 'Settings', icon: '⚙️' }
  ]

  function logout() {
    clearToken()
    navigate('#/login')
  }
</script>

<aside style="width:14rem; background:#1e1c1a; border-right:1px solid #3a3530; display:flex; flex-direction:column; flex-shrink:0;">
  <div style="padding:1rem; border-bottom:1px solid #3a3530;">
    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
      <span style="font-size:1.5rem;">🐝</span>
      <div>
        <div style="font-family:'Permanent Marker',cursive; color:#27864a; font-size:0.85rem; line-height:1.1;">xswarm</div>
        <div style="font-family:'Special Elite',serif; color:#8a7f78; font-size:0.7rem; line-height:1;">freeloader</div>
      </div>
    </div>
    <div style="font-size:0.65rem; color:#5a5248; font-family:'Special Elite',serif;">your free tiers, working hard</div>
  </div>
  <nav style="flex:1; padding:0.5rem;">
    {#each links as link}
      <button
        onclick={() => navigate(link.hash)}
        style="width:100%; text-align:left; padding:0.45rem 0.75rem; border-radius:6px; margin-bottom:0.15rem; font-size:0.82rem; display:flex; align-items:center; gap:0.5rem; border:none; cursor:pointer; transition:background 0.15s;
          background:{view === link.label ? '#2e2a27' : 'transparent'};
          color:{view === link.label ? '#27864a' : '#8a7f78'};"
      >
        <span style="font-size:0.9rem;">{link.icon}</span>
        <span style="font-family:'Special Elite',serif;">{link.label}</span>
      </button>
    {/each}
  </nav>
  <div style="padding:0.5rem; border-top:1px solid #3a3530;">
    <button onclick={logout}
      style="width:100%; text-align:left; padding:0.45rem 0.75rem; border-radius:6px; font-size:0.82rem; display:flex; align-items:center; gap:0.5rem; border:none; cursor:pointer; background:transparent; color:#8a7f78; font-family:'Special Elite',serif; transition:color 0.15s;">
      <span>🚪</span><span>Logout</span>
    </button>
  </div>
</aside>
