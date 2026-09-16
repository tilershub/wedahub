import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, PROJECT_TYPES, DISTRICTS_EN } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'
import JobCard from './JobCard.jsx'

const TYPE_ICONS = {
  'Floor Tiling': '🪨', 'Bathroom Tiling': '🚿', 'Bathroom Renovation': '🛁',
  'Granite Works': '💎', 'Tile Cutting': '✂️', 'Routering': '🔧',
  'Waterproofing': '💧', 'Tile Shop Inquiry': '🏪',
}

const T = {
  allTypes:     { en: 'All project types', si: 'සියලු ව්‍යාපෘති වර්ග' },
  allDistricts: { en: 'All districts',     si: 'සියලු දිස්ත්‍රික්ක' },
  clear:        { en: 'Clear',             si: 'ඉවත් කරන්න' },
  loading:      { en: 'Loading…',          si: 'පූරණය…' },
  loadingJobs:  { en: 'Loading projects…', si: 'ව්‍යාපෘති පූරණය…' },
  count:        { en: n => `${n} open project${n === 1 ? '' : 's'}`, si: n => `විවෘත ව්‍යාපෘති ${n}ක්` },
  emptyTitle:   { en: 'No open projects right now', si: 'දැනට විවෘත ව්‍යාපෘති නොමැත' },
  emptyBody:    { en: 'Be the first to post — verified tilers will send you quotes.',
                  si: 'ප්‍රථමයෙන් ව්‍යාපෘතිය පලකරන්න — සත්‍යාපිත ටයිලර්ලා ලංසු ඉදිරිපත් කරනු ඇත.' },
  postCta:      { en: 'Post a project',    si: 'ව්‍යාපෘතිය පලකරන්න' },
  ownTitle:     { en: 'Have a tiling project?', si: 'ටයිලිං ව්‍යාපෘතියක් තිබේද?' },
  ownBody:      { en: 'Post it free — providers send quotes and you choose.',
                  si: 'නොමිලේ පලකරන්න — සේවා සපයන්නන් ලංසු ඉදිරිපත් කරති, ඔබ තෝරා ගන්න.' },
  ownCta:       { en: 'Post my project',   si: 'මගේ ව්‍යාපෘතිය පලකරන්න' },

  // Signed-out gate
  gateTitle:  { en: 'Sign in to see projects and send quotes', si: 'ව්‍යාපෘති බැලීමට සහ ලංසු දැමීමට ලොගිනය' },
  gateBody:   { en: 'Registered providers can see every open project and quote homeowners directly.',
                si: 'ලියාපදිංචි සේවා සපයන්නන්ට සියලු විවෘත ව්‍යාපෘති බලා, ගෘහ හිමියන්ට ලංසු ඉදිරිපත් කළ හැකිය.' },
  gateSignIn: { en: 'Sign in',   si: 'ලොගිනය' },
  gateJoin:   { en: 'Join as a provider', si: 'සේවා සපයන්නෙකු ලෙස එකතු වන්න' },
  gateEmail:  { en: 'Enter your email to sign in', si: 'ලොගිනය සඳහා ඊමේල් ඇතුළු කරන්න' },
  gateSend:   { en: 'Send magic link', si: 'Magic Link යවන්න' },
  gateSending:{ en: 'Sending…',   si: 'යවමින්…' },
  gateBack:   { en: 'Back',       si: 'ආපසු' },
  gateNoPass: { en: 'No password needed — secure one-time sign-in.', si: 'මුරපදයක් අවශ්‍ය නැත — ආරක්ෂිත එකවර ලොගිනය.' },
  gateCheck:  { en: 'Check your email', si: 'ඔබේ ඊමේල් බලන්න' },
  gateSent:   { en: e => `We sent a sign-in link to ${e}. Click it to see every project.`,
                si: e => `${e} වෙත ලොගිනය සබැඳියක් යවා ඇත. සියලු ව්‍යාපෘති ප්‍රවේශ වීමට ක්ලික් කරන්න.` },
  gateBadMail:{ en: 'Enter a valid email address', si: 'වලංගු විද්‍යුත් ලිපිනයක් ඇතුළු කරන්න' },
  benefits:   {
    en: ['📊 See every open project', '💬 Send quotes with your price', '✅ Win work directly', '🔔 Get alerts for new projects'],
    si: ['📊 සියලු විවෘත ව්‍යාපෘති බලන්න', '💬 මිල ගණන් සහිත ලංසු ඉදිරිපත් කරන්න', '✅ කෙළින්ම රැකියා ජය ගන්න', '🔔 නව ව්‍යාපෘති දැනුම් ලබන්න'],
  },
}

function useT() {
  const lang = useLang()
  return (k, ...a) => {
    const v = T[k]?.[lang] ?? T[k]?.en
    return typeof v === 'function' ? v(...a) : v
  }
}

function selectStyle() {
  return {
    padding: '9px 14px', border: '1.5px solid #E2E2E2', borderRadius: 10,
    fontSize: 13, fontFamily: 'inherit', background: '#fff', outline: 'none',
    cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
  }
}

function ProviderGate({ previewProjects, bidCounts }) {
  const t = useT()
  const [showAuth, setShowAuth] = useState(false)
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  async function send(e) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) { setErr(t('gateBadMail')); return }
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.href } })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  return (
    <div>
      {/* Blurred preview */}
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {sinhalaText(previewProjects.slice(0, 3).map(p => (
            <div key={p.id} style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none' }}><JobCard job={p} bidCount={bidCounts[p.id] || 0} /></div>
          )))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(transparent, #F7F7F7)', pointerEvents: 'none' }} />
      </div>

      {/* Gate card */}
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', borderRadius: 20, border: '1.5px solid #E2E2E2', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #8A6224, #0B0B0B)', padding: '24px 28px' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
          <div style={{ fontFamily: "var(--th-display)", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {sinhalaText(t(`gateTitle`))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
            {sinhalaText(t(`gateBody`))}
          </p>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {sinhalaText(!showAuth ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {sinhalaText(t('benefits').map(b => (
                  <div key={b} style={{ fontSize: 12, color: '#4A4A4A' }}>{sinhalaText(b)}</div>
                )))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setShowAuth(true)} style={{ flex: 1, padding: '12px', background: '#8A6224', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', minWidth: 140 }}>
                  {sinhalaText(t(`gateSignIn`))} →
                </button>
                <a href="/join-wedahub" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#ECECEC', color: '#8A6224', border: '1.5px solid #EBE2D2', borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none', minWidth: 140 }}>
                  {sinhalaText(t(`gateJoin`))}
                </a>
              </div>
            </div>
          ) : sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📬</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0B', marginBottom: 6 }}>{sinhalaText(t(`gateCheck`))}</div>
              <p style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.7 }}>
                {sinhalaText(t(`gateSent`, email))}
              </p>
            </div>
          ) : (
            <form onSubmit={send}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#4A4A4A', marginBottom: 10 }}>{sinhalaText(t(`gateEmail`))}</div>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} placeholder="your@email.com" autoFocus
                style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${err ? '#DCC9A4' : '#E2E2E2'}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: err ? '#FBEDEB' : '#fff', boxSizing: 'border-box', marginBottom: 10 }} />
              {sinhalaText(err && <p style={{ fontSize: 11, color: '#C0392B', marginBottom: 8 }}>⚠ {sinhalaText(err)}</p>)}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={loading}
                  style={{ flex: 1, padding: '11px', background: loading ? '#8C8C8C' : '#8A6224', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {sinhalaText(loading ? '⏳ ' + t('gateSending') : '✉️ ' + t('gateSend'))}
                </button>
                <button type="button" onClick={() => setShowAuth(false)}
                  style={{ padding: '11px 14px', background: '#ECECEC', color: '#6E6E6E', border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>
                  {sinhalaText(t(`gateBack`))}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#8C8C8C', textAlign: 'center', marginTop: 8 }}>{sinhalaText(t(`gateNoPass`))}</p>
            </form>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function JobsBoard({ initialProjects = null, initialBidCounts = null }) {
  const t = useT()
  const [projects, setProjects]   = useState(initialProjects || [])
  const [loading, setLoading]     = useState(!initialProjects)
  const [filters, setFilters]     = useState({ type: '', district: '' })
  const [bidCounts, setBidCounts] = useState(initialBidCounts || {})
  const [user, setUser]           = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, project_type, city, district, description, budget_range, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const jobs = data || []
        // Refresh past the SSR seed (seed is capped; this is the full list)
        setProjects(jobs)
        setLoading(false)
        if (jobs.length > 0) {
          const ids = jobs.map(j => j.id)
          supabase.from('bids').select('job_id').in('job_id', ids).then(({ data: bids }) => {
            const counts = {}
            for (const b of bids || []) counts[b.job_id] = (counts[b.job_id] || 0) + 1
            setBidCounts(counts)
          })
        }
      })
  }, [])

  const filtered = projects.filter(p => {
    if (filters.type && p.project_type !== filters.type) return false
    if (filters.district && p.district !== filters.district) return false
    return true
  })

  return (
    <div style={{ background: 'var(--surface)', minHeight: '60vh' }}>
      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E2E2', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} style={selectStyle()}>
            <option value="">{sinhalaText(t(`allTypes`))}</option>
            {sinhalaText(PROJECT_TYPES.map(t => <option key={t} value={t}>{sinhalaText(TYPE_ICONS[t])} {sinhalaText(t)}</option>))}
          </select>
          <select value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value }))} style={selectStyle()}>
            <option value="">{sinhalaText(t(`allDistricts`))}</option>
            {sinhalaText(DISTRICTS_EN.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>))}
          </select>
          {sinhalaText((filters.type || filters.district) && (
            <button onClick={() => setFilters({ type: '', district: '' })} style={{ fontSize: 12, color: '#6E6E6E', background: '#ECECEC', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              ✕ {sinhalaText(t(`clear`))}
            </button>
          ))}
          <span style={{ fontSize: 12, color: '#8C8C8C', marginLeft: 'auto' }}>
            {sinhalaText(loading ? t('loading') : t('count', filtered.length))}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>
        {sinhalaText(loading ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: '#8C8C8C', fontSize: 14 }}>{sinhalaText(t(`loadingJobs`))}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: '#fff', borderRadius: 16, border: '1px solid #E2E2E2' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0B', marginBottom: 8 }}>{sinhalaText(t(`emptyTitle`))}</h3>
            <p style={{ fontSize: 14, color: '#6E6E6E', marginBottom: 24 }}>{sinhalaText(t(`emptyBody`))}</p>
            <a href="/post-project" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#8A6224', color: '#fff', borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              📋 {sinhalaText(t(`postCta`))}
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {sinhalaText(filtered.map(p => (
              <JobCard key={p.id} job={p} bidCount={bidCounts[p.id] || 0} />
            )))}
          </div>
        ))}

        {sinhalaText(!loading && user && filtered.length > 0 && (
          <div style={{ marginTop: 48, padding: '28px 32px', background: 'linear-gradient(135deg, #8A6224, #0B0B0B)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{sinhalaText(t(`ownTitle`))}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{sinhalaText(t(`ownBody`))}</div>
            </div>
            <a href="/post-project" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#8A6224', color: '#fff', borderRadius: 12, padding: '11px 22px', fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📋 {sinhalaText(t(`ownCta`))}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
