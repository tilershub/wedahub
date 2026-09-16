import { si as sinhalaText } from '../../../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { getQueue, updateStatus, removeFromQueue, copyRowToClipboard, copyAllToClipboard } from '../lib/contentQueue.js'

const NAVY   = '#0B0B0B'
const GOLD   = '#D4A15E'
const ORANGE = '#D4A15E'
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1umnpXIFhPT8-D31_dbiS_Iz5Ebw9ZfexwrBPD7YPENw/edit'

const STATUS_COLORS = {
  DRAFT:  { bg: '#F2F2F2', color: '#4A4A4A' },
  PLAN:   { bg: '#F2F2F2', color: '#4A4A4A' },
  READY:  { bg: '#F2EADC', color: '#5E3F14' },
  POSTED: { bg: '#E9F1EC', color: '#22513B' },
}

function StatusBadge({ status }) {
  const { bg, color } = STATUS_COLORS[status] || STATUS_COLORS.DRAFT
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>
      {sinhalaText(status || 'DRAFT')}
    </span>
  )
}

function CampaignBadge({ campaign }) {
  const isUser = campaign === 'user'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: isUser ? '#F5EEE2' : '#F5EEE2', color: isUser ? '#5E3F14' : '#8A6224',
    }}>
      {sinhalaText(isUser ? '🏠 User' : '🔨 Provider')}
    </span>
  )
}

export default function PostQueue() {
  const [queue,      setQueue]      = useState([])
  const [filter,     setFilter]     = useState('ALL')
  const [copyAllMsg, setCopyAllMsg] = useState('')
  const [copiedId,   setCopiedId]   = useState(null)

  function refresh() { setQueue(getQueue()) }
  useEffect(() => { refresh() }, [])

  function handleStatus(id, status) { updateStatus(id, status); refresh() }
  function handleDelete(id) { if (confirm(sinhalaText('Remove this post from the queue?'))) { removeFromQueue(id); refresh() } }

  async function handleCopyRow(post) {
    await copyRowToClipboard(post)
    setCopiedId(post.id); setTimeout(() => setCopiedId(null), 1500)
  }

  async function handleCopyAll() {
    await copyAllToClipboard(filtered)
    setCopyAllMsg('Copied!'); setTimeout(() => setCopyAllMsg(''), 1800)
  }

  const filtered = filter === 'ALL' ? queue : queue.filter(p => (p.status || 'DRAFT') === filter)

  const counts = {
    ALL:    queue.length,
    DRAFT:  queue.filter(p => (p.status || 'DRAFT') === 'DRAFT' || p.status === 'PLAN').length,
    READY:  queue.filter(p => p.status === 'READY').length,
    POSTED: queue.filter(p => p.status === 'POSTED').length,
  }

  const th = { fontSize: 11, fontWeight: 700, color: '#6E6E6E', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #ECECEC', whiteSpace: 'nowrap' }
  const td = { padding: '10px 12px', fontSize: 13, color: '#4A4A4A', borderBottom: '1px solid #F7F7F7', verticalAlign: 'top' }

  return (
    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0B' }}>පළ කිරීම් පෝලිම</div>
          <div style={{ fontSize: 12, color: '#6E6E6E', marginTop: 3 }}>{sinhalaText(queue.length)} පළ කිරීම{sinhalaText(queue.length !== 1 ? 's' : '')} පෝලිමේ</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleCopyAll} disabled={filtered.length === 0}
            style={{ padding: '8px 16px', background: GOLD, color: '#0B0B0B', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: filtered.length === 0 ? 0.5 : 1 }}>
            {sinhalaText(copyAllMsg || '📋 Copy All to Sheet')}
          </button>
          <a href={SHEET_URL} target="_blank" rel="noreferrer"
            style={{ padding: '8px 16px', background: NAVY, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            📊 Google පැතුරුම්පත විවෘත කරන්න ↗
          </a>
        </div>
      </div>

      {/* Sheet info banner */}
      <div style={{ background: '#F5EEE2', border: '1px solid #E8DCC6', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#5E3F14', lineHeight: 1.7 }}>
        📌 <strong>වැඩ පිළිවෙළ:</strong> පේළි පිටපත් කර මෙයට අලවන්න →{sinhalaText(' ')}
        <a href={SHEET_URL} target="_blank" rel="noreferrer" style={{ color: '#5E3F14', fontWeight: 700 }}>Google පැතුරුම්පත ↗</a>
        {sinhalaText(' ')}→ තත්ත්වය මෙසේ සකසන්න: <strong>සූදානම්</strong> → Make.com සෑම පැයකම Facebook සහ Instagram වෙත ස්වයංක්‍රීයව පළ කරයි.
        <br />පැතුරුම්පත් තීරු: <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 4 }}>date · time · platform · campaign · caption · image_url · status · post_id</code>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {sinhalaText([['ALL', 'All'], ['DRAFT', 'Draft / Plan'], ['READY', 'Ready'], ['POSTED', 'Posted']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: filter === key ? NAVY : '#ECECEC', color: filter === key ? '#fff' : '#4A4A4A',
            }}>
            {sinhalaText(label)} {sinhalaText(counts[key] != null && <span style={{ opacity: 0.7 }}>({sinhalaText(counts[key])})</span>)}
          </button>
        )))}
      </div>

      {/* Table */}
      {sinhalaText(filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8C8C8C' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>පෝලිමේ පළ කිරීම් නැත</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>නිර්මාණාගාරයේ අන්තර්ගතය සාදා මෙහි සුරකින්න.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {sinhalaText(['Date', 'Time', 'Campaign', 'Platform', 'Format', 'Caption', 'Status', 'Actions'].map(h => (
                    <th key={h} style={th}>{sinhalaText(h)}</th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {sinhalaText(filtered.map(post => (
                  <tr key={post.id}>
                    <td style={td}>{sinhalaText(post.date || '—')}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{sinhalaText(post.suggested_time || post.time || '—')}</td>
                    <td style={td}><CampaignBadge campaign={post.campaign} /></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{sinhalaText(post.platform || '—')}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {sinhalaText(post.format === 'carousel' ? '🎴 Carousel' : post.format === 'reel' ? '🎬 Reel' : '🖼 Single')}
                    </td>
                    <td style={{ ...td, maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: '#4A4A4A' }}>
                        {sinhalaText(post.caption || post.note || '—')}
                      </div>
                    </td>
                    <td style={td}>
                      <select value={post.status || 'DRAFT'} onChange={e => handleStatus(post.id, e.target.value)}
                        style={{ padding: '4px 8px', border: '1.5px solid #E2E2E2', borderRadius: 7, fontSize: 12, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                        <option value="DRAFT">කෙටුම්පත</option>
                        <option value="PLAN">සැලසුම</option>
                        <option value="READY">සූදානම්</option>
                        <option value="POSTED">පළ කර ඇත</option>
                      </select>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleCopyRow(post)} title="පේළිය TSV ලෙස පිටපත් කරන්න"
                          style={{ padding: '5px 10px', background: '#ECECEC', color: '#4A4A4A', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {sinhalaText(copiedId === post.id ? '✓' : '📋')}
                        </button>
                        {sinhalaText(post.status !== 'POSTED' && (
                          <button onClick={() => handleStatus(post.id, 'POSTED')} title="පළ කළ බව සලකුණු කරන්න"
                            style={{ padding: '5px 10px', background: '#E9F1EC', color: '#22513B', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            ✓ පළ කළා
                          </button>
                        ))}
                        <button onClick={() => handleDelete(post.id)} title="ඉවත් කරන්න"
                          style={{ padding: '5px 10px', background: '#FBEDEB', color: '#5E3F14', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {sinhalaText(filtered.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={handleCopyAll}
            style={{ padding: '10px 20px', background: GOLD, color: '#0B0B0B', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {sinhalaText(copyAllMsg || `📋 පේළි ${filtered.length} ක් පත්‍රයට පිටපත් කරන්න`)}
          </button>
          <a href={SHEET_URL} target="_blank" rel="noreferrer"
            style={{ padding: '10px 20px', background: NAVY, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            📊 Google පැතුරුම්පත විවෘත කරන්න ↗
          </a>
        </div>
      ))}
    </div>
  )
}
