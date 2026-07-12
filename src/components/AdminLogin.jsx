import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { C, serif } from '../lib/theme'
import { label, input, field } from '../lib/formStyles'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (signInError) setError('Incorrect email or password.')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.porcelain, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form
        onSubmit={submit}
        style={{ width: '100%', maxWidth: 380, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, padding: 24 }}
      >
        <h1 style={{ margin: '0 0 4px', fontFamily: serif, fontWeight: 500, fontSize: 26, color: C.navy }}>Stake leader login</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: C.mute }}>Cocoa Stake Temple Day roster</p>

        <div style={field}>
          <label style={label}>Email</label>
          <input style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div style={field}>
          <label style={label}>Password</label>
          <input
            style={input}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p style={{ color: '#A33B2E', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 12,
            border: 'none',
            cursor: busy ? 'default' : 'pointer',
            background: C.navy,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
