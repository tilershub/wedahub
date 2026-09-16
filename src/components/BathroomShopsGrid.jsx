import { si as sinhalaText } from '../lib/sinhala.js'
/* All constants and helpers outside component — avoids React island remount issues */

function waLead(phone, name) {
  const n = (phone || '').replace(/\D/g, '')
  const normalized = n.startsWith('94') ? n : '94' + n.replace(/^0/, '')
  const msg = encodeURIComponent(
    `ආයුබෝවන්! 🙏\n\nමම *වැඩHUB* (tilershub.lk) හරහා *${name}* සොයාගතිමි.\n\nඔබගේ සේවාව ගැන දැනගැනීමට කැමැත්තෙමි.\n\n📌 *වැඩHUB.lk* Lead\nස්තූතියි! 🏠`
  )
  return `https://wa.me/${normalized}?text=${msg}`
}

const TILE_KWS = ['tile', 'floor', 'wall', 'mosaic', 'porcelain', 'ceramic', 'granite', 'marble']

function shopTagline(services) {
  const s = (services || []).join(' ').toLowerCase()
  const hasTile = TILE_KWS.some(k => s.includes(k))
  return hasTile ? 'Tiles & Bathware' : 'Bathware Specialist'
}

function ShopCard({ shop, index }) {
  const waPhone = shop.whatsapp || shop.phone
  const waLink = waPhone ? waLead(waPhone, shop.name) : null
  const tagline = shopTagline(shop.services)
  const coverImg = shop.cover_image && !shop.cover_image.includes('picsum') ? shop.cover_image : null
  const chips = (shop.services || []).slice(0, 3)

  return (
    <div
      style={{ background: '#fff', border: '1px solid #E2E2E2', borderRadius: 20, overflow: 'hidden', display: 'flex', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)' }}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Left: photo */}
      <div style={{ width: 110, flexShrink: 0, position: 'relative', minHeight: 140 }}>
        {sinhalaText(coverImg ? (
          <img src={coverImg} alt={sinhalaText(shop.name)} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#F7F7F7', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 19px,#E2E2E2 19px,#E2E2E2 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,#E2E2E2 19px,#E2E2E2 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 26, opacity: 0.18 }}>🚿</span>
          </div>
        ))}
        {sinhalaText(shop.is_featured && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: '#D4A15E', color: '#0B0B0B', fontSize: 8, fontWeight: 700, letterSpacing: 0.5, padding: '3px 7px', borderRadius: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
            ⭐ ඉහළ ශ්‍රේණිය
          </div>
        ))}
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#8C8C8C', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
          {sinhalaText(tagline)}
        </div>
        <div style={{ fontFamily: "var(--th-display)", fontSize: 15, fontWeight: 700, color: '#0B0B0B', lineHeight: 1.25, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sinhalaText(shop.name)}
        </div>
        {sinhalaText(shop.description && (
          <p style={{ fontSize: 11, color: '#6E6E6E', lineHeight: 1.6, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
            {sinhalaText(shop.description)}
          </p>
        ))}
        {sinhalaText(chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {sinhalaText(chips.map(s => (
              <span key={s} style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#F5EEE2', color: '#8A6224', border: '1px solid #EBE2D2' }}>{sinhalaText(s)}</span>
            )))}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
          <div style={{ fontSize: 11, color: '#8C8C8C', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            📍 {sinhalaText(shop.city || shop.district)}
          </div>
          {sinhalaText(waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#0B0B0B', color: '#fff', borderRadius: 10, padding: '8px 13px', fontSize: 11, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              වෙළෙඳසැල බලන්න <span style={{ fontSize: 12 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BathroomShopsGrid({ shops }) {
  if (!shops || shops.length === 0) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
      {sinhalaText(shops.map((shop, i) => (
        <ShopCard key={shop.id} shop={shop} index={i} />
      )))}
    </div>
  )
}
