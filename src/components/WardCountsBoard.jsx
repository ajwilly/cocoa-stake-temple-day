import { UNITS, C, serif } from '../lib/theme'
import { label } from '../lib/formStyles'

export default function WardCountsBoard({ counts, loading, openUnit, setOpenUnit }) {
  const byUnit = Object.fromEntries(UNITS.map((u) => [u, counts?.[u] ?? emptyCounts()]))

  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ margin: '0 0 4px', fontFamily: serif, fontWeight: 500, fontSize: 24, color: C.navy }}>
        By ward
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: C.mute }}>
        Counts only -- tap a ward to see its totals. Names and phone numbers are visible to stake leaders only.
      </p>

      {UNITS.map((u) => {
        const counts = byUnit[u]
        const open = openUnit === u
        const covered = counts.seatsOffered >= counts.ridersNeedingSeats && counts.ridersNeedingSeats > 0
        const hasAny = counts.seatsOffered > 0 || counts.ridersNeedingSeats > 0

        return (
          <div key={u} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenUnit(open ? null : u)}
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
              <span style={{ fontSize: 16, fontWeight: 600, color: C.navy }}>{u}</span>
              <span
                style={{
                  fontSize: 13,
                  color: !hasAny ? C.mute : covered ? C.green : C.gold,
                  fontWeight: 600,
                }}
              >
                {loading ? '–' : `${counts.seatsOffered} seats · ${counts.ridersNeedingSeats} riders`} {open ? '▴' : '▾'}
              </span>
            </button>
            {open && (
              <div style={{ borderTop: `1px solid ${C.line}`, padding: '12px 16px 16px' }}>
                {!hasAny ? (
                  <p style={{ margin: 0, fontSize: 14, color: C.mute }}>No sign-ups yet -- be the first from {u}.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    <Stat label="seats offered" value={counts.seatsOffered} />
                    <Stat label="riders needing seats" value={counts.ridersNeedingSeats} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}

function Stat({ label: text, value }) {
  return (
    <div style={{ background: '#F6F9FB', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontFamily: serif, fontSize: 20, color: C.navy }}>{value}</div>
      <div style={{ ...label, marginBottom: 0, fontSize: 11 }}>{text}</div>
    </div>
  )
}

function emptyCounts() {
  return { seatsOffered: 0, ridersNeedingSeats: 0 }
}
