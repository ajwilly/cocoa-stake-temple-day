import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { C } from '../lib/theme'
import AdminLogin from '../components/AdminLogin'
import AdminRoster from '../components/AdminRoster'

export default function AdminPage() {
  // undefined = checking, true = signed in, false = signed out
  const [signedIn, setSignedIn] = useState(undefined)

  useEffect(() => {
    api.session().then(() => setSignedIn(true), () => setSignedIn(false))
  }, [])

  if (signedIn === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: C.porcelain, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.mute }}>Loading…</p>
      </div>
    )
  }

  return signedIn ? (
    <AdminRoster onLoggedOut={() => setSignedIn(false)} />
  ) : (
    <AdminLogin onLoggedIn={() => setSignedIn(true)} />
  )
}
