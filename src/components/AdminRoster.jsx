import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UNITS, C, serif } from '../lib/theme'
import { label } from '../lib/formStyles'
import { downloadCsv, todayEasternDateStamp } from '../lib/csv'

export default function AdminRoster() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openUnit, setOpenUnit] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('signups')
      .select('*')
      .order('unit', { ascending: true })
      .order('created_at', { ascending: true })
    if (fetchError) setError('Could not load the roster.')
    else setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id) {
    const { error: deleteError } = await supabase.from('signups').delete().eq('id', id)
    if (deleteError) {
      setError('Could not remove that entry.')
      return
    }
    setConfirmId(null)
    setRows((r) => r.filter((row) => row.id !== id))
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const drivers = rows.filter((r) => r.role === 'driver')
  const riders = rows.filter((r) => r.role === 'rider')
  const totals = {
    seats: drivers.reduce((n, d) => n + (d.seats || 0), 0),
    riders: riders.reduce((n, r) => n + (r.party || 0), 0),
    signups: rows.length,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.porcelain }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontFamily: serif, fontWeight: 500, fontSize: 30, color: C.navy }}>
              Cocoa Stake Temple Day roster
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: C.mute }}>
              <span className="nowrap">Fort Lauderdale Florida Temple</span>{' · '}
              <span className="nowrap">Saturday, November 14, 2026</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => downloadCsv(`cocoa-stake-temple-day-roster-${todayEasternDateStamp()}.csv`, rows)}
              disabled={rows.length === 0}
              style={btnStyle(C.gold, C.navyDeep)}
            >
              Export CSV
            </button>
            <button type="button" onClick={logout} style={btnStyle('#fff', C.ink, C.line)}>
              Log out
            </button>
          </div>
        </div>

        {error && <p style={{ color: '#A33B2E', fontSize: 14, margin: '16px 0 0' }}>{error}</p>}

        <div className="admin-stat-grid" style={{ margin: '22px 0' }}>
          {[
            [totals.seats, 'seats offered'],
            [totals.riders, 'riders needing seats'],
            [totals.signups, 'total sign-ups'],
          ].map(([n, t]) => (
            <div key={t} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: serif, fontSize: 24, color: C.navy }}>{loading ? '–' : n}</div>
              <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.3 }}>{t}</div>
            </div>
          ))}
        </div>

        {loading && <p style={{ color: C.mute }}>Loading roster…</p>}

        {!loading &&
          UNITS.map((unit) => {
            const unitRows = rows.filter((r) => r.unit === unit)
            const unitDrivers = unitRows.filter((r) => r.role === 'driver')
            const unitRiders = unitRows.filter((r) => r.role === 'rider')
            const offered = unitDrivers.reduce((n, d) => n + (d.seats || 0), 0)
            const needed = unitRiders.reduce((n, r) => n + (r.party || 0), 0)
            const open = openUnit === unit

            return (
              <div key={unit} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenUnit(open ? null : unit)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: C.navy }}>{unit}</span>
                  <span style={{ fontSize: 13, color: C.mute, fontWeight: 600 }}>
                    {unitRows.length} sign-up{unitRows.length === 1 ? '' : 's'} · {offered} seats · {needed} riders {open ? '▴' : '▾'}
                  </span>
                </button>
                {open && (
                  <div style={{ borderTop: `1px solid ${C.line}`, padding: '12px 16px 16px' }}>
                    {unitRows.length === 0 && <p style={{ margin: 0, fontSize: 14, color: C.mute }}>No sign-ups yet from {unit}.</p>}
                    {unitDrivers.length > 0 && <p style={{ ...label, margin: '6px 0' }}>Drivers</p>}
                    {unitDrivers.map((row) => (
                      <Entry key={row.id} row={row} confirming={confirmId === row.id} onDelete={() => setConfirmId(row.id)} onConfirm={() => remove(row.id)} onCancel={() => setConfirmId(null)} />
                    ))}
                    {unitRiders.length > 0 && <p style={{ ...label, margin: '14px 0 6px' }}>Riders</p>}
                    {unitRiders.map((row) => (
                      <Entry key={row.id} row={row} confirming={confirmId === row.id} onDelete={() => setConfirmId(row.id)} onConfirm={() => remove(row.id)} onCancel={() => setConfirmId(null)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

function btnStyle(bg, color, border) {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: border ? `1.5px solid ${border}` : 'none',
    cursor: 'pointer',
    background: bg,
    color,
    fontSize: 14,
    fontWeight: 700,
  }
}

function Entry({ row, onDelete, confirming, onConfirm, onCancel }) {
  return (
    <div style={{ padding: '10px 12px', background: '#F6F9FB', borderRadius: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{row.name}</span>
        <span style={{ fontSize: 13, color: C.mute }}>{row.phone}</span>
      </div>
      <div style={{ fontSize: 13, color: C.mute, marginTop: 3, lineHeight: 1.5 }}>
        {row.role === 'driver' ? (
          <>
            {row.seats} open seat{row.seats === 1 ? '' : 's'}
            {row.depart_time ? ` · leaving ${row.depart_time}` : ''}
            {row.depart_place ? ` from ${row.depart_place}` : ''}
          </>
        ) : (
          <>
            {row.party} rider{row.party === 1 ? '' : 's'}
          </>
        )}
        {row.reservation_time && <> · reservation at {row.reservation_time}</>}
      </div>
      {row.needs && <div style={{ fontSize: 13, color: C.ink, marginTop: 4, fontStyle: 'italic' }}>&ldquo;{row.needs}&rdquo;</div>}
      <div style={{ marginTop: 6 }}>
        {confirming ? (
          <span style={{ fontSize: 12 }}>
            Remove this sign-up?{' '}
            <button type="button" onClick={onConfirm} style={{ border: 'none', background: 'none', color: '#A33B2E', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
              Yes, remove
            </button>{' '}
            ·{' '}
            <button type="button" onClick={onCancel} style={{ border: 'none', background: 'none', color: C.mute, cursor: 'pointer', fontSize: 12 }}>
              Keep it
            </button>
          </span>
        ) : (
          <button type="button" onClick={onDelete} style={{ border: 'none', background: 'none', color: '#8A9AA6', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
