<script>
  import { onMount } from 'svelte'
  import { isAuthenticated, currentView } from './lib/stores.js'
  import { initRouter, navigate } from './lib/router.js'
  import { api } from './lib/api.js'
  import Nav from './components/Nav.svelte'
  import Footer from './components/Footer.svelte'
  import Login from './views/Login.svelte'
  import Overview from './views/Overview.svelte'
  import Providers from './views/Providers.svelte'
  import Apps from './views/Apps.svelte'
  import Accounts from './views/Accounts.svelte'
  import Routing from './views/Routing.svelte'
  import Usage from './views/Usage.svelte'
  import Opportunities from './views/Opportunities.svelte'
  import Settings from './views/Settings.svelte'
  import AppDetail from './views/AppDetail.svelte'
  import Onboarding from './views/Onboarding.svelte'
  //
  const views = { Login, Overview, Providers, Apps, AppDetail, Accounts, Routing, Usage, Opportunities, Settings, Onboarding }
  //
  let auth = $state(false)
  let view = $state('Overview')
  let navOpen = $state(false)
  //
  isAuthenticated.subscribe(v => { auth = v })
  currentView.subscribe(v => { view = v; navOpen = false })
  //
  const CurrentView = $derived(views[view] || Overview)
  //
  onMount(() => {
    return initRouter()
  })
  //
  $effect(() => {
    if (!auth && view !== 'Login' && view !== 'Onboarding') navigate('#/login')
    if (auth && view === 'Login') navigate('#/overview')
  })
</script>

<div class="app-shell">
  {#if view === 'Onboarding'}
    <Onboarding />
  {:else if auth && view !== 'Login'}
    <Nav {view} open={navOpen} onclose={() => { navOpen = false }} />
    <div class="app-main">
      <header class="mobile-topbar">
        <button class="hamburger" onclick={() => { navOpen = !navOpen }} aria-label="Toggle navigation">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
        <span class="topbar-brand">🐝 <span class="topbar-name">xswarm</span></span>
        <span class="topbar-view">{view}</span>
      </header>
      <main class="app-content">
        <div class="content-inner">
          <CurrentView />
        </div>
        <Footer />
      </main>
    </div>
  {:else}
    <Login />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: var(--page-bg, #ede8df);
    color: var(--text, #2d2a26);
  }
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .mobile-topbar { display: none; }
  .app-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
  }
  .content-inner { flex: 1; }
  /* Mobile */
  @media (max-width: 768px) {
    .mobile-topbar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: #e6ddd0;
      border-bottom: 1px solid #d4cdc4;
      flex-shrink: 0;
    }
    .hamburger {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
    }
    .hamburger-line {
      display: block;
      width: 18px;
      height: 2px;
      background: #6b6560;
      border-radius: 1px;
    }
    .topbar-brand {
      font-size: 0.85rem;
    }
    .topbar-name {
      font-family: 'Permanent Marker', cursive;
      color: #27864a;
      font-size: 0.8rem;
    }
    .topbar-view {
      margin-left: auto;
      font-size: 0.75rem;
      color: #8b8579;
    }
    .app-content {
      padding: 1rem;
    }
  }
</style>
