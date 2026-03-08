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
  changePassword: (data) => apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify(data) })
}
