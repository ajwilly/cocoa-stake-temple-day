// Backend for Cocoa Stake Temple Day. One request handler, no framework.
// Storage is injected (Netlify Blobs in production, an in-memory fake in
// scripts/test-api.mjs) so the same code path is what gets tested.
//
// Routes (all under /api):
//   GET    /counts       public  per-ward totals only -- never names/phones
//   POST   /signup       public  create a sign-up
//   POST   /login        public  leader login -> HttpOnly session cookie
//   POST   /logout       any     clear the session cookie
//   GET    /session      leader  200 if signed in, 401 if not
//   GET    /roster       leader  full roster
//   DELETE /signup/:id   leader  remove one sign-up
import crypto from 'node:crypto'

export const UNITS = [
  'Titusville Ward',
  'Port Saint John Ward',
  'Merritt Island Ward',
  'Rockledge Ward',
  'Viera 1st Ward',
  'Viera 2nd Ward',
  'Viera 3rd Ward',
  'Spanish Branch',
  'YSA Branch',
]

const COOKIE = 'ctd_session'
const SESSION_MS = 12 * 60 * 60 * 1000
const LOGIN_MAX_FAILS = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const SIGNUP_MAX = 30
const SIGNUP_WINDOW_MS = 60 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function reply(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  })
}

const b64 = (buf) => Buffer.from(buf).toString('base64url')

function sign(payload, secret) {
  const body = b64(JSON.stringify(payload))
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${mac}`
}

function verify(token, secret, now) {
  if (!token || !secret) return false
  const [body, mac] = token.split('.')
  if (!body || !mac) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  try {
    const { exp } = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof exp === 'number' && exp > now
  } catch {
    return false
  }
}

function sameString(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

function readCookie(req, name) {
  const header = req.headers.get('cookie') || ''
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

function sessionCookie(value, maxAgeSeconds) {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
}

// Fixed-window counter kept in the "limits" store. Good enough to stop
// password guessing and form spam; not meant to be airtight.
async function bump(limits, key, windowMs, now) {
  const rec = (await limits.get(key, { type: 'json' })) || null
  const fresh = !rec || now - rec.start > windowMs
  const next = { start: fresh ? now : rec.start, count: (fresh ? 0 : rec.count) + 1 }
  await limits.setJSON(key, next)
  return next.count
}

async function overLimit(limits, key, max, windowMs, now) {
  const rec = await limits.get(key, { type: 'json' })
  return !!rec && now - rec.start <= windowMs && rec.count >= max
}

function clean(value, max) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s ? s.slice(0, max) : null
}

function intInRange(value, min, max) {
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

function validateSignup(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid sign-up.' }
  const role = input.role
  if (role !== 'driver' && role !== 'rider') return { error: 'Choose "I can drive" or "I need a ride".' }
  const name = clean(input.name, 100)
  if (!name) return { error: 'Please enter your name.' }
  const phone = clean(input.phone, 40)
  if (!phone) return { error: 'Please enter a phone number.' }
  if (!UNITS.includes(input.unit)) return { error: 'Please choose your ward or branch.' }

  let seats = 0
  let party = 1
  if (role === 'driver') {
    seats = intInRange(input.seats, 1, 20)
    if (seats === null) return { error: 'Open seats must be a number from 1 to 20.' }
  } else {
    party = intInRange(input.party, 1, 20)
    if (party === null) return { error: 'People needing a ride must be a number from 1 to 20.' }
  }

  return {
    row: {
      role,
      name,
      phone,
      unit: input.unit,
      seats,
      party,
      reservation_time: clean(input.reservation_time, 40),
      depart_time: role === 'driver' ? clean(input.depart_time, 40) : null,
      depart_place: role === 'driver' ? clean(input.depart_place, 200) : null,
      needs: clean(input.needs, 500),
    },
  }
}

async function allRows(store) {
  const { blobs } = await store.list()
  const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })))
  return rows.filter(Boolean)
}

export async function handle(req, { store, limits, env, now = Date.now() }) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/(\.netlify\/functions\/api|api)/, '') || '/'
  const method = req.method.toUpperCase()
  const ip = clientIp(req)

  const isLeader = () => verify(readCookie(req, COOKIE), env.SESSION_SECRET, now)

  async function readJson() {
    if (!(req.headers.get('content-type') || '').includes('application/json')) return null
    try {
      return await req.json()
    } catch {
      return null
    }
  }

  try {
    if (method === 'GET' && path === '/counts') {
      const counts = {}
      for (const row of await allRows(store)) {
        const c = (counts[row.unit] ||= { seatsOffered: 0, ridersNeedingSeats: 0 })
        if (row.role === 'driver') c.seatsOffered += row.seats || 0
        if (row.role === 'rider') c.ridersNeedingSeats += row.party || 0
      }
      return reply(200, { counts })
    }

    if (method === 'POST' && path === '/signup') {
      if (await overLimit(limits, `signup:${ip}`, SIGNUP_MAX, SIGNUP_WINDOW_MS, now)) {
        return reply(429, { error: 'Too many sign-ups from this connection. Please try again later.' })
      }
      const input = await readJson()
      const { row, error } = validateSignup(input)
      if (error) return reply(400, { error })
      const saved = { id: crypto.randomUUID(), created_at: new Date(now).toISOString(), ...row }
      await store.setJSON(saved.id, saved)
      await bump(limits, `signup:${ip}`, SIGNUP_WINDOW_MS, now)
      return reply(201, { ok: true })
    }

    if (method === 'POST' && path === '/login') {
      if (!env.LEADER_USERNAME || !env.LEADER_PASSWORD || !env.SESSION_SECRET) {
        return reply(503, { error: 'Leader login is not set up yet.' })
      }
      if (await overLimit(limits, `login:${ip}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, now)) {
        return reply(429, { error: 'Too many attempts. Please wait 15 minutes and try again.' })
      }
      const input = (await readJson()) || {}
      const userOk = sameString(String(input.username ?? '').trim().toLowerCase(), env.LEADER_USERNAME.trim().toLowerCase())
      const passOk = sameString(input.password ?? '', env.LEADER_PASSWORD)
      if (!(userOk && passOk)) {
        await bump(limits, `login:${ip}`, LOGIN_WINDOW_MS, now)
        return reply(401, { error: 'Incorrect username or password.' })
      }
      await limits.delete(`login:${ip}`)
      const token = sign({ exp: now + SESSION_MS }, env.SESSION_SECRET)
      return reply(200, { ok: true }, { 'Set-Cookie': sessionCookie(token, SESSION_MS / 1000) })
    }

    if (method === 'POST' && path === '/logout') {
      return reply(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) })
    }

    if (method === 'GET' && path === '/session') {
      return isLeader() ? reply(200, { ok: true }) : reply(401, { error: 'Not signed in.' })
    }

    if (method === 'GET' && path === '/roster') {
      if (!isLeader()) return reply(401, { error: 'Not signed in.' })
      const rows = await allRows(store)
      rows.sort((a, b) => a.unit.localeCompare(b.unit) || a.created_at.localeCompare(b.created_at))
      return reply(200, { rows })
    }

    const del = path.match(/^\/signup\/([^/]+)$/)
    if (method === 'DELETE' && del) {
      if (!isLeader()) return reply(401, { error: 'Not signed in.' })
      if (!UUID_RE.test(del[1])) return reply(400, { error: 'Invalid id.' })
      await store.delete(del[1])
      return reply(200, { ok: true })
    }

    return reply(404, { error: 'Not found.' })
  } catch (err) {
    console.error('API error:', err)
    return reply(500, { error: 'Something went wrong. Please try again.' })
  }
}
