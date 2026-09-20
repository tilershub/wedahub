import { si as sinhalaText } from '../lib/sinhala.js'
import { buildWhatsAppLink } from '../lib/supabase'
import { supabase } from '../lib/supabase'

function AvatarDisplay({ avatarUrl, name, size = 56 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {sinhalaText(avatarUrl ? <img src={avatarUrl} alt={sinhalaText(name)} /> : initials)}
    </div>
  )
}

export function TilerCard({ tiler, onClick }) {
  const rateLabel = tiler.daily_rate_min && tiler.daily_rate_max
    ? `Rs. ${tiler.daily_rate_min.toLocaleString()} – ${tiler.daily_rate_max.toLocaleString()} / sqft`
    : 'සාකච්ඡා කළ හැකිය'

  const availColor = {
    available:   { bg: 'rgba(122,154,126,0.15)', border: 'rgba(122,154,126,0.3)',   text: 'var(--sage)' },
    busy:        { bg: 'rgba(201,168,76,0.15)',  border: 'rgba(201,168,76,0.3)',    text: 'var(--gold)' },
    unavailable: { bg: 'rgba(160,130,109,0.15)', border: 'rgba(160,130,109,0.3)',  text: 'var(--clay)' },
  }[tiler.availability] || {}
  const availLabel = { available: '✓ ලබාගත හැකිය', busy: '⏳ කාර්යබහුලයි', unavailable: '✗ නොමැත' }[tiler.availability]

  return (
    <div className="card" style={{ cursor: 'pointer', borderTop: '3px solid var(--terracotta)' }} onClick={() => onClick(tiler)}>
      {/* Card header */}
      <div style={{ background: 'linear-gradient(135deg, #2a2118 0%, #071827 100%)', padding: '22px 22px 18px', position: 'relative' }}>
        <span style={{
          position: 'absolute', top: 14, right: 14,
          background: availColor.bg, border: `1px solid ${availColor.border}`,
          color: availColor.text, fontSize: 10, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20
        }}>{sinhalaText(availLabel)}</span>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <AvatarDisplay avatarUrl={tiler.avatar_url} name={tiler.full_name} size={54} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: 3 }}>{sinhalaText(tiler.full_name)}</div>
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span>📍 {sinhalaText(tiler.city || tiler.district)}</span>
              {sinhalaText(tiler.experience_years > 1 && <><span>·</span><span>⏱ {sinhalaText(tiler.experience_years)} වසර</span></>)}
            </div>
            {sinhalaText(tiler.is_verified && (
              <span style={{ fontSize: 10, background: 'rgba(193,96,58,0.2)', color: 'var(--terracotta-muted)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                ✓ දක්ෂ
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 22px' }}>
        <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.8, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {sinhalaText(tiler.bio || 'ව්‍යාපෘතිය ගැන සාකච්ඡා කිරීමට සූදානම්.')}
        </p>
        {sinhalaText((tiler.services || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {sinhalaText((tiler.services || []).slice(0, 3).map((s, i) => (
              <span key={s} className={`chip ${i === 0 ? 'chip-terra' : 'chip-cream'}`}>{sinhalaText(s)}</span>
            )))}
            {sinhalaText((tiler.services || []).length > 3 && (
              <span className="chip chip-cream">+{sinhalaText(tiler.services.length - 3)}</span>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cream-dark)', paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>ගාස්තු / sqft</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>{sinhalaText(rateLabel)}</div>
          </div>
          <a
            href={buildWhatsAppLink(tiler.phone, tiler.full_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-wa"
            style={{ fontSize: 12, padding: '9px 14px' }}
            onClick={e => {
              e.stopPropagation()
              supabase.from('contact_events').insert({ tiler_id: tiler.id }).then(() => {})
            }}
          >
            💬 සම්බන්ධ වන්න
          </a>
        </div>
      </div>
    </div>
  )
}

export function TilerModal({ tiler, onClose }) {
  const availLabel = { available: '✓ දැන් ලබාගත හැකිය', busy: '⏳ දැනට කාර්යබහුලයි', unavailable: '✗ දැනට නොමැත' }[tiler.availability]

  function AvatarDisplay({ avatarUrl, name, size }) {
    const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {sinhalaText(avatarUrl ? <img src={avatarUrl} alt={sinhalaText(name)} /> : initials)}
      </div>
    )
  }

  const infoItems = [
    tiler.experience_years > 1 && { label: 'අත්දැකීම', val: `⏱ ${tiler.experience_years} වසර` },
    (tiler.daily_rate_min && tiler.daily_rate_max) && { label: 'ගාස්තු / sqft', val: `Rs. ${tiler.daily_rate_min.toLocaleString()} – ${tiler.daily_rate_max.toLocaleString()}` },
    tiler.total_jobs > 0 && { label: 'සම්පූර්ණ කළ', val: `${tiler.total_jobs}+ ව්‍යාපෘති` },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ background: 'linear-gradient(135deg, #071827 0%, #0B2A4A 100%)', padding: '28px 28px 24px', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            <AvatarDisplay avatarUrl={tiler.avatar_url} name={tiler.full_name} size={76} />
            <div>
              <div style={{ fontFamily: "var(--th-display)", fontSize: 24, color: 'var(--white)', fontWeight: 700, marginBottom: 4 }}>{sinhalaText(tiler.full_name)}</div>
              <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.45)', marginBottom: 10 }}>📍 {sinhalaText(tiler.city || tiler.district)} · {sinhalaText(tiler.district)} දිස්ත්‍රික්කය</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: 'rgba(122,154,126,0.15)', border: '1px solid rgba(122,154,126,0.3)', color: 'var(--sage-light)', padding: '3px 12px', borderRadius: 20 }}>
                  {sinhalaText(availLabel)}
                </span>
                {sinhalaText(tiler.is_verified && (
                  <span style={{ fontSize: 11, background: 'rgba(193,96,58,0.2)', color: 'var(--terracotta-muted)', padding: '3px 12px', borderRadius: 20 }}>
                    ✓ දක්ෂ
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: '24px 28px 28px' }}>
          {sinhalaText(tiler.bio && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>ගැන</div>
              <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.9 }}>{sinhalaText(tiler.bio)}</p>
            </div>
          ))}

          {sinhalaText((tiler.services || []).length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>සේවා</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sinhalaText((tiler.services || []).map(s => (
                  <span key={s} className="chip chip-terra" style={{ fontSize: 12, padding: '5px 14px' }}>{sinhalaText(s)}</span>
                )))}
              </div>
            </div>
          ))}

          {sinhalaText(infoItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10 }}>
                {sinhalaText(infoItems.map(item => (
                  <div key={item.label} style={{ background: 'var(--cream)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{sinhalaText(item.label)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{sinhalaText(item.val)}</div>
                  </div>
                )))}
              </div>
            </div>
          ))}

          <a
            href={buildWhatsAppLink(tiler.phone, tiler.full_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-wa btn-full btn-lg"
            onClick={() => supabase.from('contact_events').insert({ tiler_id: tiler.id }).then(() => {})}
          >
            <span style={{ fontSize: 22 }}>💬</span>
            WhatsApp හරහා සම්බන්ධ වන්න
          </a>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-light)', marginTop: 10 }}>
            ඔබ ළඟා වූ විට වැඩHUB.lk හරහා ආ බව ස්වයංක්‍රීයව ටයිලර්ට දැනුම් දෙනු ඇත
          </p>
        </div>
      </div>
    </div>
  )
}
