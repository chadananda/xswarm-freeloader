import { writable } from 'svelte/store'

// Default to true — localhost access is trusted, no login needed.
// If a remote 401 occurs, api.js flips this to false → shows login.
export const isAuthenticated = writable(true)
export const currentView = writable('Overview')
export const providers = writable([])
export const stats = writable({ costToday: 0, costMonth: 0, savedToday: 0, savedMonth: 0, requestsToday: 0 })
export const recentRequests = writable([])

export function setToken(token) {
  localStorage.setItem('jwt_token', token)
  isAuthenticated.set(true)
}

export function clearToken() {
  localStorage.removeItem('jwt_token')
  isAuthenticated.set(false)
}
