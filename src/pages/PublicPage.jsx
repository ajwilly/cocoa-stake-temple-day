import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { TEMPLE_PHOTO, C, serif, sans } from '../lib/theme'
import SignupForm from '../components/SignupForm'
import WardCountsBoard from '../components/WardCountsBoard'

export default function PublicPage() {
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openUnit, setOpenUnit] = useState(null)
  const [imgOk, setImgOk] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_ward_counts')
    if (!error && data) {
      const byUnit = Object.fromEntries(
        data.map((row) => [
          row.unit,
          {
            seatsOffered: Number(row.seats_offered) || 0,
            ridersNeedingSeats: Number(row.riders_needing_seats) || 0,
            childrenComing: Number(row.children_coming) || 0,
            childcareHelpers: Number(row.childcare_helpers) || 0,
          },
        ])
      )
      setCounts(byUnit)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = Object.values(counts ?? {}).reduce(
    (acc, c) => ({
      seatsOffered: acc.seatsOffered + c.seatsOffered,
      ridersNeedingSeats: acc.ridersNeedingSeats + c.ridersNeedingSeats,
      childrenComing: acc.childrenComing + c.childrenComing,
      childcareHelpers: acc.childcareHelpers + c.childcareHelpers,
    }),
    { seatsOffered: 0, ridersNeedingSeats: 0, childrenComing: 0, childcareHelpers: 0 }
  )

  function handleSaved(unit) {
    setOpenUnit(unit)
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: C.porcelain, fontFamily: sans, color: C.ink }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 80px' }}>
        <header style={{ paddingTop: 28, textAlign: 'center' }}>
          {imgOk ? (
            <img
              src={TEMPLE_PHOTO}
              alt="Fort Lauderdale Florida Temple"
              onError={() => setImgOk(false)}
              style={{
                width: '100%',
                maxWidth: 640,
                borderRadius: 16,
                display: 'block',
                margin: '0 auto',
                boxShadow: '0 4px 18px rgba(22,50,74,0.18)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 640,
                height: 220,
                borderRadius: 16,
                margin: '0 auto',
                background: `linear-gradient(180deg, ${C.navy}, ${C.sky})`,
              }}
            />
          )}
          <p
            style={{
              margin: '18px 0 4px',
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: C.gold,
            }}
          >
            Cocoa Stake Temple Day
          </p>
          <h1 style={{ margin: '0 0 6px', fontFamily: serif, fontWeight: 500, fontSize: 40, lineHeight: 1.1, color: C.navy }}>
            No One Rides Alone
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: C.mute }}>
            <span className="nowrap">Fort Lauderdale Florida Temple</span>{' · '}
            <span className="nowrap">Saturday, November 14, 2026</span>
          </p>
          <p style={{ margin: '14px auto 0', maxWidth: 480, fontSize: 15, lineHeight: 1.55, color: C.ink }}>
            Offer a seat or find a ride with members of your ward. Bringing children? Sign up to trade off --
            someone watches the little ones while you're inside, and you return the favor.
          </p>
        </header>

        <div className="stat-grid" style={{ margin: '26px 0' }}>
          {[
            [totals.seatsOffered, 'seats offered'],
            [totals.ridersNeedingSeats, 'riders needing seats'],
            [totals.childrenComing, 'children coming'],
            [totals.childcareHelpers, 'childcare helpers'],
          ].map(([n, t]) => (
            <div key={t} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 6px', textAlign: 'center' }}>
              <div style={{ fontFamily: serif, fontSize: 26, color: C.navy }}>{loading ? '–' : n}</div>
              <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.3 }}>{t}</div>
            </div>
          ))}
        </div>

        <SignupForm onSaved={handleSaved} />

        <WardCountsBoard counts={counts} loading={loading} openUnit={openUnit} setOpenUnit={setOpenUnit} />

        <footer style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: serif, fontSize: 18, color: C.navy, margin: 0 }}>&ldquo;No one rides alone.&rdquo;</p>
          <p style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>Questions? Contact your ward temple &amp; family history leader.</p>
          <p style={{ fontSize: 11, color: C.mute, marginTop: 14 }}>
            <Link to="/admin" style={{ color: C.mute }}>
              Stake leader login
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
