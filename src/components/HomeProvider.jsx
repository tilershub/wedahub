import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../lib/useLang.js'
import JobCard from './JobCard.jsx'

/**
 * HomeProvider — the provider's home screen. A working surface: how they are
 * doing, what is missing from their profile, and the jobs worth quoting on.
 *
 * Every number here is derived from a real column. The prototype also showed
 * profile views, a free-bid quota and a Pro tier; there is no view counter on
 * `providers`, and no paid tier exists in the product, so those are left out
 * rather than filled with plausible-looking numbers.
 */

const T = {
  greeting: { en: n => `Hello, ${n}`, si: n => `ආයුබෝවන්, ${n}` },
  sub:      { en: n => n === 1 ? '1 new project posted this week.' : `${n} new projects posted this week.`,
              si: n => `මෙම සතියේ නව ව්‍යාපෘති ${n} ක්.` },
  subNone:  { en: 'No new projects this week — check back soon.', si: 'මෙම සතියේ නව ව්‍යාපෘති නැත — නැවත බලන්න.' },
  quotes:   { en: 'Quotes sent',     si: 'යැවූ ලංසු' },
  won:      { en: 'Quotes accepted', si: 'පිළිගත් ලංසු' },
  winRate:  { en: 'Win rate',        si: 'ජයග්‍රහණ අනුපාතය' },
  strength: { en: 'Profile strength', si: 'පැතිකඩ ශක්තිය' },
  editCta:  { en: 'Complete my profile', si: 'පැතිකඩ සම්පූර්ණ කරන්න' },
  open:     { en: 'Open projects',   si: 'විවෘත ව්‍යාපෘති' },
  allJobs:  { en: 'All projects',    si: 'සියල්ල' },
  none:     { en: 'No open projects right now.', si: 'දැනට විවෘත ව්‍යාපෘති නොමැත.' },
  inYours:  { en: d => `in ${d}`,    si: d => `${d} හි` },
}

const FIELDS = [
  { key: 'profile_image', en: 'Add a profile photo',     si: 'පැතිකඩ ඡායාරූපයක් එක් කරන්න' },
  { key: 'description',   en: 'Describe your work',      si: 'ඔබේ සේවාව විස්තර කරන්න' },
  { key: 'services',      en: 'List the services you offer', si: 'ඔබ දෙන සේවා ලැයිස්තුගත කරන්න' },
  { key: 'service_areas', en: 'Set the areas you cover', si: 'ඔබ ආවරණය කරන ප්‍රදේශ' },
  { key: 'gallery',       en: 'Upload photos of past work', si: 'පෙර වැඩ ඡායාරූප එක් කරන්න' },
  { key: 'whatsapp',      en: 'Add your WhatsApp number', si: 'WhatsApp අංකය එක් කරන්න' },
]

const filled = (v) => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim())

export default function HomeProvider({ user, provider = null, initialJobs = [], newThisWeek = 0 }) {
  const lang = useLang()
  const t = (k, ...a) => {
    const v = T[k]?.[lang] ?? T[k]?.en
    return typeof v === 'function' ? v(...a.map(sinhalaText)) : v
  }

  const [stats, setStats] = useState(null)
  const name = provider?.name || user?.email?.split('@')[0] || ''

  const tasks = FIELDS.map(f => ({ ...f, done: filled(provider?.[f.key]) }))
  const strength = Math.round(tasks.filter(x => x.done).length / tasks.length * 100)
  const todo = tasks.filter(x => !x.done)

  // Win rate comes from the provider's own quotes, which only they can read.
  useEffect(() => {
    if (!user) return
    let alive = true
    supabase.from('bids').select('status').eq('user_id', user.id).then(({ data }) => {
      if (!alive || !data) return
      const sent = data.length
      const won = data.filter(b => b.status === 'accepted').length
      setStats({ sent, won, rate: sent ? Math.round(won / sent * 100) + '%' : '—' })
    })
    return () => { alive = false }
  }, [])

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '20px 16px 8px' }}>
      <h1 style={{ fontSize: 'clamp(23px,6.2vw,30px)', lineHeight: 1.12, margin: '0 0 4px' }}>{sinhalaText(t('greeting', name))}</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-3)' }}>
        {sinhalaText(newThisWeek > 0 ? t('sub', newThisWeek) : t('subNone'))}
      </p>

      <div className="th-stats" style={{ marginBottom: 22 }}>
        <div><b>{sinhalaText(stats ? stats.sent : '—')}</b><span>{sinhalaText(t('quotes'))}</span></div>
        <div><b>{sinhalaText(stats ? stats.won : '—')}</b><span>{sinhalaText(t('won'))}</span></div>
        <div><b>{sinhalaText(stats ? stats.rate : '—')}</b><span>{sinhalaText(t('winRate'))}</span></div>
      </div>

      {sinhalaText(todo.length > 0 && (
        <div className="th-card" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 9 }}>
            <span style={{ font: '700 13px var(--th-display)' }}>{sinhalaText(t('strength'))}</span>
            <span style={{ flex: 1 }} />
            <span style={{ font: '700 13px var(--th-display)', color: 'var(--th-forest)' }}>{sinhalaText(strength)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(11,11,11,0.1)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${strength}%`, borderRadius: 99, background: 'var(--terra)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 13 }}>
            {sinhalaText(todo.slice(0, 3).map(task => (
              <div key={task.key} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 12.5, color: 'var(--text-2)' }}>
                <span aria-hidden="true" style={{ font: '700 12px var(--th-display)', color: '#B0B0B0' }}>○</span>
                {sinhalaText(lang === 'si' ? task.si : task.en)}
              </div>
            )))}
          </div>
          <a href="/account?tab=profile" className="th-btn th-btn--ghost th-btn--block" style={{ minHeight: 42, fontSize: 13 }}>
            {sinhalaText(t('editCta'))}
          </a>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ font: '700 13px var(--th-display)' }}>{sinhalaText(t('open'))}</div>
        <span style={{ flex: 1 }} />
        <a href="/jobs" style={{ font: '600 12px var(--th-body)' }}>{sinhalaText(t('allJobs'))}</a>
      </div>
      {sinhalaText(initialJobs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sinhalaText(initialJobs.map(job => <JobCard key={job.id} job={job} variant="match" />))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '20px 0' }}>{sinhalaText(t('none'))}</p>
      ))}
    </div>
  )
}
