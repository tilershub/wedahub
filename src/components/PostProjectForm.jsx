import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, signInWithOtp, DISTRICTS_EN } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'

const DRAFT_KEY = 'tilershub_draft_token'

const T = {
  si: {
    required: 'අවශ්‍යයි',
    descMin: 'ව්‍යාපෘතිය අවම අකුරු 10කින් විස්තර කරන්න',
    phoneInvalid: 'වලංගු දුරකථන අංකයක් ඇතුළු කරන්න (උදා: +94771234567)',
    submitError: 'දෝෂයක් ඇති විය. නැවත උත්සාහ කරන්න.',
    emailInvalid: 'වලංගු ඊමේල් ලිපිනයක් ඇතුළු කරන්න',
    checkEmail: 'ඔබේ ඊමේල් බලන්න',
    sentBody: 'ට sign-in link එකක් යැවූවෙමු. ඔබේ dashboard බැලීමට සහ ව්‍යාපෘතිය කළමනාකරණයට ඒ link click කරන්න.',
    sendLink: 'Link යවන්න →',
    noPassword: 'මුරපදයක් නොමැත — ආරක්ෂිත magic link භාවිතා කරමු.',
    successTitle: 'ව්‍යාපෘතිය පල කෙරිණි!',
    successBody: 'ඔබේ ව්‍යාපෘතිය live වී ඇත. ලියාපදිංචි සේවා සපයන්නන්ට දැන් එය දැකිය හැකිය.',
    whatsappNote: 'WhatsApp හරහා ඔබව දැනුවත් කරන්නෙමු —',
    nextTitle: 'ඊළඟට සිදුවන්නේ:',
    nextSteps: ['1️⃣ සත්‍යාපිත ශිල්පීන් ඔබේ ව්‍යාපෘතිය දකිති', '2️⃣ ඔවුන් WhatsApp හරහා ලංසු එවති', '3️⃣ සසඳා හොඳම තැනැත්තා තෝරන්න'],
    shareWhatsApp: '💬 WhatsApp හි බෙදාගන්න',
    shareText: 'මම වැඩHUB හි ටයිලිං ව්‍යාපෘතියක් පලකළා — නොමිලේ ලංසු ලබාගන්න: https://wedahub.lk',
    viewDashboard: 'Dashboard බලන්න →',
    postAnother: 'තවත් ව්‍යාපෘතියක් පලකරන්න',
    oneMoreStep: 'තවත් පියවරක්',
    createAccount: 'ව්‍යාපෘතිය කළමනාකරණයට නොමිලේ ගිණුමක් සාදන්න',
    benefits: ['📊 Dashboard හිදී ලංසු නිරීක්ෂණය කරන්න', '💬 සේවා සපයන්නන් ප්‍රතිචාර දැක්වූ විට දැනුවත් වන්න', '✏️ ව්‍යාපෘතිය ඕනෑ වෙලාවක සංස්කරණය හෝ වසා දමන්න'],
    emailLabel: 'නොමිලේ ගිණුමක් සාදීමට ඊමේල් ඇතුළු කරන්න',
    viewProviders: 'සේවා සපයන්නන් බලන්න →',
    projectName: 'ව්‍යාපෘති නාමය',
    projectHint: 'උදා: නාන කාමර ටයිලිං, බිම ටයිලිං, නාන කාමර ප්‍රතිසංස්කරණය, ජල නිරෝධ…',
    projectPh: 'උදා: නාන කාමර ටයිලිං සහ ප්‍රතිසංස්කරණය',
    city: 'නගරය / ගම',
    cityPh: 'උදා: කොළඹ 03',
    district: 'දිස්ත්‍රික්කය',
    districtPh: 'දිස්ත්‍රික්කය තෝරන්න...',
    description: 'ව්‍යාපෘති විස්තරය',
    descHint: 'ව්‍යාපෘතිය විස්තර කරන්න: ප්‍රදේශ ප්‍රමාණය, ටයිල් වර්ගය, කාලය, විශේෂ ඉල්ලීම්.',
    descPh: 'උදා: නාන කාමර ප්‍රතිසංස්කරණය — sq.ft 80 ක් පමණ බිම සහ බිත්ති ටයිලිං. anti-slip ටයිල් සහ සුදු wall ටයිල් අවශ්‍ය. සති 2ක් ඇතුළත ආරම්භ කළ යුතුය...',
    budget: 'අයවැය පරාසය',
    budgetHint: 'අත්‍යවශ්‍ය නොවේ — උදා: රු. 50,000, රු. 150,000–250,000, සාකච්ඡා කළ හැකි',
    budgetPh: 'උදා: රු. 150,000 හෝ සාකච්ඡා කළ හැකි',
    privacy: '🔒 ඔබේ සම්බන්ධතා විස්තර රහසිගතව තබා ගන්නෙමු, ගැළපෙන සේවා සපයන්නන්ට පමණක් ලබා දෙන්නෙමු.',
    yourName: 'ඔබේ නම',
    namePh: 'උදා: නුවන් පෙරේරා',
    whatsapp: 'WhatsApp අංකය',
    whatsappHint: 'උදා: +94771234567',
    submit: '📋 මගේ ව්‍යාපෘතිය පලකරන්න',
    submitting: '⏳ ඉදිරිපත් කරමින්...',
    footer: 'නොමිලේ සේවාව · ලොගිනයක් අවශ්‍ය නැත · සේවා සපයන්නන් ලංසු ඉදිරිපත් කරති',
  },
  en: {
    required: 'Required',
    descMin: 'Please describe your project in at least 10 characters',
    phoneInvalid: 'Enter a valid phone number (e.g. +94771234567)',
    submitError: 'Something went wrong. Please try again.',
    emailInvalid: 'Enter a valid email address',
    checkEmail: 'Check your email',
    sentBody: '— we sent a sign-in link. Click it to view your dashboard and manage your project.',
    sendLink: 'Send link →',
    noPassword: 'No password needed — we use a secure magic link.',
    successTitle: 'Project posted!',
    successBody: 'Your project is live. Registered providers can see it now.',
    whatsappNote: "We'll notify you on WhatsApp —",
    nextTitle: 'What happens next:',
    nextSteps: ['1️⃣ Verified professionals see your project', '2️⃣ They send quotes via WhatsApp', '3️⃣ Compare and pick the best one'],
    shareWhatsApp: '💬 Share on WhatsApp',
    shareText: 'I just posted a tiling project on වැඩHUB — get free quotes: https://wedahub.lk',
    viewDashboard: 'View Dashboard →',
    postAnother: 'Post another project',
    oneMoreStep: 'One more step',
    createAccount: 'Create a free account to manage your project',
    benefits: ['📊 Track bids from your dashboard', '💬 Get notified when providers respond', '✏️ Edit or close your project anytime'],
    emailLabel: 'Enter your email to create a free account',
    viewProviders: 'Browse providers →',
    projectName: 'Project title',
    projectHint: 'E.g. bathroom tiling, floor tiling, bathroom renovation, waterproofing…',
    projectPh: 'E.g. Bathroom tiling and renovation',
    city: 'City / Town',
    cityPh: 'E.g. Colombo 03',
    district: 'District',
    districtPh: 'Select district...',
    description: 'Project description',
    descHint: 'Describe the project: area size, tile type, timeline, special requests.',
    descPh: 'E.g. Bathroom renovation — around 80 sq.ft of floor and wall tiling. Need anti-slip floor tiles and white wall tiles. Must start within 2 weeks...',
    budget: 'Budget range',
    budgetHint: 'Optional — e.g. Rs. 50,000, Rs. 150,000–250,000, negotiable',
    budgetPh: 'E.g. Rs. 150,000 or negotiable',
    privacy: '🔒 Your contact details are kept private and shared only with matching providers.',
    yourName: 'Your name',
    namePh: 'E.g. Nuwan Perera',
    whatsapp: 'WhatsApp number',
    whatsappHint: 'E.g. +94771234567',
    submit: '📋 Post my project',
    submitting: '⏳ Submitting...',
    footer: 'Free service · No login required · Providers send you quotes',
  },
}

function genToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function Field({ label, id, req, error, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {sinhalaText(label)} {sinhalaText(req && <span style={{ color: '#8A6224' }}>*</span>)}
      </label>
      {sinhalaText(children)}
      {sinhalaText(hint && !error && <p style={{ fontSize: 11, color: '#8C8C8C', marginTop: 4 }}>{sinhalaText(hint)}</p>)}
      {sinhalaText(error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 4 }}>⚠ {sinhalaText(error)}</p>)}
    </div>
  )
}

function inp(hasError) {
  return {
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${hasError ? '#DCC9A4' : '#E2E2E2'}`,
    borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    background: hasError ? '#FBEDEB' : '#fff', transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }
}

function MagicLinkForm({ label, hint, t }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function send(e) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { setErr(t.emailInvalid); return }
    setLoading(true); setErr('')
    const { error } = await signInWithOtp(email.trim())
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0B', marginBottom: 6 }}>{sinhalaText(t.checkEmail)}</div>
        <p style={{ fontSize: 12, color: '#6E6E6E', lineHeight: 1.7 }}>
          <strong>{sinhalaText(email)}</strong> {sinhalaText(t.sentBody)}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={send} style={{ marginTop: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A', marginBottom: 10 }}>{sinhalaText(label)}</div>
      {sinhalaText(hint && <p style={{ fontSize: 12, color: '#6E6E6E', marginBottom: 12, lineHeight: 1.6 }}>{sinhalaText(hint)}</p>)}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoFocus
          style={{ flex: 1, padding: '10px 14px', border: `1.5px solid ${err ? '#DCC9A4' : '#E2E2E2'}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: err ? '#FBEDEB' : '#fff', boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: loading ? '#8C8C8C' : '#8A6224', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {sinhalaText(loading ? '⏳' : t.sendLink)}
        </button>
      </div>
      {sinhalaText(err && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 4 }}>⚠ {sinhalaText(err)}</p>)}
      <p style={{ fontSize: 11, color: '#8C8C8C', marginTop: 8 }}>{sinhalaText(t.noPassword)}</p>
    </form>
  )
}

export default function PostProjectForm() {
  const lang = useLang()
  const t = T[lang] || T.en
  const [form, setForm] = useState({
    project_type: '', city: '', district: '', description: '',
    budget_range: '', customer_name: '', whatsapp: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState(null)
  const [draftToken, setDraftToken] = useState('')

  useEffect(() => {
    let token = localStorage.getItem(DRAFT_KEY)
    if (!token) { token = genToken(); localStorage.setItem(DRAFT_KEY, token) }
    setDraftToken(token)
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))

    // Arriving from a trade shortcut or the district picker: prefill rather
    // than making the visitor re-enter what they already told us. Applied
    // after mount so the first render still matches the server HTML.
    const q = new URLSearchParams(window.location.search)
    const type = q.get('type')
    const district = q.get('district')
    if (type || district) {
      setForm(f => ({
        ...f,
        project_type: type || f.project_type,
        district: DISTRICTS_EN.includes(district) ? district : f.district,
      }))
    }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function validate() {
    const e = {}
    if (!form.project_type.trim()) e.project_type = t.required
    if (!form.city.trim()) e.city = t.required
    if (!form.description.trim()) e.description = t.required
    if (form.description.trim() && form.description.trim().length < 10) e.description = t.descMin
    if (!form.customer_name.trim()) e.customer_name = t.required
    if (!form.whatsapp.trim()) e.whatsapp = t.required
    if (!/^\+?[0-9]{9,15}$/.test(form.whatsapp.replace(/\s/g, ''))) e.whatsapp = t.phoneInvalid
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setErrors({})
    try {
      const payload = {
        project_type: form.project_type,
        city: form.city.trim(),
        district: form.district || null,
        description: form.description.trim(),
        budget_range: form.budget_range || null,
        customer_name: form.customer_name.trim(),
        whatsapp: form.whatsapp.replace(/\s/g, ''),
        status: 'active',
      }
      if (userId) {
        payload.user_id = userId
        localStorage.removeItem(DRAFT_KEY)
      } else {
        payload.session_token = draftToken
      }
      const { error } = await supabase.from('projects').insert(payload)
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setErrors({ submit: err?.message || t.submitError })
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setSuccess(false)
    setForm({ project_type: '', city: '', district: '', description: '', budget_range: '', customer_name: '', whatsapp: '' })
  }

  if (success) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Success header */}
        <div style={{ textAlign: 'center', padding: '32px 20px 24px', background: '#fff', borderRadius: '20px 20px 0 0', border: '1px solid #E2E2E2', borderBottom: 'none' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontFamily: "var(--th-display)", fontSize: 24, fontWeight: 700, color: '#0B0B0B', marginBottom: 8 }}>{sinhalaText(t.successTitle)}</h2>
          <p style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.8, maxWidth: 340, margin: '0 auto 16px' }}>
            {sinhalaText(t.successBody)}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E9F1EC', border: '1px solid #C6DDCF', borderRadius: 10, padding: '8px 14px', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#285C43' }}>✓ {sinhalaText(t.whatsappNote)} <strong>{sinhalaText(form.whatsapp)}</strong></span>
          </div>
          {/* What happens next */}
          <div style={{ textAlign: 'left', background: '#F5EEE2', border: '1px solid #E8DCC6', borderRadius: 12, padding: '14px 16px', margin: '0 auto', maxWidth: 360 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#8A6224', marginBottom: 8 }}>{sinhalaText(t.nextTitle)}</div>
            {sinhalaText(t.nextSteps.map(s => (
              <div key={s} style={{ fontSize: 12, color: '#242424', lineHeight: 1.9 }}>{sinhalaText(s)}</div>
            )))}
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(t.shareText)}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, background: '#25D366', color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            {sinhalaText(t.shareWhatsApp)}
          </a>
        </div>

        {sinhalaText(userId ? (
          /* Signed-in user: simple success with manage link */
          <div style={{ background: '#fff', border: '1px solid #E2E2E2', borderTop: '1px solid #ECECEC', borderRadius: '0 0 20px 20px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{ padding: '11px 22px', background: '#8A6224', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{sinhalaText(t.viewDashboard)}</a>
              <button onClick={resetForm}
                style={{ padding: '11px 22px', background: '#ECECEC', color: '#4A4A4A', borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                {sinhalaText(t.postAnother)}
              </button>
            </div>
          </div>
        ) : (
          /* Anonymous user: auth prompt to finalize */
          <div style={{ background: '#fff', border: '1px solid #E2E2E2', borderTop: 'none', borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #8A6224, #0B0B0B)', padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(212,161,94,0.8)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                {sinhalaText(t.oneMoreStep)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{sinhalaText(t.createAccount)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                {sinhalaText(t.benefits.map(b => (
                  <div key={b} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{sinhalaText(b)}</div>
                )))}
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <MagicLinkForm label={t.emailLabel} hint={null} t={t} />
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #ECECEC', display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/providers" style={{ fontSize: 13, color: '#6E6E6E', textDecoration: 'none', fontWeight: 600 }}>{sinhalaText(t.viewProviders)}</a>
                <span style={{ color: '#E2E2E2' }}>·</span>
                <button onClick={resetForm}
                  style={{ fontSize: 13, color: '#6E6E6E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  {sinhalaText(t.postAnother)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 560, margin: '0 auto' }}>
      {sinhalaText(errors.submit && (
        <div style={{ padding: '12px 16px', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, fontSize: 13, color: '#C0392B', marginBottom: 20 }}>
          ⚠ {sinhalaText(errors.submit)}
        </div>
      ))}

      <Field label={t.projectName} id="project_type" req error={errors.project_type} hint={t.projectHint}>
        <input
          id="project_type"
          value={form.project_type}
          onChange={e => set('project_type', e.target.value)}
          placeholder={sinhalaText(t.projectPh)}
          style={inp(!!errors.project_type)}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label={t.city} id="city" req error={errors.city}>
          <input id="city" value={form.city} onChange={e => set('city', e.target.value)} placeholder={sinhalaText(t.cityPh)} style={inp(!!errors.city)} />
        </Field>
        <Field label={t.district} id="district">
          <select id="district" value={form.district} onChange={e => set('district', e.target.value)}
            style={{ ...inp(false), WebkitAppearance: 'none', appearance: 'none', cursor: 'pointer' }}>
            <option value="">{sinhalaText(t.districtPh)}</option>
            {sinhalaText(DISTRICTS_EN.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>))}
          </select>
        </Field>
      </div>

      <Field label={t.description} id="description" req error={errors.description} hint={t.descHint}>
        <textarea id="description" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder={sinhalaText(t.descPh)}
          rows={4} style={{ ...inp(!!errors.description), resize: 'vertical', minHeight: 100 }} />
      </Field>

      <Field label={t.budget} id="budget_range" hint={t.budgetHint}>
        <input
          id="budget_range"
          value={form.budget_range}
          onChange={e => set('budget_range', e.target.value)}
          placeholder={sinhalaText(t.budgetPh)}
          style={inp(false)}
        />
      </Field>

      <div style={{ height: 1, background: '#ECECEC', margin: '8px 0 20px' }} />
      <p style={{ fontSize: 12, color: '#6E6E6E', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
        {sinhalaText(t.privacy)}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label={t.yourName} id="customer_name" req error={errors.customer_name}>
          <input id="customer_name" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder={sinhalaText(t.namePh)} style={inp(!!errors.customer_name)} />
        </Field>
        <Field label={t.whatsapp} id="whatsapp" req error={errors.whatsapp} hint={t.whatsappHint}>
          <input id="whatsapp" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+94771234567" type="tel" style={inp(!!errors.whatsapp)} />
        </Field>
      </div>

      <button type="submit" disabled={submitting}
        style={{ width: '100%', padding: '13px', background: submitting ? '#8C8C8C' : '#8A6224', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
        {sinhalaText(submitting ? t.submitting : t.submit)}
      </button>

      <p style={{ fontSize: 11, color: '#8C8C8C', textAlign: 'center', marginTop: 12 }}>
        {sinhalaText(t.footer)}
      </p>
    </form>
  )
}
