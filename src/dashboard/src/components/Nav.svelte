<script>
  import { navigate } from '../lib/router.js'
  import { clearToken } from '../lib/stores.js'

  let { view } = $props()

  const links = [
    { hash: '#/overview', label: 'Overview', icon: '📊' },
    { hash: '#/providers', label: 'Providers', icon: '🔌' },
    { hash: '#/apps', label: 'Apps', icon: '📦' },
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

<aside class="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
  <div class="p-4 border-b border-gray-700">
    <div class="flex items-center gap-2">
      <span class="text-2xl">🐝</span>
      <div>
        <div class="font-bold text-green-400 text-sm leading-tight">xswarm</div>
        <div class="text-gray-400 text-xs leading-tight">freeloader</div>
      </div>
    </div>
    <div class="text-xs text-gray-500 mt-1">your free tiers, working hard</div>
  </div>
  <nav class="flex-1 p-2">
    {#each links as link}
      <button
        onclick={() => navigate(link.hash)}
        class="w-full text-left px-3 py-2 rounded-lg mb-1 text-sm flex items-center gap-2 transition-colors
          {view === link.label ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}"
      >
        <span>{link.icon}</span>
        <span>{link.label}</span>
      </button>
    {/each}
  </nav>
  <div class="p-2 border-t border-gray-700">
    <button
      onclick={logout}
      class="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-red-400 transition-colors flex items-center gap-2"
    >
      <span>🚪</span><span>Logout</span>
    </button>
  </div>
</aside>
