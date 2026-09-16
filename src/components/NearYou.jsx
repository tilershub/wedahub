import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useDistrict } from '../lib/district.js'
import { useLang } from '../lib/useLang.js'
import CoverImage from './CoverImage.jsx'

const T = {
  topRated: { en: 'Top rated',        si: 'ඉහළම ශ්‍රේණිගත' },
  shops:    { en: 'Tile shops',       si: 'ටයිල් සාප්පු' },
  island:   { en: 'across Sri Lanka', si: 'ලංකාව පුරා' },
  seeAll:   { en: 'See all',          si: 'සියල්ල' },
  postCta:  { en: 'Post your job free', si: 'නොමිලේ රැකියාව පලකරන්න' },
  noShops:  {
    en: d => `No tile shops listed in ${d} yet.`,
    si: d => `${d} හි ටයිල් සාප්පු තවම ලැයිස්තුගත කර නැත.`,
  },
  noPros:   {
    en: d => `No providers listed in ${d} yet — post your job and nearby pros will quote.`,
    si: d => `${d} හි සේවා දායකයන් තවම නැත — රැකියාව පලකරන්න, ආසන්නයේ අය ලංසු දෙනු ඇත.`,
  },
}

const SHOP_TYPES = ['tile_shop', 'bathroom_shop', 'supplier', 'brand_dealer', 'tool_supplier', 'workshop']

const AVATAR_COLORS = ['#8A6224', '#2F6B4F', '#6B4A18', '#285C43', '#8A6224', '#2F6B4F']
function avatarColor(name) {
  let h = 0
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name) {
  return (name || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}

function Card({ p }) {
  const rating = Number(p.avg_rating) || 0
  const reviews = p.review_count || 0
  const src = p.profile_image || p.cover_image
  return (
    <a
      href={`/providers/${p.slug}`}
      style={{
        flex: '0 0 auto', width: 172, background: '#fff', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <CoverImage src={src} alt="" loading="lazy" width="172" height="104"
        style={{ width: '100%', height: 104, objectFit: 'cover', background: 'var(--surface-3)' }}
        fallback={
          <div style={{ height: 104, background: avatarColor(p.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30, fontWeight: 800 }}>
            {sinhalaText(initials(p.name))}
          </div>
        } />
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 34 }}>
          {sinhalaText(p.name)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12 }}>
          {sinhalaText(reviews > 0 ? (
            <>
              <span style={{ color: '#F59E0B' }}>★</span>
              <strong style={{ color: 'var(--text)' }}>{sinhalaText(rating.toFixed(1))}</strong>
              <span style={{ color: 'var(--text-4)' }}>({sinhalaText(reviews)})</span>
            </>
          ) : (
            <span style={{ color: 'var(--text-4)' }}>නව</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>📍 {sinhalaText(p.city || p.district)}</div>
      </div>
    </a>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', gap: 10, overflow: 'hidden', padding: '0 16px' }}>
      {sinhalaText([0, 1, 2].map(i => (
        <div key={i} style={{ flex: '0 0 auto', width: 172, height: 190, background: 'var(--surface-3)', borderRadius: 14 }} />
      )))}
    </div>
  )
}

/**
 * Providers in the user's district, best-rated first.
 * `variant="shops"` switches to tile shops / suppliers.
 */
export default function NearYou({ variant = 'pros', initial = [] }) {
  const district = useDistrict()
  const lang = useLang()
  const t = (k, ...a) => {
    const v = T[k]?.[lang] ?? T[k]?.en
    return typeof v === 'function' ? v(...a.map(sinhalaText)) : v
  }
  const [rows, setRows] = useState(initial)
  const [loading, setLoading] = useState(false)
  // True when nobody serves the chosen district and we widened to the whole
  // island — the heading must not claim these are local.
  const [widened, setWidened] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabase
        .from('providers')
        .select('id,name,slug,city,district,service_areas,provider_type,avg_rating,review_count,profile_image,cover_image')
        .eq('status', 'active')
        .order('avg_rating', { ascending: false })
        .order('review_count', { ascending: false })
        .limit(60)
      q = variant === 'shops' ? q.in('provider_type', SHOP_TYPES) : q.not('provider_type', 'in', `(${SHOP_TYPES.join(',')})`)
      const { data } = await q
      if (cancelled) return
      // A provider counts as local if their district, city or declared
      // service areas mention the selected district.
      const local = (data || []).filter(p =>
        p.district === district ||
        (p.service_areas || []).includes(district) ||
        (p.city || '').toLowerCase().includes(district.toLowerCase())
      )
      setWidened(local.length === 0)
      setRows((local.length > 0 ? local : (data || [])).slice(0, 10))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [district, variant])

  const where = widened ? t('island') : (lang === 'si' ? `${district} හි` : `in ${district}`)
  const title = variant === 'shops' ? `🏪 ${t('shops')} ${where}` : `⭐ ${t('topRated')} ${where}`
  const href = variant === 'shops' ? '/tile' : '/providers'

  if (loading && rows.length === 0) return (
    <section style={{ padding: '20px 0 4px' }}>
      <h2 style={{ padding: '0 16px 12px', fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{sinhalaText(title)}</h2>
      <Skeleton />
    </section>
  )

  if (rows.length === 0) return (
    <section style={{ padding: '20px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px' }}>{sinhalaText(title)}</h2>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 12px', lineHeight: 1.6 }}>
          {sinhalaText(variant === 'shops' ? t('noShops', district) : t('noPros', district))}
        </p>
        <a href="/post-project" className="btn btn-terra btn-sm">{sinhalaText(t('postCta'))}</a>
      </div>
    </section>
  )

  return (
    <section style={{ padding: '20px 0 4px' }}>
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{sinhalaText(title)}</h2>
        <a href={href} style={{ fontSize: 13, fontWeight: 600, color: 'var(--terra)', textDecoration: 'none', whiteSpace: 'nowrap' }}>{sinhalaText(t('seeAll'))} ›</a>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {sinhalaText(rows.map(p => <Card key={p.id} p={p} />))}
      </div>
    </section>
  )
}
