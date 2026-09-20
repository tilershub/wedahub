import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const RATING_LABELS = { 5: 'ඉතා හොඳ', 4: 'හොඳ', 3: 'සාධාරණ', 2: 'යෝග්‍ය', 1: 'දුර්වල' }
const RATING_COLORS = { 5: '#2F6B4F', 4: '#2F6B4F', 3: '#C2542B', 2: '#ea580c', 1: '#C0392B' }

const AVATAR_COLORS = ['#C2542B','#C2542B','#8E3C1E','#C2542B','#2F6B4F','#C2542B','#285C43','#C2542B']
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
        <span key={n} style={{ fontSize: size, color: n <= rating ? '#f59e0b' : '#E4E0D9', lineHeight: 1 }}>★</span>
      )))}
    </span>
  )
}

// ─── Review form ───────────────────────────────────────────────────────────────
function ReviewForm() {
  return <div style={{ padding: 20, background: '#FBFAF8', borderRadius: 12 }}>
    <p>Reviews are linked to a job with this provider. Open your job to write or edit your review.</p>
    <a href="/my-jobs" style={{ color: '#C2542B', fontWeight: 700 }}>My jobs &amp; reviews →</a>
  </div>
}

// ─── Single review card ─────────────────────────────────────────────────────────
function ReviewCard({ r }) {
  const color = avatarColor(r.reviewer_name)
  const inits = initials(r.reviewer_name)
  const ratingColor = RATING_COLORS[r.rating] || '#f59e0b'
  return (
    <div style={{ padding: '16px 18px', background: '#fff', borderRadius: 14, border: '1px solid #E4E0D9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {sinhalaText(inits)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#14171A', lineHeight: 1.2 }}>{sinhalaText(r.reviewer_name)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {sinhalaText(r.job_type && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#C2542B', background: '#F7EFE9', border: '1px solid #EDDFD5', borderRadius: 20, padding: '1px 7px' }}>
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
          <span style={{ fontSize: 10, color: '#8A8F95' }}>{sinhalaText(timeAgo(r.created_at))}</span>
        </div>
      </div>
      {r.confirmed_job && <p style={{ fontSize: 12, color: '#2F6B4F' }}>✓ Review from a confirmed job</p>}
      {r.provider_reply && <blockquote style={{ fontSize: 13, borderLeft: '3px solid #C2542B', paddingLeft: 12 }}><strong>Provider reply</strong><p>{r.provider_reply}</p></blockquote>}
      {sinhalaText(r.comment && (
        <p style={{ fontSize: 13, color: '#3A4046', lineHeight: 1.7, margin: 0, paddingTop: 8, borderTop: '1px solid #EFEBE4' }}>
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
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', background: '#FBFAF8', borderRadius: 14, padding: '18px 20px', border: '1px solid #E4E0D9', marginBottom: 20 }}>
      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#14171A', lineHeight: 1 }}>{sinhalaText(avg.toFixed(1))}</div>
        <Stars rating={Math.round(avg)} size={16} />
        <div style={{ fontSize: 11, color: '#8A8F95', marginTop: 5 }}>
          සමාලෝචන {sinhalaText(reviews.length)}ක්
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        {sinhalaText(breakdown.map(({ n, count, pct }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#6B7076', width: 10, textAlign: 'right' }}>{sinhalaText(n)}</span>
            <span style={{ fontSize: 11, color: '#f59e0b', lineHeight: 1 }}>★</span>
            <div style={{ flex: 1, height: 7, background: '#E4E0D9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: RATING_COLORS[n], borderRadius: 4, width: `${pct}%`, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 10, color: pct > 0 ? '#3A4046' : '#D6D0C6', width: 28, textAlign: 'right', fontWeight: pct > 0 ? 600 : 400 }}>{sinhalaText(pct > 0 ? `${pct}%` : '—')}</span>
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
    <div id="reviews-section" style={{ background: '#fff', border: '1px solid #E4E0D9', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#14171A', margin: 0 }}>
          ⭐ සමාලෝචන {sinhalaText(reviews.length > 0 && <span style={{ fontSize: 12, color: '#8A8F95', fontWeight: 400 }}>({sinhalaText(reviews.length)})</span>)}
        </h2>
        {sinhalaText(!submitted && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ fontSize: 12, fontWeight: 700, color: '#C2542B', background: '#F7EFE9', border: '1.5px solid #EDDFD5', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
          >
            + සමාලෝචනයක් ලියන්න
          </button>
        ))}
      </div>

      {sinhalaText(loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#8A8F95', fontSize: 13 }}>සමාලෝචන පූරණය වෙමින්…</div>
      ) : (
        <>
          {/* Rating summary — only if reviews exist */}
          {sinhalaText(reviews.length > 0 && <RatingSummary avg={avg} reviews={reviews} />)}

          {/* Empty state */}
          {sinhalaText(reviews.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3A4046', marginBottom: 4 }}>සමාලෝචන නොමැත</p>
              <p style={{ fontSize: 12, color: '#8A8F95', marginBottom: 20 }}>ඔබේ අත්දැකීම පළමුව බෙදා ගන්න.</p>
              <button
                onClick={() => setShowForm(true)}
                style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#C2542B', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer' }}
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
              style={{ width: '100%', padding: '10px', background: '#FBFAF8', color: '#3A4046', border: '1.5px solid #E4E0D9', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}
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
