import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const JOB_TYPES = [
  'Bathroom Renovation', 'Floor Tiling', 'Bathroom Tiling',
  'Kitchen Tiling', 'Wall Tiling', 'Outdoor Tiling',
  'Staircase Tiling', 'Waterproofing', 'Granite Works',
  'Large Format Tiling', 'Mosaic Tiling', 'Pool Tiling',
  'House Painting', 'Furniture Painting', 'Carpentry Works',
  'Debris Removal', 'Demolition Work', 'Site Cleaning',
  'Gypsum Ceiling',
  'Kitchen Renovation', 'Air Conditioning', 'Roofing', 'Solar Panels',
  'Plastering & Skimming', 'Gate & Fencing', 'CCTV & Security',
  'Epoxy Flooring', 'Parquet / Laminate Flooring', 'Partition Walls',
  'Water Tank Installation', 'Kitchen Cabinets', 'Concrete & Masonry',
  'Vinyl Flooring', 'Swimming Pool Construction', 'Smart Home / Automation',
  'Paving & Driveways', 'Pergola & Shade Structures',
  'Other',
]

const RATING_LABELS = { 5: 'ඉතා හොඳ', 4: 'හොඳ', 3: 'සාධාරණ', 2: 'යෝග්‍ය', 1: 'දුර්වල' }
const RATING_COLORS = { 5: '#2F6B4F', 4: '#2F6B4F', 3: '#8A6224', 2: '#8A6224', 1: '#C0392B' }

const AVATAR_COLORS = ['#8A6224','#8A6224','#6B4A18','#8A6224','#2F6B4F','#8A6224','#285C43','#8A6224']
function avatarColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}
function timeAgo(ts) {
  const days = Math.floor((Date.now() - new Date(ts)) / 86400000)
  if (days === 0) return 'අද'
  if (days === 1) return 'ඊයේ'
  if (days < 30)  return `${days}දින`
  if (days < 365) return `${Math.floor(days / 30)}මාස`
  return `${Math.floor(days / 365)}වසර`
}

// ─── Stars display ─────────────────────────────────────────────────────────────
function Stars({ rating, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {sinhalaText([1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: size, color: n <= rating ? '#f59e0b' : '#E2E2E2', lineHeight: 1 }}>★</span>
      )))}
    </span>
  )
}

// ─── Interactive star picker ────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        {sinhalaText([1,2,3,4,5].map(n => (
          <span
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            style={{ fontSize: 36, cursor: 'pointer', color: n <= active ? '#f59e0b' : '#E2E2E2', transition: 'color 0.1s, transform 0.1s', transform: hovered === n ? 'scale(1.2)' : 'scale(1)', userSelect: 'none', lineHeight: 1 }}
          >★</span>
        )))}
        {sinhalaText(active > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: RATING_COLORS[active], marginLeft: 6 }}>
            {sinhalaText(RATING_LABELS[active])}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Review form ───────────────────────────────────────────────────────────────
function ReviewForm({ tilerId, providerId, onSubmitted }) {
  const [form, setForm] = useState({ reviewer_name: '', rating: 0, job_type: '', comment: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.rating)                           { setError(sinhalaText('ශ්‍රේණිගත කිරීම තෝරන්න')); return }
    if (!form.reviewer_name.trim())             { setError(sinhalaText('ඔබේ නම ඇතුළු කරන්න')); return }
    if (!form.job_type)                         { setError(sinhalaText('කාර්ය වර්ගය තෝරන්න')); return }
    if (form.comment.trim().length < 20)        { setError(sinhalaText('සමාලෝචනය අවම වශයෙන් අකුරු 20ක් විය යුතුය')); return }
    // One review per provider per browser
    const guardKey = `th_reviewed_${providerId || tilerId}`
    if (localStorage.getItem(guardKey)) { setError(sinhalaText('ඔබ දැනටමත් මෙම ශිල්පියා සමාලෝචනය කර ඇත')); return }
    setLoading(true); setError(sinhalaText(''))
    const payload = {
      reviewer_name: form.reviewer_name.trim(),
      rating:        form.rating,
      job_type:      form.job_type,
      comment:       form.comment.trim(),
    }
    if (tilerId)    payload.tiler_id    = tilerId
    if (providerId) payload.provider_id = providerId
    const { error: err } = await supabase.from('reviews').insert(payload)
    setLoading(false)
    if (err) { setError(sinhalaText(err.message || 'ඉදිරිපත් කිරීම අසාර්ථකයි — නැවත උත්සාහ කරන්න.')); return }
    try { localStorage.setItem(guardKey, '1') } catch {}
    onSubmitted()
  }

  const inp = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #E2E2E2',
    borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', background: '#fff',
  }
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#6E6E6E',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  }
  const charCount = form.comment.length
  const charOk    = charCount >= 20

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#F7F7F7', borderRadius: 14, padding: '20px 18px', border: '1.5px solid #E2E2E2' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0B' }}>සමාලෝචනයක් ලියන්න</div>

      {/* Stars */}
      <div>
        <label style={labelStyle}>ඔබේ ශ්‍රේණිය *</label>
        <StarPicker value={form.rating} onChange={v => set('rating', v)} />
      </div>

      {/* Name + Job type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ඔබේ නම *</label>
          <input
            value={form.reviewer_name}
            onChange={e => set('reviewer_name', e.target.value)}
            placeholder="නිදසුන: නිමල් සිල්වා"
            maxLength={60}
            style={inp}
            onFocus={e => e.target.style.borderColor = '#8A6224'}
            onBlur={e  => e.target.style.borderColor = '#E2E2E2'}
          />
        </div>
        <div>
          <label style={labelStyle}>කාර්ය වර්ගය *</label>
          <select
            value={form.job_type}
            onChange={e => set('job_type', e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
            onFocus={e => e.target.style.borderColor = '#8A6224'}
            onBlur={e  => e.target.style.borderColor = '#E2E2E2'}
          >
            <option value="">තෝරන්න…</option>
            {sinhalaText(JOB_TYPES.map(t => <option key={t} value={t}>{sinhalaText(t)}</option>))}
          </select>
        </div>
      </div>

      {/* Comment */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <label style={labelStyle}>ඔබේ සමාලෝචනය *</label>
          <span style={{ fontSize: 10, color: charOk ? '#2F6B4F' : '#8C8C8C' }}>{sinhalaText(charCount)}/500</span>
        </div>
        <textarea
          value={form.comment}
          onChange={e => set('comment', e.target.value.slice(0, 500))}
          placeholder="කාර්යයේ ගුණාත්මකභාවය, කාලානුරූපභාවය, පිරිසිදුකම සහ මුදල් වටිනාකම ගැන ලියන්න"
          rows={4}
          style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
          onFocus={e => e.target.style.borderColor = '#8A6224'}
          onBlur={e  => e.target.style.borderColor = '#E2E2E2'}
        />
        {sinhalaText(charCount > 0 && !charOk && (
          <div style={{ fontSize: 10, color: '#8C8C8C', marginTop: 4 }}>තවත් අකුරු {sinhalaText(20 - charCount)}ක් අවශ්‍යයි</div>
        ))}
      </div>

      {sinhalaText(error && (
        <div style={{ fontSize: 12, color: '#C0392B', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 8, padding: '8px 12px' }}>
          ⚠ {sinhalaText(error)}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        style={{ padding: '12px', background: loading ? '#8C8C8C' : '#8A6224', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
      >
        {sinhalaText(loading ? '⏳ ඉදිරිපත් කෙරෙමින්…' : '⭐ සමාලෝචනය ඉදිරිපත් කරන්න')}
      </button>
    </form>
  )
}

// ─── Single review card ─────────────────────────────────────────────────────────
function ReviewCard({ r }) {
  const color = avatarColor(r.reviewer_name)
  const inits = initials(r.reviewer_name)
  const ratingColor = RATING_COLORS[r.rating] || '#f59e0b'
  return (
    <div style={{ padding: '16px 18px', background: '#fff', borderRadius: 14, border: '1px solid #E2E2E2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {sinhalaText(inits)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0B', lineHeight: 1.2 }}>{sinhalaText(r.reviewer_name)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {sinhalaText(r.job_type && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#8A6224', background: '#F5EEE2', border: '1px solid #EBE2D2', borderRadius: 20, padding: '1px 7px' }}>
                  {sinhalaText(r.job_type)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Stars rating={r.rating} size={13} />
            <span style={{ fontSize: 11, fontWeight: 700, color: ratingColor }}>{sinhalaText(RATING_LABELS[r.rating])}</span>
          </div>
          <span style={{ fontSize: 10, color: '#8C8C8C' }}>{sinhalaText(timeAgo(r.created_at))}</span>
        </div>
      </div>
      {sinhalaText(r.comment && (
        <p style={{ fontSize: 13, color: '#4A4A4A', lineHeight: 1.7, margin: 0, paddingTop: 8, borderTop: '1px solid #ECECEC' }}>
          {sinhalaText(r.comment)}
        </p>
      ))}
    </div>
  )
}

// ─── Rating summary bar ─────────────────────────────────────────────────────────
function RatingSummary({ avg, reviews }) {
  const breakdown = [5,4,3,2,1].map(n => ({
    n, count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === n).length / reviews.length) * 100) : 0,
  }))
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', background: '#F7F7F7', borderRadius: 14, padding: '18px 20px', border: '1px solid #E2E2E2', marginBottom: 20 }}>
      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#0B0B0B', lineHeight: 1 }}>{sinhalaText(avg.toFixed(1))}</div>
        <Stars rating={Math.round(avg)} size={16} />
        <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 5 }}>
          සමාලෝචන {sinhalaText(reviews.length)}ක්
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        {sinhalaText(breakdown.map(({ n, count, pct }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#6E6E6E', width: 10, textAlign: 'right' }}>{sinhalaText(n)}</span>
            <span style={{ fontSize: 11, color: '#f59e0b', lineHeight: 1 }}>★</span>
            <div style={{ flex: 1, height: 7, background: '#E2E2E2', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: RATING_COLORS[n], borderRadius: 4, width: `${pct}%`, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 10, color: pct > 0 ? '#4A4A4A' : '#D0D0D0', width: 28, textAlign: 'right', fontWeight: pct > 0 ? 600 : 400 }}>{sinhalaText(pct > 0 ? `${pct}%` : '—')}</span>
          </div>
        )))}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
const PAGE = 5

export default function ReviewsSection({ tilerId, providerId }) {
  const [reviews,   setReviews]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [visible,   setVisible]   = useState(PAGE)

  useEffect(() => {
    const q = tilerId
      ? supabase.from('reviews').select('*').eq('tiler_id',    tilerId).eq('status', 'published').order('created_at', { ascending: false })
      : supabase.from('reviews').select('*').eq('provider_id', providerId).eq('status', 'published').order('created_at', { ascending: false })
    q.then(({ data }) => { setReviews(data || []); setLoading(false) })
  }, [tilerId, providerId])

  useEffect(() => {
    function openForm() {
      setShowForm(true)
      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener('tilershub:openreview', openForm)
    if (window.location.hash === '#write-review') setTimeout(openForm, 600)
    return () => window.removeEventListener('tilershub:openreview', openForm)
  }, [])

  function onSubmitted() {
    setSubmitted(true)
    setShowForm(false)
    // Reload reviews so new one shows immediately
    const q = tilerId
      ? supabase.from('reviews').select('*').eq('tiler_id',    tilerId).eq('status', 'published').order('created_at', { ascending: false })
      : supabase.from('reviews').select('*').eq('provider_id', providerId).eq('status', 'published').order('created_at', { ascending: false })
    q.then(({ data }) => setReviews(data || []))
  }

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div id="reviews-section" style={{ background: '#fff', border: '1px solid #E2E2E2', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0B', margin: 0 }}>
          ⭐ සමාලෝචන {sinhalaText(reviews.length > 0 && <span style={{ fontSize: 12, color: '#8C8C8C', fontWeight: 400 }}>({sinhalaText(reviews.length)})</span>)}
        </h2>
        {sinhalaText(!submitted && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontSize: 12, fontWeight: 700, color: '#8A6224', background: '#F5EEE2', border: '1.5px solid #EBE2D2', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            + සමාලෝචනයක් ලියන්න
          </button>
        ))}
      </div>

      {sinhalaText(loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#8C8C8C', fontSize: 13 }}>සමාලෝචන පූරණය වෙමින්…</div>
      ) : (
        <>
          {/* Rating summary — only if reviews exist */}
          {sinhalaText(reviews.length > 0 && <RatingSummary avg={avg} reviews={reviews} />)}

          {/* Empty state */}
          {sinhalaText(reviews.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#4A4A4A', marginBottom: 4 }}>සමාලෝචන නොමැත</p>
              <p style={{ fontSize: 12, color: '#8C8C8C', marginBottom: 20 }}>ඔබේ අත්දැකීම පළමුව බෙදා ගන්න.</p>
              <button
                onClick={() => setShowForm(true)}
                style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#8A6224', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer' }}
              >
                ⭐ සමාලෝචනයක් ලියන්න
              </button>
            </div>
          ))}

          {/* Review cards */}
          {sinhalaText(reviews.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {sinhalaText(reviews.slice(0, visible).map(r => <ReviewCard key={r.id} r={r} />))}
            </div>
          ))}

          {/* Load more */}
          {sinhalaText(reviews.length > visible && (
            <button
              onClick={() => setVisible(v => v + PAGE)}
              style={{ width: '100%', padding: '10px', background: '#F7F7F7', color: '#4A4A4A', border: '1.5px solid #E2E2E2', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}
            >
              තවත් බලන්න ({sinhalaText(reviews.length - visible)})
            </button>
          ))}

          {/* Review form */}
          {sinhalaText(showForm && (
            <div style={{ marginTop: reviews.length > 0 ? 8 : 0 }}>
              <ReviewForm tilerId={tilerId} providerId={providerId} onSubmitted={onSubmitted} />
            </div>
          ))}

          {/* Success message */}
          {sinhalaText(submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2F6B4F', fontWeight: 600, background: '#E9F1EC', border: '1px solid #C6DDCF', borderRadius: 10, padding: '10px 16px', marginTop: 8 }}>
              ✅ ස්තූතියි — ඔබේ සමාලෝචනය ප්‍රකාශිත විය!
            </div>
          ))}
        </>
      ))}
    </div>
  )
}
