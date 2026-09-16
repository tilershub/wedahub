import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, PROFESSIONS } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'

const T = {
  si: {
    required: 'අවශ්‍යයි',
    phoneInvalid: 'වලංගු දුරකථන අංකයක් ඇතුළු කරන්න',
    submitError: 'දෝෂයක් ඇති විය. නැවත උත්සාහ කරන්න.',
    // Google sign-in screen
    gateTitle: 'සේවා සපයන්නෙකු ලෙස එකතු වන්න',
    gateSub: 'ආරම්භ කිරීමට Google ගිණුමෙන් පිවිසෙන්න — ආරක්ෂිතයි, නොමිලේ, මුරපද අවශ්‍ය නැත.',
    googleBtn: 'Google සමඟ ඉදිරියට →',
    gateSteps: ['1️⃣ Google වලින් පිවිසෙන්න', '2️⃣ ඔබේ විස්තර පුරවන්න', '3️⃣ admin අනුමැතියෙන් ලැයිස්තුගත වන්න'],
    // Registration form
    pickTitle: 'ඔබේ වෘත්තිය / සේවාව තෝරන්න',
    pickSub: 'ඔබව හොඳින්ම විස්තර කරන්නේ කුමක්ද?',
    change: '· වෙනස් කරන්න',
    name: 'නම / සමාගම',
    namePh: 'ඔබේ නම හෝ සමාගමේ නම',
    city: 'නගරය / ගම',
    cityPh: 'උදා: නුගේගොඩ',
    whatsapp: 'WhatsApp අංකය',
    whatsappHint: 'ගනුදෙනුකරුවන් ඔබව මෙතැනින් සම්බන්ධ කරගනී.',
    freeNote: '✓ නොමිලේ ලැයිස්තුගත වීම · WhatsApp හරහා leads · කොමිස් නැත · ඡායාරූප පසුව එක් කළ හැක.',
    submit: '✅ ලියාපදිංචිය ඉදිරිපත් කරන්න →',
    submitting: '⏳ ඉදිරිපත් කරමින්...',
    // Pending screen
    pendingTitle: 'අයදුම්පත ලැබුණි! 🎉',
    pendingBody: 'ඔබේ ලියාපදිංචිය admin විසින් සමාලෝචනය කරයි. අනුමත වූ පසු ඔබ වැඩHUB හි ලැයිස්තුගත වේ — WhatsApp හරහා දැනුම් දෙන්නෙමු.',
    goDashboard: 'මගේ Dashboard →',
    signedInAs: 'පිවිසී ඇත:',
  },
  en: {
    required: 'Required',
    phoneInvalid: 'Enter a valid phone number',
    submitError: 'Something went wrong. Please try again.',
    // Google sign-in screen
    gateTitle: 'Join as a Provider',
    gateSub: 'Sign in with your Google account to get started — safe, free, no passwords needed.',
    googleBtn: 'Continue with Google →',
    gateSteps: ['1️⃣ Sign in with Google', '2️⃣ Fill in your details', '3️⃣ Get listed once admin approves'],
    // Registration form
    pickTitle: 'Select your profession / service',
    pickSub: 'What best describes you?',
    change: '· Change',
    name: 'Name / Company',
    namePh: 'Your name or company name',
    city: 'City / Town',
    cityPh: 'e.g. Nugegoda',
    whatsapp: 'WhatsApp Number',
    whatsappHint: 'Customers will contact you here.',
    freeNote: '✓ Free listing · Direct WhatsApp leads · No commission · Add photos & details after joining.',
    submit: '✅ Submit Registration →',
    submitting: '⏳ Submitting...',
    // Pending screen
    pendingTitle: 'Application Received! 🎉',
    pendingBody: "Your registration is being reviewed by our admin. Once approved you'll be listed on වැඩHUB — we'll notify you on WhatsApp.",
    goDashboard: 'Go to my Dashboard →',
    signedInAs: 'Signed in as:',
  },
}

function Field({ label, id, req, error, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
        {sinhalaText(label)}{sinhalaText(req && <span style={{ color: '#8A6224', marginLeft: 3 }}>*</span>)}
      </label>
      {sinhalaText(children)}
      {sinhalaText(hint && !error && <p style={{ fontSize: 11, color: '#8C8C8C', marginTop: 5, lineHeight: 1.5 }}>{sinhalaText(hint)}</p>)}
      {sinhalaText(error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 5 }}>⚠ {sinhalaText(error)}</p>)}
    </div>
  )
}

function inputStyle(hasError) {
  return {
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${hasError ? '#DCC9A4' : '#E2E2E2'}`,
    borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    background: hasError ? '#FBEDEB' : '#fff', transition: 'border-color 0.2s', boxSizing: 'border-box',
  }
}

export default function JoinForm({ initialUser = null }) {
  const lang = useLang()
  const t = T[lang] || T.en
  const [user, setUser] = useState(initialUser)
  const [authReady, setAuthReady] = useState(!!initialUser)
  const [category, setCategory] = useState(null)
  const [form, setForm] = useState({ name: '', city: '', whatsapp: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      setAuthReady(true)
      if (u && !form.name) {
        const n = u.user_metadata?.full_name || u.user_metadata?.name || ''
        if (n) setForm(f => ({ ...f, name: n }))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) { setUser(session.user); setAuthReady(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/join-wedahub` },
    })
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t.required
    if (!form.city.trim()) e.city = t.required
    if (!form.whatsapp.trim()) e.whatsapp = t.required
    else if (!/^\+?[0-9]{9,15}$/.test(form.whatsapp.replace(/\s/g, ''))) e.whatsapp = t.phoneInvalid
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setErrors({})
    try {
      const { error } = await supabase.from('provider_submissions').insert({
        name: form.name.trim(),
        provider_type: category?.value || 'tiler',
        city: form.city.trim(),
        district: null,
        whatsapp: form.whatsapp.replace(/\s/g, ''),
        services: [category?.label || 'General Services'],
        status: 'pending_review',
        user_id: user.id,
      })
      if (error) throw error
      setSuccess(true)
    } catch {
      setErrors({ submit: t.submitError })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success / pending-approval screen ──────────────────────────────────────
  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 20, border: '1px solid #E2E2E2', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: "var(--th-display)", fontSize: 24, fontWeight: 700, color: '#0B0B0B', marginBottom: 12 }}>{sinhalaText(t.pendingTitle)}</h2>
        <p style={{ fontSize: 14, color: '#6E6E6E', lineHeight: 1.8, maxWidth: 400, margin: '0 auto 24px' }}>{sinhalaText(t.pendingBody)}</p>
        <a href="/provider" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#8A6224', color: '#fff', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          {sinhalaText(t.goDashboard)}
        </a>
      </div>
    )
  }

  // ── Step 1: Google sign-in gate (shown until authenticated) ────────────────
  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', border: '1px solid #E2E2E2', borderRadius: 20, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>👷</div>
        <h2 style={{ fontFamily: "var(--th-display)", fontSize: 22, fontWeight: 700, color: '#0B0B0B', marginBottom: 8 }}>{sinhalaText(t.gateTitle)}</h2>
        <p style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.7, marginBottom: 22 }}>{sinhalaText(t.gateSub)}</p>

        <button onClick={signInGoogle} disabled={!authReady}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px', background: '#fff', color: '#0B0B0B', border: '1.5px solid #E2E2E2', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: authReady ? 'pointer' : 'wait', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          {sinhalaText(t.googleBtn)}
        </button>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {sinhalaText(t.gateSteps.map(s => (
            <div key={s} style={{ fontSize: 12, color: '#4A4A4A', fontWeight: 600 }}>{sinhalaText(s)}</div>
          )))}
        </div>
      </div>
    )
  }

  // ── Step 2a: Profession picker ─────────────────────────────────────────────
  if (!category) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#8C8C8C' }}>
          {sinhalaText(t.signedInAs)} <strong style={{ color: '#4A4A4A' }}>{sinhalaText(user.email)}</strong>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4A4A4A', marginBottom: 4 }}>{sinhalaText(t.pickTitle)}</div>
          <div style={{ fontSize: 12, color: '#8C8C8C' }}>{sinhalaText(t.pickSub)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {sinhalaText(PROFESSIONS.map(prof => (
            <button
              key={prof.value}
              type="button"
              onClick={() => setCategory(prof)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px', borderRadius: 14, border: '2px solid #E2E2E2', background: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#8A6224'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(212,161,94,0.12)'; e.currentTarget.style.background = '#F5EEE2' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E2E2'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.background = '#fff' }}
            >
              <span style={{ fontSize: 30 }}>{sinhalaText(prof.icon)}</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0B', lineHeight: 1.3 }}>{sinhalaText(prof.label)}</div>
            </button>
          )))}
        </div>
      </div>
    )
  }

  // ── Step 2b: Minimal registration form ─────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 520, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <button
          type="button"
          onClick={() => setCategory(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F5EEE2', border: '1.5px solid #E8DCC6', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#8A6224' }}
        >
          {sinhalaText(category.icon)} {sinhalaText(category.label)} <span style={{ fontSize: 10, color: '#8C8C8C', fontWeight: 400 }}>{sinhalaText(t.change)}</span>
        </button>
      </div>

      <Field label={t.name} id="name" req error={errors.name}>
        <input id="name" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder={sinhalaText(t.namePh)} style={inputStyle(!!errors.name)} />
      </Field>

      <Field label={t.city} id="city" req error={errors.city}>
        <input id="city" value={form.city} onChange={e => set('city', e.target.value)}
          placeholder={sinhalaText(t.cityPh)} style={inputStyle(!!errors.city)} />
      </Field>

      <Field label={t.whatsapp} id="whatsapp" req error={errors.whatsapp} hint={t.whatsappHint}>
        <input id="whatsapp" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
          placeholder="+94771234567" type="tel" style={inputStyle(!!errors.whatsapp)} />
      </Field>

      <div style={{ padding: '13px 16px', background: '#E9F1EC', borderRadius: 12, border: '1px solid #C6DDCF', marginBottom: 22 }}>
        <p style={{ fontSize: 12, color: '#285C43', margin: 0, lineHeight: 1.6 }}>{sinhalaText(t.freeNote)}</p>
      </div>

      {sinhalaText(errors.submit && (
        <div style={{ padding: '12px 16px', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, fontSize: 13, color: '#C0392B', marginBottom: 18 }}>
          ⚠ {sinhalaText(errors.submit)}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        style={{ width: '100%', padding: 14, background: submitting ? '#8C8C8C' : '#8A6224', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
      >
        {sinhalaText(submitting ? t.submitting : t.submit)}
      </button>
    </form>
  )
}
