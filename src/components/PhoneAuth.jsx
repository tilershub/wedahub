import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useT } from '../lib/i18n.js'
import { normalizeLkPhone, isLkMobile, formatLkPhone } from '../lib/phone.js'

/**
 * Phone + OTP sign-in. The only way into the app — §1.
 *
 * One screen, no reloads: the number step becomes the code step in place, so
 * on a phone it reads as a sheet rather than a page flow. Everything that
 * makes the OS help is switched on — tel keypad, one-time-code autofill, the
 * WebOTP prompt on Chrome Android — because typing a six-digit code off a
 * notification is the single most annoying moment in any signup.
 *
 * The code is never in the response from /send. It arrives by SMS or not at
 * all, in every environment.
 */

const STEP = { PHONE: 'phone', CODE: 'code', CLAIM: 'claim' }

export default function PhoneAuth({ lang = 'si', redirectTo = '/account', purpose = 'sign_in' }) {
  const t = useT(lang)
  const [step, setStep] = useState(STEP.PHONE)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [listing, setListing] = useState(null)
  const [tokenHash, setTokenHash] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef(null)

  // Count the resend cooldown down rather than leaving a dead button that
  // silently 429s.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (step !== STEP.CODE) return
    codeRef.current?.focus()

    // Chrome on Android can read the code straight out of the notification.
    // Unsupported everywhere else, so it is strictly a bonus on top of the
    // autocomplete="one-time-code" hint below.
    if (!('OTPCredential' in window)) return
    const abort = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: abort.signal })
      .then((cred) => { if (cred?.code) { setCode(cred.code); submitCode(cred.code) } })
      .catch(() => {})
    return () => abort.abort()
  }, [step])

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
  }

  async function sendCode(e) {
    e?.preventDefault()
    setError('')
    const e164 = normalizeLkPhone(phone)
    if (!e164) return setError(t('invalidNumber'))
    if (!isLkMobile(e164)) return setError(t('notAMobile'))

    setBusy(true)
    const { ok, data } = await post('/api/auth/otp/send', { phone: e164, purpose })
    setBusy(false)

    if (!ok) {
      setError(t(data.error || 'somethingWrong'))
      if (data.retryAfter) setCooldown(Math.min(data.retryAfter, 600))
      return
    }
    setCooldown(30)
    setStep(STEP.CODE)
  }

  async function submitCode(value) {
    const attempt = String(value ?? code).replace(/\D/g, '')
    if (attempt.length < 4) return
    setError('')
    setBusy(true)

    const e164 = normalizeLkPhone(phone)
    const { ok, data } = await post('/api/auth/otp/verify', { phone: e164, code: attempt, purpose })
    if (!ok) {
      setBusy(false)
      setCode('')
      setError(t(data.error || 'codeWrong'))
      codeRef.current?.focus()
      return
    }

    // The token is what actually establishes the session cookie; until this
    // resolves the person is verified but not signed in.
    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash, type: 'magiclink',
    })
    if (sessionError) {
      setBusy(false)
      setError(t('somethingWrong'))
      return
    }

    if (data.outcome === 'claim_offer' && data.listing) {
      setBusy(false)
      setTokenHash(data.tokenHash)
      setListing(data.listing)
      setStep(STEP.CLAIM)
      return
    }
    window.location.href = redirectTo
  }

  async function answerClaim(mine) {
    setBusy(true)
    const { ok, data } = await post('/api/auth/claim', { providerId: listing.id, mine })
    setBusy(false)
    if (!ok) return setError(t(data.error || 'somethingWrong'))
    window.location.href = mine ? `${redirectTo}?claimed=1` : redirectTo
  }

  // ── presentation ───────────────────────────────────────────────────────────

  const card = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: 24, width: '100%', maxWidth: 380,
    boxShadow: 'var(--shadow)',
  }
  const field = {
    width: '100%', padding: '14px 16px', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)', fontSize: 16, fontFamily: 'inherit',
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
    boxSizing: 'border-box', minHeight: 52,
  }
  const primary = {
    width: '100%', minHeight: 52, border: 'none', borderRadius: 'var(--radius)',
    background: busy ? 'var(--text-4)' : 'var(--terra)', color: '#fff',
    fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
    cursor: busy ? 'not-allowed' : 'pointer',
  }
  const quiet = {
    background: 'none', border: 'none', color: 'var(--terra)',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
    padding: '10px 4px', minHeight: 44,
  }

  return (
    <div style={card}>
      {step === STEP.PHONE && (
        <form onSubmit={sendCode}>
          <h1 style={{ font: '700 20px var(--th-display)', color: 'var(--text)', margin: '0 0 6px' }}>
            {t('signIn')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px', lineHeight: 1.6 }}>
            {t('phoneHint')}
          </p>

          <label htmlFor="phone" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
            {t('phoneNumber')}
          </label>
          <input
            id="phone" name="phone" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="077 123 4567"
            /* type=tel gives the phone keypad; autoComplete lets the OS offer
               the SIM's own number, which removes the typing entirely. */
            type="tel" inputMode="tel" autoComplete="tel" autoFocus
            style={field}
          />

          {error && <Problem>{error}</Problem>}

          <button type="submit" disabled={busy} style={{ ...primary, marginTop: 16 }}>
            {busy ? t('sending') : t('sendCode')}
          </button>
        </form>
      )}

      {step === STEP.CODE && (
        <form onSubmit={(e) => { e.preventDefault(); submitCode() }}>
          <h1 style={{ font: '700 20px var(--th-display)', color: 'var(--text)', margin: '0 0 6px' }}>
            {t('enterCode')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px', lineHeight: 1.6 }}>
            {t('codeSentTo', { phone: formatLkPhone(phone) })}
          </p>

          <input
            ref={codeRef} value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(next)
              // Submit itself once the last digit lands — nobody should have to
              // find a button after autofill has already typed the code.
              if (next.length === 6) submitCode(next)
            }}
            placeholder="••••••"
            type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6}
            style={{ ...field, textAlign: 'center', letterSpacing: '0.5em', fontWeight: 700, fontSize: 22 }}
          />

          {error && <Problem>{error}</Problem>}

          <button type="submit" disabled={busy || code.length < 4} style={{ ...primary, marginTop: 16 }}>
            {busy ? t('verifying') : t('signIn')}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <button type="button" style={quiet} onClick={() => { setStep(STEP.PHONE); setCode(''); setError('') }}>
              {t('changeNumber')}
            </button>
            <button type="button" style={{ ...quiet, opacity: cooldown > 0 ? 0.45 : 1 }}
                    disabled={cooldown > 0 || busy} onClick={() => sendCode()}>
              {cooldown > 0 ? `${t('resendCode')} (${cooldown})` : t('resendCode')}
            </button>
          </div>
        </form>
      )}

      {step === STEP.CLAIM && listing && (
        <div>
          <h1 style={{ font: '700 20px var(--th-display)', color: 'var(--text)', margin: '0 0 12px' }}>
            {t('isThisYou')}
          </h1>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 16, marginBottom: 18,
          }}>
            <div style={{ font: '700 16px var(--th-display)', color: 'var(--text)' }}>{listing.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              {listing.trade}{listing.city ? ` · ${listing.city}` : ''}
            </div>
          </div>

          {error && <Problem>{error}</Problem>}

          <button type="button" disabled={busy} style={primary} onClick={() => answerClaim(true)}>
            {t('yes')}
          </button>
          <button type="button" disabled={busy}
                  style={{ ...primary, background: 'transparent', color: 'var(--text-2)', border: '1.5px solid var(--border)', marginTop: 10 }}
                  onClick={() => answerClaim(false)}>
            {t('notMe')}
          </button>
        </div>
      )}
    </div>
  )
}

function Problem({ children }) {
  return (
    <p role="alert" style={{
      fontSize: 13, color: 'var(--error)', background: 'var(--error-bg)',
      border: '1px solid #F2C9C3', borderRadius: 10, padding: '10px 12px',
      margin: '14px 0 0', lineHeight: 1.5,
    }}>{children}</p>
  )
}
