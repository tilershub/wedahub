import PhoneSignIn from './PhoneSignIn.jsx'
import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, PROFESSIONS, DISTRICTS_EN } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'

const T = {
  si: {
    required: 'අවශ්‍යයි',
    phoneInvalid: 'වලංගු දුරකථන අංකයක් ඇතුළු කරන්න',
    submitError: 'දෝෂයක් ඇති විය. නැවත උත්සාහ කරන්න.',
    // Phone sign-in screen
    gateTitle: 'සේවා සපයන්නෙකු ලෙස එකතු වන්න',
    gateSub: 'ආරම්භ කිරීමට දුරකථන අංකයෙන් පිවිසෙන්න — ආරක්ෂිතයි, නොමිලේ, මුරපද අවශ්‍ය නැත.',
    gateSteps: ['1️⃣ දුරකථනයෙන් පිවිසෙන්න', '2️⃣ ඔබේ විස්තර පුරවන්න', '3️⃣ පරීක්ෂාවෙන් පසු ලැයිස්තුගත වන්න'],
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
    pendingBody: 'ඔබේ ලියාපදිංචිය අපගේ කණ්ඩායම පරීක්ෂා කරයි. අනුමත වූ පසු ඔබ වැඩHUB හි ලැයිස්තුගත වේ — ඔබේ ගිණුමෙන් තත්ත්වය බලන්න.',
    goDashboard: 'මගේ ගිණුම →',
    signedInAs: 'පිවිසී ඇත:',
  },
  en: {
    required: 'Required',
    phoneInvalid: 'Enter a valid phone number',
    submitError: 'Something went wrong. Please try again.',
    // Phone sign-in screen
    gateTitle: 'Join as a Provider',
    gateSub: 'Sign in with your mobile number to get started — safe, free, no passwords needed.',
    gateSteps: ['1️⃣ Verify your mobile number', '2️⃣ Fill in your details', '3️⃣ Get listed once admin approves'],
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
    pendingBody: "Your registration is being reviewed by our admin. Once approved you'll be listed on වැඩHUB — check your account for updates.",
    goDashboard: 'Go to my Dashboard →',
    signedInAs: 'Signed in as:',
  },
}

function Field({ label, id, req, error, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3A4046', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
        {sinhalaText(label)}{sinhalaText(req && <span style={{ color: '#0B2A4A', marginLeft: 3 }}>*</span>)}
      </label>
      {sinhalaText(children)}
      {sinhalaText(hint && !error && <p style={{ fontSize: 11, color: '#8A8F95', marginTop: 5, lineHeight: 1.5 }}>{sinhalaText(hint)}</p>)}
      {sinhalaText(error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 5 }}>⚠ {sinhalaText(error)}</p>)}
    </div>
  )
}

function inputStyle(hasError) {
  return {
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${hasError ? '#E3A199' : '#EAE4D7'}`,
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
  const [form, setForm] = useState({ name: '', city: '', whatsapp: '', district: '', service: '' })
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


  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t.required
    if (!form.service.trim()) e.service = t.required
    if (!form.district) e.district = t.required
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
        provider_type: category?.value || 'other_service',
        city: form.city.trim(),
        district: form.district,
        whatsapp: form.whatsapp.replace(/\s/g, ''),
        services: [category?.label || 'Other Service', form.service.trim()],
        description: form.service.trim(),
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
      <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 20, border: '1px solid #EAE4D7', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: "var(--th-display)", fontSize: 24, fontWeight: 700, color: '#071827', marginBottom: 12 }}>{sinhalaText(t.pendingTitle)}</h2>
        <p style={{ fontSize: 14, color: '#6B7076', lineHeight: 1.8, maxWidth: 400, margin: '0 auto 24px' }}>{sinhalaText(t.pendingBody)}</p>
        <a href="/account" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0B2A4A', color: '#fff', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          {sinhalaText(t.goDashboard)}
        </a>
      </div>
    )
  }

  // ── Step 1: Phone sign-in gate (shown until authenticated) ────────────────
  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', border: '1px solid #EAE4D7', borderRadius: 20, padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>👷</div>
        <h2 style={{ fontFamily: "var(--th-display)", fontSize: 22, fontWeight: 700, color: '#071827', marginBottom: 8 }}>{sinhalaText(t.gateTitle)}</h2>
        <p style={{ fontSize: 13, color: '#6B7076', lineHeight: 1.7, marginBottom: 22 }}>{sinhalaText(t.gateSub)}</p>

        {authReady && <PhoneSignIn />}

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
          {sinhalaText(t.gateSteps.map(s => (
            <div key={s} style={{ fontSize: 12, color: '#3A4046', fontWeight: 600 }}>{sinhalaText(s)}</div>
          )))}
        </div>
      </div>
    )
  }

  // ── Step 2a: Profession picker ─────────────────────────────────────────────
  if (!category) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 11, color: '#8A8F95' }}>
          {sinhalaText(t.signedInAs)} <strong style={{ color: '#3A4046' }}>{sinhalaText(user.email || user.phone || '')}</strong>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3A4046', marginBottom: 4 }}>{sinhalaText(t.pickTitle)}</div>
          <div style={{ fontSize: 12, color: '#8A8F95' }}>{sinhalaText(t.pickSub)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {sinhalaText(PROFESSIONS.map(prof => (
            <button
              key={prof.value}
              type="button"
              onClick={() => setCategory(prof)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px', borderRadius: 14, border: '2px solid #EAE4D7', background: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#0B2A4A'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(11,42,74,0.12)'; e.currentTarget.style.background = '#F7F3E8' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#EAE4D7'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.background = '#fff' }}
            >
              <span style={{ fontSize: 30 }}>{sinhalaText(prof.icon)}</span>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#071827', lineHeight: 1.3 }}>{prof.si || prof.label}</div>
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F7F3E8', border: '1.5px solid #EAE4D7', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0B2A4A' }}
        >
          {sinhalaText(category.icon)} {sinhalaText(category.label)} <span style={{ fontSize: 10, color: '#8A8F95', fontWeight: 400 }}>{sinhalaText(t.change)}</span>
        </button>
      </div>

      <Field label={t.name} id="name" req error={errors.name}>
        <input id="name" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder={sinhalaText(t.namePh)} style={inputStyle(!!errors.name)} />
      </Field>

      <Field label="ඔබ සපයන සේවාව" id="service" req error={errors.service}>
        <input id="service" value={form.service} maxLength={160} onChange={e => set('service', e.target.value)} placeholder="උදා: ගණිත පන්ති, නිවාස පිරිසිදු කිරීම…" style={inputStyle(!!errors.service)} />
      </Field>
      <Field label="දිස්ත්‍රික්කය" id="district" req error={errors.district}>
        <select id="district" value={form.district} onChange={e => set('district', e.target.value)} style={inputStyle(!!errors.district)}><option value="">තෝරන්න…</option>{DISTRICTS_EN.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>)}</select>
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
        style={{ width: '100%', padding: 14, background: submitting ? '#8A8F95' : '#0B2A4A', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
      >
        {sinhalaText(submitting ? t.submitting : t.submit)}
      </button>
    </form>
  )
}
