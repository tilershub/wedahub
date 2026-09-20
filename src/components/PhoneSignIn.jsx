import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { requestPhoneCode, verifyPhoneCode } from '../lib/phone-auth.js'
import { useLang } from '../lib/useLang.js'

let turnstileLoader
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!turnstileLoader) turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve(window.turnstile)
    script.onerror = () => { turnstileLoader = null; reject(new Error('captcha')) }
    document.head.appendChild(script)
  })
  return turnstileLoader
}

export default function PhoneSignIn({ link = false, onSuccess }) {
  const si = useLang() === 'si'
  const say = (en, sinhala) => si ? sinhala : en
  const id = useId()
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaNode = useRef(null)
  const widget = useRef(null)
  const locked = useRef(false)
  const retryAt = useRef(0)
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, Math.ceil((retryAt.current - Date.now()) / 1000))), 500)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!siteKey || link) return
    let cancelled = false
    loadTurnstile().then(api => {
      if (cancelled) return
      widget.current = api.render(captchaNode.current, {
        sitekey: siteKey, callback: setCaptchaToken,
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken(''),
      })
    }).catch(() => setError('Please reload to complete the security check.'))
    return () => { cancelled = true; if (widget.current !== null) window.turnstile?.remove(widget.current); widget.current = null }
  }, [siteKey, link])

  function showError(err) {
    const key = err?.code || err?.message
    if (key === 'invalid_phone') return say('Enter a Sri Lankan mobile number, e.g. 077 123 4567.', 'වලංගු ජංගම දුරකථන අංකයක් ඇතුළු කරන්න. උදා: 077 123 4567')
    if (key === 'invalid_code' || key === 'otp_expired') return say('The code is invalid or expired. Check it or request another.', 'කේතය වැරදියි හෝ කල් ඉකුත් වී ඇත. නැවත පරීක්ෂා කරන්න.')
    if (err?.status === 429 || key === 'over_sms_send_rate_limit') return say('Please wait before trying again.', 'නැවත උත්සාහ කිරීමට මඳක් රැඳී සිටින්න.')
    return say('Unable to complete verification. Please try again.', 'තහවුරු කිරීම සම්පූර්ණ කළ නොහැක. නැවත උත්සාහ කරන්න.')
  }
  async function send(event) {
    event?.preventDefault()
    if (locked.current || Date.now() < retryAt.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      const normalized = await requestPhoneCode(supabase, sentTo || phone, { link, captchaToken })
      setSentTo(normalized); setCode('')
      retryAt.current = Date.now() + 60000; setRemaining(60)
    } catch (err) { setError(showError(err)) }
    finally {
      locked.current = false; setBusy(false); setCaptchaToken('')
      if (widget.current !== null) window.turnstile?.reset(widget.current)
    }
  }
  async function verify(event) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try {
      const result = await verifyPhoneCode(supabase, sentTo, code, { link })
      if (onSuccess) onSuccess(result.user)
      else if (window.location.pathname === '/login') window.location.assign('/auth/callback')
      else window.location.reload()
    } catch (err) { setError(showError(err)); locked.current = false; setBusy(false) }
  }
  const input = { width: '100%', boxSizing: 'border-box', padding: 13, border: '1px solid #ccc', borderRadius: 10, fontSize: 16, margin: '8px 0 12px' }
  const button = { width: '100%', minHeight: 46, padding: 12, border: 0, borderRadius: 10, background: 'var(--terra, #C2542B)', color: '#fff', fontSize: 14, cursor: 'pointer', opacity: busy ? 0.6 : 1 }
  const canSend = !busy && !remaining && (link || !siteKey || !!captchaToken)
  return <div style={{ textAlign: 'left', whiteSpace: 'normal' }}>
    <p style={{ fontSize: 13, lineHeight: 1.6 }}>{link
      ? say('Verify a phone number on your existing account to keep your profile and jobs.', 'ඔබේ පැතිකඩ සහ වැඩ රැක ගැනීමට මෙම ගිණුමට දුරකථන අංකය එක් කරන්න.')
      : say('Sign in or join with your mobile number. No password needed.', 'ඔබේ ජංගම දුරකථන අංකයෙන් පිවිසෙන්න. මුරපදයක් අවශ්‍ය නැත.')}</p>
    <form onSubmit={sentTo ? verify : send}>
      {!sentTo ? <>
        <label htmlFor={`${id}-phone`}>{say('Mobile number', 'ජංගම දුරකථන අංකය')}</label>
        <input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" value={phone} onChange={e => setPhone(e.target.value)} required disabled={busy} style={input} />
      </> : <>
        <p role="status">{say('Code sent to', 'කේතය යවන ලදී:')} {sentTo}</p>
        <label htmlFor={`${id}-code`}>{say('6-digit code', 'අංක 6ක කේතය')}</label>
        <input id={`${id}-code`} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus required disabled={busy} style={input} />
      </>}
      <button style={button} disabled={sentTo ? busy : !canSend}>{busy ? say('Please wait…', 'රැඳී සිටින්න…') : sentTo ? say('Verify & continue', 'තහවුරු කර ඉදිරියට යන්න') : say('Send SMS code', 'SMS කේතය යවන්න')}</button>
    </form>
    {siteKey && !link && <div ref={captchaNode} style={{ marginTop: 12 }} />}
    {sentTo && <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
      <button type="button" disabled={!canSend} onClick={send}>{remaining ? `${say('Resend in', 'නැවත යැවීම')} ${remaining}s` : say('Resend code', 'නැවත කේතය යවන්න')}</button>
      <button type="button" disabled={busy} onClick={() => { setSentTo(''); setCode(''); setError('') }}>{say('Change number', 'අංකය වෙනස් කරන්න')}</button>
    </div>}
    {error && <p role="alert" style={{ color: '#a52323', fontSize: 13 }}>{error}</p>}
    {!link && <p style={{ fontSize: 12, lineHeight: 1.7, marginTop: 20 }}>
      {say('Already have an account? Use your previous login first, then add your phone to keep your existing profile.', 'දැනටමත් ගිණුමක් තිබේද? පැරණි ගිණුමෙන් පිවිසී දුරකථන අංකය එක් කරන්න.')}<br />
      <a href="/login?existing=1">{say('Use existing account', 'පැරණි ගිණුමෙන් පිවිසෙන්න')}</a>
    </p>}
  </div>
}
