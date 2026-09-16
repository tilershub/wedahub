import { useState, useEffect } from 'react'
import { supabase, signOut } from '../lib/supabase.js'
import { useT } from '../lib/i18n.js'
import { maskLkPhone } from '../lib/phone.js'

/**
 * The app bar's account control: sign in, or sign out.
 *
 * There is no modal any more. Sign-in is phone + OTP on /login (§1), and
 * putting a second auth surface in the header meant maintaining two of them —
 * the old one opened a Google popup, which is exactly the entry point that let
 * accounts arrive with no verified number.
 *
 * The avatar shows the person's own number rather than an email: with phone
 * auth the email is a synthetic 94...@phone.wedahub.lk that nobody recognises.
 */
export default function AuthButton({ initialUser, lang = 'si' }) {
  const t = useT(lang)
  const [user, setUser] = useState(initialUser ?? null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!user) {
    return (
      <a
        href="/login"
        className="signin-btn"
        aria-label={t('signIn')}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 10,
          background: 'transparent', color: 'var(--text-2)',
          border: '1.5px solid var(--border)', whiteSpace: 'nowrap',
          textDecoration: 'none', minHeight: 36,
        }}
      >
        {/* Narrow phones show the icon only — the label would push the menu
            button off screen, and the bottom nav already has Account. */}
        <span className="signin-label">{t('signIn')}</span>
        <span className="signin-icon" aria-hidden="true">👤</span>
      </a>
    )
  }

  // auth.users.phone is only set by Supabase's own phone provider; ours lives
  // in the synthetic email, so read it back from there.
  const number = user.phone || String(user.email || '').split('@')[0]
  const label = /^\d{11}$/.test(number) ? maskLkPhone(number) : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <a href="/account" title={label} aria-label={label || t('signIn')}
        style={{
          width: 32, height: 32, borderRadius: 8, background: 'var(--navy)',
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, flexShrink: 0,
          textDecoration: 'none',
        }}>👤</a>
      <button
        onClick={async () => { await signOut(); window.location.href = '/' }}
        title="ඉවත් වන්න"
        style={{
          width: 30, height: 30, borderRadius: 8, background: 'transparent',
          border: '1px solid var(--border)', color: 'var(--text-4)',
          fontSize: 14, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >↩</button>
    </div>
  )
}
