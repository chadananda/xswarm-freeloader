import { currentView } from './stores.js'

const routes = {
  '#/login': 'Login',
  '#/overview': 'Overview',
  '#/providers': 'Providers',
  '#/apps': 'Apps',
  '#/routing': 'Routing',
  '#/usage': 'Usage',
  '#/opportunities': 'Opportunities',
  '#/settings': 'Settings'
}

export function navigate(hash) {
  window.location.hash = hash
}

export function initRouter() {
  function handleHash() {
    const hash = window.location.hash || '#/overview'
    const view = routes[hash] || 'Overview'
    currentView.set(view)
  }
  window.addEventListener('hashchange', handleHash)
  handleHash()
  return () => window.removeEventListener('hashchange', handleHash)
}

export { routes }
