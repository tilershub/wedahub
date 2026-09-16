import { si as sinhalaText } from '../lib/sinhala.js'
import { useState } from 'react'
import { DISTRICT_INFO } from '../lib/locations.js'
import { useDistrict, setDistrict } from '../lib/district.js'

// The one place a user sets their location. Lives in the app bar so it is
// never repeated on individual pages.
export default function DistrictPicker({ tone = 'light' }) {
  const district = useDistrict()
  const [open, setOpen] = useState(false)

  const onLight = tone === 'light'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="ඔබේ දිස්ත්‍රික්කය වෙනස් කරන්න"
        className="district-pill"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          height: 34, padding: '0 12px', borderRadius: 20, cursor: 'pointer',
          border: `1.5px solid ${onLight ? 'var(--border)' : 'rgba(255,255,255,0.25)'}`,
          background: onLight ? '#fff' : 'rgba(255,255,255,0.1)',
          color: onLight ? 'var(--text-2)' : '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}
      >
        📍 {sinhalaText(district)} <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {sinhalaText(open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(11,11,11,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', width: '100%', maxHeight: '72vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: '20px 16px calc(20px + env(safe-area-inset-bottom,0px))' }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--border-dark)', borderRadius: 4, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>ඔබ සිටින්නේ කොහේද?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 16px' }}>
              ඔබ අසල ටයිල් කාර්මිකයන් සහ වෙළෙඳසැල් පෙන්වන්නෙමු.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
              {sinhalaText(DISTRICT_INFO.map(d => {
                const active = d.name === district
                return (
                  <button
                    key={d.slug}
                    onClick={() => { setDistrict(d.name); setOpen(false) }}
                    style={{
                      padding: '12px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${active ? 'var(--terra)' : 'var(--border)'}`,
                      background: active ? 'var(--terra-50)' : '#fff',
                      color: active ? 'var(--terra)' : 'var(--text)',
                      fontSize: 14, fontWeight: active ? 800 : 600, fontFamily: 'inherit',
                      minHeight: 48,
                    }}
                  >
                    {sinhalaText(d.name)}
                    <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)', marginTop: 2 }}>{sinhalaText(d.nameSi)}</div>
                  </button>
                )
              }))}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
