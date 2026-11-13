const TOKEN_KEY = 'orra.pos.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function api() {
  // Live API is paused. The counter runs on mock menu, orders, and staff.
  // const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  // const token = getToken()
  // if (token) headers.Authorization = `Bearer ${token}`
  // const response = await fetch(`/api${path}`, { ...options, headers })
  // const data = await response.json().catch(() => ({}))
  // if (!response.ok) throw new Error(data.error || 'The counter could not reach Orra')
  // return data
  throw new Error('API is off')
}
