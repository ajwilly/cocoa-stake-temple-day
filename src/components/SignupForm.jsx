import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UNITS, C, serif } from '../lib/theme'
import { label, input, field } from '../lib/formStyles'

const emptyForm = {
  role: 'driver',
  name: '',
  phone: '',
  unit: UNITS[0],
  seats: '',
  reservationTime: '',
  departTime: '',
  departPlace: '',
  party: 1,
  needs: '',
}

export default function SignupForm({ onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function insertOnce(row) {
    try {
      const { error: insertError } = await supabase.from('signups').insert(row)
      return insertError ?? null
    } catch (thrown) {
      return thrown
    }
  }

  async function submit() {
    setError('')
    if (!form.name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!form.phone.trim()) {
      setError("Please enter a phone number so your ward can coordinate.")
      return
    }
    if (form.role === 'driver' && (!form.seats || Number(form.seats) < 1)) {
      setError('Please enter how many open seats you have.')
      return
    }

    setSaving(true)
    const row = {
      role: form.role,
      name: form.name.trim(),
      phone: form.phone.trim(),
      unit: form.unit,
      seats: form.role === 'driver' ? Number(form.seats) || 0 : 0,
      reservation_time: form.reservationTime || null,
      depart_time: form.role === 'driver' ? form.departTime || null : null,
      depart_place: form.role === 'driver' ? form.departPlace || null : null,
      party: form.role === 'rider' ? Number(form.party) || 1 : 1,
      needs: form.needs.trim() || null,
    }

    // Mobile data connections drop more often than wifi -- retry once
    // before giving up, so a one-second blip doesn't cost someone their
    // sign-up.
    let failure = await insertOnce(row)
    if (failure) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      failure = await insertOnce(row)
    }

    setSaving(false)

    if (failure) {
      console.error('Sign-up failed after retry:', failure)
      const detail = failure?.message || failure?.error_description || String(failure)
      setError(`Couldn't save your sign-up. Please try again. (${detail})`)
      return
    }

    setForm(emptyForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
    onSaved?.(row.unit)
  }

  return (
    <section
      style={{
        background: '#fff',
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 2px 10px rgba(22,50,74,0.05)',
      }}
    >
      <h2 style={{ margin: '0 0 14px', fontFamily: serif, fontWeight: 500, fontSize: 24, color: C.navy }}>
        Sign up
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          ['driver', 'I can drive'],
          ['rider', 'I need a ride'],
        ].map(([val, txt]) => (
          <button
            key={val}
            type="button"
            onClick={() => set('role', val)}
            style={{
              flex: 1,
              padding: '12px 8px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              border: form.role === val ? `2px solid ${C.navy}` : `1.5px solid ${C.line}`,
              background: form.role === val ? C.navy : '#fff',
              color: form.role === val ? '#fff' : C.ink,
            }}
          >
            {txt}
          </button>
        ))}
      </div>

      <div style={field}>
        <label style={label}>Your name</label>
        <input style={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="First and last name" />
      </div>

      <div className="form-grid-2">
        <div style={field}>
          <label style={label}>Phone</label>
          <input style={input} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(321) 555-0100" />
        </div>
        <div style={field}>
          <label style={label}>Ward / branch</label>
          <select style={{ ...input, appearance: 'auto' }} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Temple reservation time</label>
        <input
          style={input}
          type="time"
          value={form.reservationTime}
          onChange={(e) => set('reservationTime', e.target.value)}
        />
      </div>

      {form.role === 'driver' ? (
        <>
          <div className="form-grid-2">
            <div style={field}>
              <label style={label}>Open seats</label>
              <input
                style={input}
                type="number"
                min="1"
                max="14"
                value={form.seats}
                onChange={(e) => set('seats', e.target.value)}
                placeholder="#"
              />
            </div>
            <div style={field}>
              <label style={label}>Leaving at</label>
              <input style={input} type="time" value={form.departTime} onChange={(e) => set('departTime', e.target.value)} />
            </div>
          </div>
          <div style={field}>
            <label style={label}>Leaving from</label>
            <input
              style={input}
              value={form.departPlace}
              onChange={(e) => set('departPlace', e.target.value)}
              placeholder="e.g. stake center parking lot"
            />
          </div>
        </>
      ) : (
        <div style={field}>
          <label style={label}>People in your group (including you)</label>
          <input style={input} type="number" min="1" max="12" value={form.party} onChange={(e) => set('party', e.target.value)} />
        </div>
      )}

      <div style={field}>
        <label style={label}>Special needs or notes</label>
        <textarea
          style={{ ...input, minHeight: 70, resize: 'vertical' }}
          value={form.needs}
          onChange={(e) => set('needs', e.target.value)}
          placeholder="Wheelchair space, car seat needed, dietary needs…"
        />
      </div>

      {error && <p style={{ color: '#A33B2E', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}
      {saved && (
        <p style={{ color: C.green, fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
          You're signed up! Your ward's counts are reflected below.
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          cursor: saving ? 'default' : 'pointer',
          background: C.gold,
          color: C.navyDeep,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.02em',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : form.role === 'driver' ? 'Offer my seats' : 'Request a ride'}
      </button>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: C.mute, textAlign: 'center' }}>
        Only aggregate counts are shown publicly. Your name, phone, and notes are visible to stake leaders only.
      </p>
    </section>
  )
}
