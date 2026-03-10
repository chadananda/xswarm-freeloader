const getToken = () => localStorage.getItem('jwt_token')

async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('jwt_token')
    window.location.hash = '#/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  login: (password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  overview: () => apiFetch('/overview'),
  providers: () => apiFetch('/providers'),
  apps: () => apiFetch('/apps'),
  createApp: (data) => apiFetch('/apps', { method: 'POST', body: JSON.stringify(data) }),
  deleteApp: (id) => apiFetch(`/apps/${id}`, { method: 'DELETE' }),
  usage: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/usage${qs ? '?' + qs : ''}`)
  },
  routing: () => apiFetch('/routing'),
  updateRouting: (data) => apiFetch('/routing', { method: 'PUT', body: JSON.stringify(data) }),
  settings: () => apiFetch('/settings'),
  updateSettings: (data) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  accounts: () => apiFetch('/accounts'),
  createAccount: (data) => apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccountKey: (id, api_key) => apiFetch(`/accounts/${id}/key`, { method: 'PUT', body: JSON.stringify({ api_key }) }),
  deleteAccount: (id) => apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
  testAccount: (id) => apiFetch(`/accounts/${id}/test`, { method: 'POST' }),
  rateLimits: () => apiFetch('/rate-limits'),
  usageTimeseries: (days) => apiFetch(`/usage/timeseries${days ? '?days=' + days : ''}`),
  usageByProvider: () => apiFetch('/usage/by-provider'),
  backupKeys: () => apiFetch('/accounts/backup', { method: 'POST' }),
  // Local reports — generated and stored on this machine, never sent externally
  reportsList: () => apiFetch('/reports'),
  generateReport: () => apiFetch('/reports/generate', { method: 'POST' }),
  downloadLatestReport: () => {
    const token = getToken()
    return fetch('/api/reports/latest', { headers: { Authorization: `Bearer ${token}` } })
  },
  // App keys
  appKeys: (id) => apiFetch(`/apps/${id}/keys`),
  createAppKey: (id, data) => apiFetch(`/apps/${id}/keys`, { method: 'POST', body: JSON.stringify(data) }),
  revokeAppKey: (id, keyId) => apiFetch(`/apps/${id}/keys/${keyId}`, { method: 'DELETE' }),
  rotateAppKey: (id, keyId) => apiFetch(`/apps/${id}/keys/${keyId}/rotate`, { method: 'POST' }),
  // Email reports
  sendTestReport: () => apiFetch('/reports/test', { method: 'POST' }),
  // App detail & usage
  getAppDetail: (id) => apiFetch(`/apps/${id}/stats`),
  getAppUsage: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/apps/${id}/usage${qs ? '?' + qs : ''}`)
  },
  // App policy
  getAppPolicy: (id) => apiFetch(`/apps/${id}/policy`),
  updateAppPolicy: (id, policy) => apiFetch(`/apps/${id}/policy`, { method: 'PUT', body: JSON.stringify(policy) }),
  updateApp: (id, data) => apiFetch(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  // Config management
  getConfig: () => apiFetch('/config'),
  updateConfig: (data) => apiFetch('/config', { method: 'PUT', body: JSON.stringify(data) }),
  getConfigVersions: (limit) => apiFetch(`/config/versions${limit ? '?limit=' + limit : ''}`),
  rollbackConfig: (id) => apiFetch(`/config/rollback/${id}`, { method: 'POST' }),
  // Top apps
  topApps: (days, limit) => apiFetch(`/usage/top-apps?days=${days || 30}&limit=${limit || 10}`)
}
