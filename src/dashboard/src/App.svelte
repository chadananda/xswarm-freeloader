<script>
  import { onMount } from 'svelte'
  import { isAuthenticated, currentView } from './lib/stores.js'
  import { initRouter, navigate } from './lib/router.js'
  import Nav from './components/Nav.svelte'
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

  const views = { Login, Overview, Providers, Apps, AppDetail, Accounts, Routing, Usage, Opportunities, Settings }

  let auth = $state(false)
  let view = $state('Overview')

  isAuthenticated.subscribe(v => { auth = v })
  currentView.subscribe(v => { view = v })

  const CurrentView = $derived(views[view] || Overview)

  onMount(() => {
    const cleanup = initRouter()
    if (!auth) navigate('#/login')
    return cleanup
  })

  $effect(() => {
    if (!auth && view !== 'Login') navigate('#/login')
    if (auth && view === 'Login') navigate('#/overview')
  })
</script>

<div class="flex h-screen overflow-hidden" style="background:#1a1816; color:#c8bdb6;">
  {#if auth && view !== 'Login'}
    <Nav {view} />
    <main class="flex-1 overflow-y-auto p-6">
      <CurrentView />
    </main>
  {:else}
    <Login />
  {/if}
</div>
