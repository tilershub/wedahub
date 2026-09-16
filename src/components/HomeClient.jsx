import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'
import { useDistrict } from '../lib/district.js'
import { SERVICES } from '../lib/services.js'
import JobCard from './JobCard.jsx'

/**
 * HomeClient — the homeowner's home screen.
 *
 * One action, then what's near them. Everything below the fold on this page
 * is district-aware, so the district is stated once in the app bar and never
 * asked for again here.
 */

const T = {
  greetingIn:  { en: 'Welcome back',                si: 'නැවත සාදරයෙන් පිළිගනිමු' },
  greetingOut: { en: 'Find trusted professionals near you', si: 'ඔබ අසල විශ්වාසනීය සේවා සපයන්නන්' },
  free:        { en: 'Free to post',                si: 'නොමිලේ' },
  pitch:       { en: 'Describe the job. Get quotes by tomorrow.', si: 'රැකියාව විස්තර කරන්න. හෙට වන විට ලංසු ලබා ගන්න.' },
  postCta:     { en: 'Post your job',               si: 'රැකියාව පලකරන්න' },
  nearby:      { en: n => `${n} providers in your district`, si: n => `ඔබේ දිස්ත්‍රික්කයේ සේවා දායක ${n}` },
  browse:      { en: 'or browse all services →',    si: 'නැතහොත් සියලු සේවා බලන්න →' },
  popular:     { en: 'What do you need?',           si: 'ඔබට අවශ්‍ය කුමක්ද?' },
  active:      { en: 'Your projects',               si: 'ඔබේ ව්‍යාපෘති' },
  seeAll:      { en: 'See all',                     si: 'සියල්ල' },
}

// The trades homeowners actually post. The rest live behind "browse all".
// SERVICES carries English labels only, so the six shown here are translated
// in place rather than adding a `label_si` to all forty.
const QUICK = {
  'bathroom-renovation': 'නාන කාමර ප්‍රතිසංස්කරණය',
  'floor-tiling':        'බිම් ටයිල්',
  'kitchen-renovation':  'කුස්සිය ප්‍රතිසංස්කරණය',
  'waterproofing':       'ජල ආරක්ෂණය',
  'gypsum-ceiling':      'ජිප්සම් සිවිලිම',
  'house-painting':      'නිවස තීන්ත ගෑම',
}

export default function HomeClient({ initialUser = null, providerCount = 0, initialJobs = [] }) {
  const lang = useLang()
  const district = useDistrict()
  const t = (k, ...a) => {
    const v = T[k]?.[lang] ?? T[k]?.en
    return typeof v === 'function' ? v(...a.map(sinhalaText)) : v
  }

  const [jobs, setJobs] = useState(initialJobs)
  const [bidCounts, setBidCounts] = useState({})
  const categories = Object.entries(QUICK)
    .map(([slug, si]) => {
      const s = SERVICES.find(x => x.slug === slug)
      return s && { ...s, si }
    })
    .filter(Boolean)

  // Quote counts are a second round trip, so they land after first paint
  // rather than holding up the page.
  useEffect(() => {
    if (jobs.length === 0) return
    let alive = true
    supabase.from('bids').select('job_id').in('job_id', jobs.map(j => j.id))
      .then(({ data }) => {
        if (!alive || !data) return
        const counts = {}
        for (const b of data) counts[b.job_id] = (counts[b.job_id] || 0) + 1
        setBidCounts(counts)
      })
    return () => { alive = false }
  }, [jobs])

  // Signed-in visitors who arrived without SSR'd projects (cached shell).
  useEffect(() => {
    if (!initialUser || initialJobs.length > 0) return
    let alive = true
    supabase.from('projects')
      .select('id,project_type,city,district,description,budget_range,status,created_at')
      .eq('user_id', initialUser.id).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => { if (alive && data?.length) setJobs(data) })
    return () => { alive = false }
  }, [])

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 16px 8px' }}>
      <h1 style={{ fontSize: 'clamp(23px,6.2vw,30px)', lineHeight: 1.12, margin: '0 0 18px' }}>
        {sinhalaText(initialUser ? t('greetingIn') : t('greetingOut'))}
      </h1>

      {/* The one action. */}
      <a href={`/post-project?district=${encodeURIComponent(district)}`}
         className="th-card th-card--ink th-card--tap"
         style={{ display: 'block', padding: 20, marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden="true" style={{
          position: 'absolute', right: -30, bottom: -46, width: 150, height: 150, borderRadius: 999,
          background: 'rgba(212,161,94,0.45)', filter: 'blur(36px)',
        }} />
        <span style={{ position: 'relative', display: 'block' }}>
          <span style={{ display: 'block', font: '700 10.5px var(--th-body)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--th-saffron)', marginBottom: 8 }}>
            {sinhalaText(t('free'))}
          </span>
          <span style={{ display: 'block', font: '800 21px var(--th-display)', letterSpacing: '-0.035em', lineHeight: 1.18, marginBottom: 15 }}>
            {sinhalaText(t('pitch'))}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
            <span className="th-btn th-btn--primary" style={{ minHeight: 42, fontSize: 14 }}>{sinhalaText(t('postCta'))}</span>
            {sinhalaText(providerCount > 0 && (
              <span style={{ font: '500 12px var(--th-body)', color: 'rgba(255,255,255,0.6)' }}>
                {sinhalaText(t('nearby', providerCount))}
              </span>
            ))}
          </span>
        </span>
      </a>

      {/* Trade shortcuts — each one prefills the post form. */}
      <div style={{ font: '700 13px var(--th-display)', marginBottom: 10 }}>{sinhalaText(t('popular'))}</div>
      {/* minmax(0,1fr): grid items default to min-width:auto, and a long
          trade name would otherwise push the track past the viewport. */}
      <div className="th-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9, marginBottom: 8 }}>
        {sinhalaText(categories.map(c => (
          <a key={c.slug} href={`/post-project?type=${encodeURIComponent(c.label)}&district=${encodeURIComponent(district)}`}
             className="th-card th-card--tap"
             style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 12, color: 'inherit', minHeight: 78, minWidth: 0 }}>
            <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>{sinhalaText(c.icon)}</span>
            <span style={{ font: '600 11.5px var(--th-body)', lineHeight: 1.25 }}>{sinhalaText(lang === 'si' ? c.si : c.label)}</span>
          </a>
        )))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <a href="/providers" style={{ font: '600 12.5px var(--th-body)' }}>{sinhalaText(t('browse'))}</a>
      </div>

      {sinhalaText(jobs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ font: '700 13px var(--th-display)' }}>{sinhalaText(t('active'))}</div>
            <span style={{ flex: 1 }} />
            <a href="/account" style={{ font: '600 12px var(--th-body)' }}>{sinhalaText(t('seeAll'))}</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 }}>
            {sinhalaText(jobs.map(j => <JobCard key={j.id} job={j} variant="mine" bidCount={bidCounts[j.id] || 0} />))}
          </div>
        </>
      ))}
    </div>
  )
}
