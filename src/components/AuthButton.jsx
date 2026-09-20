import { si as sinhalaText } from '../lib/sinhala.js'
import PhoneSignIn from './PhoneSignIn.jsx'
import { useState, useEffect } from 'react'
import { supabase, signOut } from '../lib/supabase.js'

export default function AuthButton({ initialUser, autoOpen = false }) {
  const [user, setUser] = useState(initialUser ?? null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (autoOpen) setShowModal(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (user) {
    const initials = (user.email ? user.email.slice(0, 2) : (user.phone || '?').slice(-2)).toUpperCase()
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--navy)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>{sinhalaText(initials)}</div>
        {autoOpen && !user.phone_confirmed_at && <button onClick={() => setShowModal(true)}>දුරකථන අංකය එක් කරන්න</button>}
        {showModal && !user.phone_confirmed_at && <AuthModal link onClose={() => setShowModal(false)} />}
        <button
          onClick={async () => { await signOut(); window.location.href = '/' }}
          title="ඉවත් වන්න"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-4)', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↩</button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="signin-btn"
        aria-label="ලොගිනය"
        style={{
          fontSize: 13, fontWeight: 600,
          padding: '7px 14px',
          borderRadius: 10,
          background: 'transparent',
          color: 'var(--text-2)',
          border: '1.5px solid var(--border)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Narrow phones show the icon only — the label would push the menu
            button off screen, and the bottom nav already has Account. */}
        <span className="signin-label">පිවිසෙන්න</span>
        <span className="signin-icon" aria-hidden="true">👤</span>
      </button>
      {sinhalaText(showModal && <AuthModal onClose={() => setShowModal(false)} />)}
    </>
  )
}

function AuthModal({ onClose, link = false }) {
  const [existing, setExisting] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setExisting(new URLSearchParams(window.location.search).get('existing') === '1')
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  async function oldLogin(provider) {
    setBusy(true); setMessage('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?link_phone=1`
      const result = provider === 'google'
        ? await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
        : await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })
      if (result.error) throw result.error
      if (provider !== 'google') setMessage('Check your email / ඊමේල් පරීක්ෂා කරන්න')
    } catch { setMessage('Unable to sign in. Please try again. / නැවත උත්සාහ කරන්න.') }
    finally { setBusy(false) }
  }
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-label="වැඩHUB login" style={{ background: '#fff', color: '#071827', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90dvh', overflowY: 'auto', whiteSpace: 'normal' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ float: 'right' }}>✕</button>
      <h2 style={{ fontSize: 20 }}>වැඩHUB වෙත පිවිසෙන්න</h2>
      {existing && !link ? <>
        <p>Use your previous login, then verify your phone on the same account.</p>
        <button disabled={busy} onClick={() => oldLogin('google')}>Continue with Google</button>
        <form onSubmit={e => { e.preventDefault(); oldLogin('email') }}>
          <label>Existing email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <button disabled={busy}>Send email sign-in link</button>
        </form>
        <p role="status">{message}</p>
        <button onClick={() => setExisting(false)}>Phone login / දුරකථනයෙන් පිවිසෙන්න</button>
      </> : <PhoneSignIn link={link} />}
    </div>
  </div>
}
