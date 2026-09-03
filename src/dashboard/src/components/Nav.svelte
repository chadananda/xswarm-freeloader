<script>
  import { onMount } from 'svelte'
  import { navigate } from '../lib/router.js'
  import { api } from '../lib/api.js'
  //
  let { view, open = false, onclose } = $props()
  let opportunityCount = $state(0)
  //
  onMount(async () => {
    try {
      const status = await api.onboardingStatus()
      opportunityCount = status.free_tier_unconfigured?.length || 0
    } catch { /* ignore */ }
  })
  //
  const links = [
    { hash: '#/overview', label: 'Overview', icon: '📊' },
    { hash: '#/accounts', label: 'Providers', icon: '🔌' },
    { hash: '#/apps', label: 'Apps', icon: '📦' },
    { hash: '#/routing', label: 'Routing', icon: '🗺️' },
    { hash: '#/usage', label: 'Usage', icon: '📈' },
    { hash: '#/settings', label: 'Settings', icon: '⚙️' }
  ]
  //
  function go(hash) {
    navigate(hash)
    if (onclose) onclose()
  }
</script>

{#if open}
  <div class="nav-overlay" onclick={onclose} role="presentation"></div>
{/if}
<aside class="nav-sidebar" class:open>
  <div class="nav-brand">
    <div class="brand-row">
      <span class="brand-icon">🐝</span>
      <div>
        <div class="brand-name">xswarm</div>
        <div class="brand-sub">freeloader</div>
      </div>
    </div>
    <div class="brand-tagline">your free tiers, working hard</div>
  </div>
  <nav class="nav-links">
    {#each links as link}
      <button
        onclick={() => go(link.hash)}
        class="nav-link"
        class:active={view === link.label || (link.hash === '#/accounts' && (view === 'Accounts' || view === 'Providers'))}
      >
        <span class="nav-icon">{link.icon}</span>
        <span>{link.label}</span>
        {#if link.label === 'Opportunities' && opportunityCount > 0}
          <span class="opp-badge"></span>
        {/if}
      </button>
    {/each}
  </nav>
</aside>

<style>
  .nav-sidebar {
    width: 13rem;
    background: #e6ddd0;
    border-right: 1px solid #d4cdc4;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: 100%;
  }
  .nav-overlay { display: none; }
  .nav-brand {
    padding: 1rem;
    border-bottom: 1px solid #d4cdc4;
  }
  .brand-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .brand-icon { font-size: 1.4rem; }
  .brand-name {
    font-family: 'Permanent Marker', cursive;
    color: #27864a;
    font-size: 0.85rem;
    line-height: 1.1;
  }
  .brand-sub {
    font-size: 0.7rem;
    color: #8b8579;
    line-height: 1;
  }
  .brand-tagline {
    font-size: 0.65rem;
    color: #a09789;
  }
  .nav-links {
    flex: 1;
    padding: 0.5rem;
    overflow-y: auto;
  }
  .nav-link {
    width: 100%;
    text-align: left;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    margin-bottom: 0.15rem;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
    background: transparent;
    color: #6b6560;
    font-family: 'Source Sans 3', sans-serif;
  }
  .nav-link:hover {
    background: rgba(0,0,0,0.05);
  }
  .nav-link.active {
    background: #f0ebe0;
    color: #27864a;
    font-weight: 600;
  }
  .nav-icon { font-size: 0.9rem; }
  .opp-badge {
    width: 7px;
    height: 7px;
    background: #27864a;
    border-radius: 50%;
    margin-left: auto;
    flex-shrink: 0;
    box-shadow: 0 0 0 0 rgba(39,134,74,0.4);
    animation: badgePulse 2s ease-in-out infinite;
  }
  @keyframes badgePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(39,134,74,0.4); }
    50% { box-shadow: 0 0 0 4px rgba(39,134,74,0); }
  }
  /* Mobile: sidebar becomes a slide-over drawer */
  @media (max-width: 768px) {
    .nav-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 50;
      width: 14rem;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: none;
    }
    .nav-sidebar.open {
      transform: translateX(0);
      box-shadow: 4px 0 20px rgba(0,0,0,0.15);
    }
    .nav-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(0,0,0,0.3);
    }
  }
</style>
