import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { C } from '../lib/theme'
import AdminLogin from '../components/AdminLogin'
import AdminRoster from '../components/AdminRoster'

export default function AdminPage() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: C.porcelain, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.mute }}>Loading…</p>
      </div>
    )
  }

  return session ? <AdminRoster /> : <AdminLogin />
}
