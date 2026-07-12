import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UNITS, C, serif } from '../lib/theme'
import { label, input, field } from '../lib/formStyles'

const emptyForm = {
  role: 'driver',
  name: '',
  phone: '',
  unit: UNITS[0],
  seats: 3,
  departTime: '',
  departPlace: '',
  party: 1,
  kids: 0,
  canWatchKids: false,
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

    setSaving(true)
    const row = {
      role: form.role,
      name: form.name.trim(),
      phone: form.phone.trim(),
      unit: form.unit,
      seats: form.role === 'driver' ? Number(form.seats) || 0 : 0,
      depart_time: form.role === 'driver' ? form.departTime || null : null,
      depart_place: form.role === 'driver' ? form.departPlace || null : null,
      party: form.role === 'rider' ? Number(form.party) || 1 : 1,
      kids: Number(form.kids) || 0,
      can_watch_kids: form.canWatchKids,
      needs: form.needs.trim() || null,
    }

    const { error: insertError } = await supabase.from('signups').insert(row)
    setSaving(false)

    if (insertError) {
      setError("Couldn't save your sign-up. Please check your connection and try again.")
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

      {form.role === 'driver' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={field}>
              <label style={label}>Open seats</label>
              <input style={input} type="number" min="1" max="14" value={form.seats} onChange={(e) => set('seats', e.target.value)} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
        <div style={field}>
          <label style={label}>Children coming with you</label>
          <input style={input} type="number" min="0" max="12" value={form.kids} onChange={(e) => set('kids', e.target.value)} />
        </div>
        <div style={{ ...field, paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.ink, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.canWatchKids}
              onChange={(e) => set('canWatchKids', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.navy }}
            />
            I can watch children during a session
          </label>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Special needs or notes</label>
        <textarea
          style={{ ...input, minHeight: 70, resize: 'vertical' }}
          value={form.needs}
          onChange={(e) => set('needs', e.target.value)}
          placeholder="Wheelchair space, car seat needed, dietary needs, preferred session time…"
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
