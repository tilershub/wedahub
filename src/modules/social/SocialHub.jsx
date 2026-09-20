import { si as sinhalaText } from '../../lib/sinhala.js'
import { useState } from 'react'
import ContentStudio   from './components/ContentStudio.jsx'
import ContentCalendar from './components/ContentCalendar.jsx'
import PostQueue       from './components/PostQueue.jsx'

const NAVY   = '#071827'
const GOLD   = '#E8B341'
const ORANGE = '#D6BE84'

const SUBTABS = [
  { key: 'studio',   label: '✨ Studio',   desc: 'Generate AI posts' },
  { key: 'calendar', label: '📅 Calendar', desc: '7-day planning grid' },
  { key: 'queue',    label: '📤 Queue',    desc: 'Manage & push to sheet' },
]

export default function SocialHub() {
  const [subtab, setSubtab] = useState('studio')

  return (
    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#071827', margin: 0 }}>📣 සමාජ මාධ්‍ය මධ්‍යස්ථානය</h2>
          <span style={{ fontSize: 11, fontWeight: 700, background: GOLD, color: '#071827', padding: '3px 10px', borderRadius: 20 }}>අලුත්</span>
        </div>
        <p style={{ fontSize: 13, color: '#6B7076', margin: 0 }}>
          ප්‍රචාරණ දෙකක් සඳහා සමාජ අන්තර්ගතය සාදා, සැලසුම් කර පෝලිමට එක් කරන්න —
          <span style={{ color: '#0B2A4A', fontWeight: 600 }}> 🏠 නිවාස හිමියන් ආකර්ෂණය කරන්න</span> ව්‍යාපෘති පළ කිරීමට සහ
          <span style={{ color: ORANGE, fontWeight: 600 }}> 🔨 ටයිල් කාර්මිකයන් ආකර්ෂණය කරන්න</span> එක්වී මිල ගණන් දීමට. Make.com මගින් <strong>සූදානම්</strong> පළ කිරීම් Facebook සහ Instagram වෙත ස්වයංක්‍රීයව යවයි.
        </p>
      </div>

      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '2px solid #F7F3E8', paddingBottom: 0 }}>
        {sinhalaText(SUBTABS.map(t => (
          <button key={t.key} onClick={() => setSubtab(t.key)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: subtab === t.key ? `2.5px solid ${NAVY}` : '2.5px solid transparent',
              marginBottom: -2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: subtab === t.key ? NAVY : '#8A8F95', transition: 'all 0.12s',
            }}>
            {sinhalaText(t.label)}
            <span style={{ fontSize: 10, fontWeight: 400, color: '#8A8F95', display: 'block', marginTop: 1 }}>{sinhalaText(t.desc)}</span>
          </button>
        )))}
      </div>

      {/* Sub-tab content */}
      <div>
        {sinhalaText(subtab === 'studio'   && <ContentStudio />)}
        {sinhalaText(subtab === 'calendar' && <ContentCalendar />)}
        {sinhalaText(subtab === 'queue'    && <PostQueue />)}
      </div>
    </div>
  )
}
