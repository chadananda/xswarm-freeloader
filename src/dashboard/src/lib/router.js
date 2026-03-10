import { currentView } from './stores.js'

const routes = {
  '#/login': 'Login',
  '#/overview': 'Overview',
  '#/providers': 'Providers',
  '#/apps': 'Apps',
  '#/accounts': 'Accounts',
  '#/routing': 'Routing',
  '#/usage': 'Usage',
  '#/opportunities': 'Opportunities',
  '#/settings': 'Settings'
}

export let routeParams = {}

export function navigate(hash) {
  window.location.hash = hash
}

export function initRouter() {
  function handleHash() {
    const hash = window.location.hash || '#/overview'
    // Check parameterized routes
    const appDetailMatch = hash.match(/^#\/apps\/(.+)$/)
    if (appDetailMatch) {
      routeParams = { id: appDetailMatch[1] }
      currentView.set('AppDetail')
      return
    }
    routeParams = {}
    const view = routes[hash] || 'Overview'
    currentView.set(view)
  }
  window.addEventListener('hashchange', handleHash)
  handleHash()
  return () => window.removeEventListener('hashchange', handleHash)
}

export { routes }
