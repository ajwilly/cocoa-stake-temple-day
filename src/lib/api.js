async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    // non-JSON response (e.g. the function is not deployed yet)
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  counts: () => request('GET', '/counts'),
  signup: (row) => request('POST', '/signup', row),
  login: (username, password) => request('POST', '/login', { username, password }),
  logout: () => request('POST', '/logout'),
  session: () => request('GET', '/session'),
  roster: () => request('GET', '/roster'),
  remove: (id) => request('DELETE', `/signup/${id}`),
}
