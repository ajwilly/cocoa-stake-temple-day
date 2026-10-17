// Run with: npm test
// Exercises the real request handler against an in-memory store.
import assert from 'node:assert/strict'
import { handle } from '../netlify/lib/api.mjs'

function memoryStore() {
  const m = new Map()
  return {
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null },
    async setJSON(k, v) { m.set(k, JSON.stringify(v)) },
    async delete(k) { m.delete(k) },
    async list() { return { blobs: [...m.keys()].map((key) => ({ key })) } },
  }
}

// Throwaway values that exist only inside this test run.
const env = { LEADER_USERNAME: 'TestLeader', LEADER_PASSWORD: 'test-pass-123', SESSION_SECRET: 'x'.repeat(40) }
const store = memoryStore()
const limits = memoryStore()
let clock = Date.UTC(2026, 10, 1)

const call = (method, path, { body, cookie, ip = '1.1.1.1' } = {}) =>
  handle(
    new Request(`https://site.test${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        'x-nf-client-connection-ip': ip,
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
    { store, limits, env, now: clock }
  )
const json = async (res) => res.json()
const cookieOf = (res) => (res.headers.get('set-cookie') || '').split(';')[0]

const driver = { role: 'driver', name: 'Dana Driver', phone: '555-0101', unit: 'Viera 1st Ward', seats: 3, depart_time: '7:00 AM', depart_place: 'Church lot', reservation_time: '9:00 AM', needs: 'Quiet ride' }
const rider = { role: 'rider', name: 'Riley Rider', phone: '555-0102', unit: 'Viera 1st Ward', party: 2 }

let passed = 0
const test = async (name, fn) => { await fn(); passed++; console.log('ok -', name) }

await test('rewrite path and old function path both route', async () => {
  assert.equal((await call('GET', '/api/counts')).status, 200)
  assert.equal((await call('GET', '/.netlify/functions/api/counts')).status, 200)
})

await test('public sign-ups are accepted and validated', async () => {
  assert.equal((await call('POST', '/api/signup', { body: driver })).status, 201)
  assert.equal((await call('POST', '/api/signup', { body: rider })).status, 201)
  assert.equal((await call('POST', '/api/signup', { body: { ...driver, unit: 'Nowhere Ward' } })).status, 400)
  assert.equal((await call('POST', '/api/signup', { body: { ...driver, seats: 0 } })).status, 400)
  assert.equal((await call('POST', '/api/signup', { body: { ...rider, name: '  ' } })).status, 400)
  assert.equal((await call('POST', '/api/signup', { body: { ...driver, role: 'admin' } })).status, 400)
})

await test('public counts never expose names, phones or notes', async () => {
  const res = await call('GET', '/api/counts')
  const text = await res.clone().text()
  assert.deepEqual((await json(res)).counts['Viera 1st Ward'], { seatsOffered: 3, ridersNeedingSeats: 2 })
  for (const secret of ['Dana', 'Riley', '555-0101', 'Quiet ride']) assert.ok(!text.includes(secret), `leaked ${secret}`)
})

await test('roster and delete require a leader session', async () => {
  assert.equal((await call('GET', '/api/roster')).status, 401)
  assert.equal((await call('GET', '/api/session')).status, 401)
  assert.equal((await call('DELETE', '/api/signup/00000000-0000-4000-8000-000000000000')).status, 401)
  assert.equal((await call('GET', '/api/roster', { cookie: 'ctd_session=garbage.value' })).status, 401)
})

await test('wrong credentials are rejected, right ones (any username case) get a cookie', async () => {
  assert.equal((await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'nope' } })).status, 401)
  assert.equal((await call('POST', '/api/login', { body: { username: 'someone', password: 'test-pass-123' } })).status, 401)
  const ok = await call('POST', '/api/login', { body: { username: 'testleader', password: 'test-pass-123' } })
  assert.equal(ok.status, 200)
  const header = ok.headers.get('set-cookie')
  assert.match(header, /HttpOnly/)
  assert.match(header, /Secure/)
  assert.match(header, /SameSite=Strict/)
})

await test('leader sees the full roster and can delete an entry', async () => {
  const login = await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'test-pass-123' } })
  const cookie = cookieOf(login)
  assert.equal((await call('GET', '/api/session', { cookie })).status, 200)
  const { rows } = await json(await call('GET', '/api/roster', { cookie }))
  assert.equal(rows.length, 2)
  assert.ok(rows.some((r) => r.name === 'Dana Driver' && r.phone === '555-0101'))
  assert.equal((await call('DELETE', `/api/signup/${rows[0].id}`, { cookie })).status, 200)
  assert.equal((await json(await call('GET', '/api/roster', { cookie }))).rows.length, 1)
  assert.equal((await call('DELETE', '/api/signup/not-a-uuid', { cookie })).status, 400)
})

await test('session expires after 12 hours', async () => {
  const login = await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'test-pass-123' } })
  const cookie = cookieOf(login)
  clock += 11 * 3600 * 1000
  assert.equal((await call('GET', '/api/session', { cookie })).status, 200)
  clock += 2 * 3600 * 1000
  assert.equal((await call('GET', '/api/session', { cookie })).status, 401)
})

await test('login locks out after repeated failures, only for that connection', async () => {
  for (let i = 0; i < 8; i++) await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'bad' }, ip: '9.9.9.9' })
  const locked = await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'test-pass-123' }, ip: '9.9.9.9' })
  assert.equal(locked.status, 429)
  const other = await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'test-pass-123' }, ip: '8.8.4.4' })
  assert.equal(other.status, 200)
  clock += 16 * 60 * 1000
  const later = await call('POST', '/api/login', { body: { username: 'TestLeader', password: 'test-pass-123' }, ip: '9.9.9.9' })
  assert.equal(later.status, 200)
})

await test('login reports "not set up" when env vars are missing', async () => {
  const res = await handle(
    new Request('https://site.test/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'a', password: 'b' }) }),
    { store, limits, env: {}, now: clock }
  )
  assert.equal(res.status, 503)
})

await test('sign-up spam from one connection is throttled', async () => {
  let last
  for (let i = 0; i < 32; i++) last = await call('POST', '/api/signup', { body: rider, ip: '7.7.7.7' })
  assert.equal(last.status, 429)
})

await test('logout clears the cookie; unknown routes 404', async () => {
  assert.match((await call('POST', '/api/logout')).headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await call('GET', '/api/nothing')).status, 404)
})

console.log(`\n${passed} tests passed`)
