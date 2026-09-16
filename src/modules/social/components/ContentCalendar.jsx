import { si as sinhalaText } from '../../../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { planWeek, ANGLES } from '../lib/claudeApi.js'
import { getQueue, saveToLocalQueue } from '../lib/contentQueue.js'
import { useSupabaseStats } from '../hooks/useSupabaseStats.js'

const NAVY   = '#0B0B0B'
const GOLD   = '#D4A15E'
const ORANGE = '#D4A15E'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDates() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`
}

function CampaignDot({ campaign }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: campaign === 'user' ? '#8A6224' : ORANGE, flexShrink: 0,
    }} />
  )
}

function PostSlot({ post }) {
  const iUser = post.campaign === 'user'
  return (
    <div style={{
      padding: '6px 8px', borderRadius: 8, marginBottom: 4, fontSize: 11,
      background: iUser ? '#F5EEE2' : '#F5EEE2',
      border: `1px solid ${iUser ? '#E8DCC6' : '#F0EADF'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <CampaignDot campaign={post.campaign} />
        <span style={{ fontWeight: 700, color: iUser ? '#5E3F14' : '#8A6224' }}>
          {sinhalaText(post.suggested_time || post.time || '—')}
        </span>
        <span style={{ color: '#8C8C8C', marginLeft: 'auto' }}>{sinhalaText(post.platform || '')}</span>
      </div>
      <div style={{ color: '#4A4A4A', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {sinhalaText(post.note || post.caption?.slice(0, 60) || '—')}
      </div>
      <div style={{ marginTop: 3 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
          background: post.status === 'POSTED' ? '#E9F1EC' : post.status === 'READY' ? '#F2EADC' : '#F2F2F2',
          color: post.status === 'POSTED' ? '#22513B' : post.status === 'READY' ? '#5E3F14' : '#6E6E6E',
        }}>{sinhalaText(post.status || 'PLAN')}</span>
      </div>
    </div>
  )
}

function AddSlotModal({ date, onAdd, onClose }) {
  const [campaign, setCampaign] = useState('user')
  const [format,   setFormat]   = useState('single')
  const [platform, setPlatform] = useState('FB+IG')
  const [angle,    setAngle]    = useState('social_proof')
  const [time,     setTime]     = useState('09:00')
  const [note,     setNote]     = useState('')

  function handleAdd() {
    onAdd({ date, campaign, format, platform, angle, suggested_time: time, note, status: 'PLAN' })
    onClose()
  }

  const sel = v => ({ padding: '7px 10px', border: '1.5px solid #E2E2E2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', width: '100%', background: '#fff', boxSizing: 'border-box' })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0B', marginBottom: 16 }}>වේලාවක් එක් කරන්න — {sinhalaText(formatDate(date))}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>ප්‍රචාරණය</div>
            <select value={campaign} onChange={e => { setCampaign(e.target.value); setAngle(ANGLES[e.target.value][0].value) }} style={sel()}>
              <option value="user">🏠 පරිශීලක</option>
              <option value="provider">🔨 සේවා සපයන්නා</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>වේලාව</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={sel()} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>ආකෘතිය</div>
            <select value={format} onChange={e => setFormat(e.target.value)} style={sel()}>
              <option value="single">🖼 තනි රූපය</option>
              <option value="carousel">🎴 රූප පෙළ</option>
              <option value="reel">🎬 කෙටි වීඩියෝව</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>වේදිකාව</div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={sel()}>
              <option value="FB+IG">📱 FB + IG</option>
              <option value="Facebook">📘 Facebook</option>
              <option value="Instagram">📸 Instagram</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>ප්‍රවේශය</div>
          <select value={angle} onChange={e => setAngle(e.target.value)} style={sel()}>
            {sinhalaText(ANGLES[campaign].map(a => <option key={a.value} value={a.value}>{sinhalaText(a.label)}</option>))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4A4A4A', textTransform: 'uppercase', marginBottom: 5 }}>සටහන (අත්‍යවශ්‍ය නොවේ)</div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="කෙටි අන්තර්ගත අදහසක්…"
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E2E2E2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleAdd}
            style={{ flex: 1, padding: '10px', background: NAVY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            දිනදර්ශනයට එක් කරන්න
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 16px', background: '#ECECEC', color: '#4A4A4A', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            අවලංගු කරන්න
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContentCalendar() {
  const { stats } = useSupabaseStats()
  const [weekDates, setWeekDates]   = useState(getWeekDates)
  const [queue,     setQueue]       = useState([])
  const [planning,  setPlanning]    = useState(false)
  const [planCampaign, setPlanCampaign] = useState('user')
  const [planResult,   setPlanResult]   = useState([])
  const [planError,    setPlanError]    = useState(null)
  const [addSlotDay,   setAddSlotDay]   = useState(null)

  useEffect(() => { setQueue(getQueue()) }, [])

  function refreshQueue() { setQueue(getQueue()) }

  async function handleAutoPlan() {
    setPlanning(true); setPlanError(null); setPlanResult([])
    try {
      const result = await planWeek({ campaign: planCampaign, stats })
      setPlanResult(result)
    } catch (e) {
      setPlanError(e.message)
    }
    setPlanning(false)
  }

  function acceptPlanSlot(slot) {
    saveToLocalQueue({ ...slot, status: 'PLAN' })
    setPlanResult(prev => prev.filter(s => s.date !== slot.date || s.time !== slot.time))
    refreshQueue()
  }

  function handleAddSlot(slot) {
    saveToLocalQueue(slot)
    refreshQueue()
  }

  // Group queue items and plan results by date
  function postsForDate(date) {
    const q = queue.filter(p => p.date === date)
    const p = planResult.filter(p => p.date === date)
    return { queued: q, planned: p }
  }

  const prevWeek = () => {
    setWeekDates(prev => prev.map(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n.toISOString().slice(0, 10) }))
  }
  const nextWeek = () => {
    setWeekDates(prev => prev.map(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n.toISOString().slice(0, 10) }))
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>

      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevWeek}
            style={{ padding: '7px 12px', background: '#ECECEC', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#4A4A4A' }}>←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0B', minWidth: 180, textAlign: 'center' }}>
            {sinhalaText(formatDate(weekDates[0]))} – {sinhalaText(formatDate(weekDates[6]))}
          </span>
          <button onClick={nextWeek}
            style={{ padding: '7px 12px', background: '#ECECEC', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#4A4A4A' }}>→</button>
          <button onClick={() => setWeekDates(getWeekDates())}
            style={{ padding: '7px 12px', background: '#ECECEC', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#6E6E6E' }}>මෙම සතිය</button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={planCampaign} onChange={e => setPlanCampaign(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #E2E2E2', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', background: '#fff' }}>
            <option value="user">🏠 පරිශීලක ප්‍රචාරණය</option>
            <option value="provider">🔨 සේවා සපයන්නන්ගේ ප්‍රචාරණය</option>
          </select>
          <button onClick={handleAutoPlan} disabled={planning}
            style={{ padding: '8px 16px', background: planning ? '#8C8C8C' : GOLD, color: '#0B0B0B', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: planning ? 'not-allowed' : 'pointer' }}>
            {sinhalaText(planning ? '⏳ Planning…' : '🤖 Auto-plan Week')}
          </button>
        </div>
      </div>

      {sinhalaText(planError && (
        <div style={{ background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#5E3F14' }}>
          ⚠️ {sinhalaText(planError)}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 11, color: '#6E6E6E' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CampaignDot campaign="user" /> පරිශීලක ප්‍රචාරණය</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CampaignDot campaign="provider" /> සේවා සපයන්නන්ගේ ප්‍රචාරණය</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#D4A15E', display: 'inline-block' }} /> AI යෝජනාව
        </span>
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
        {sinhalaText(weekDates.map((date, i) => {
          const { queued, planned } = postsForDate(date)
          const isToday = date === today
          return (
            <div key={date} style={{
              background: '#fff', border: `1px solid ${isToday ? NAVY : '#E4E4E4'}`,
              borderRadius: 12, padding: '10px 8px', minHeight: 180,
            }}>
              {/* Day header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? NAVY : '#8C8C8C', textTransform: 'uppercase' }}>{sinhalaText(DAY_LABELS[i])}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? NAVY : '#0B0B0B', lineHeight: 1 }}>{sinhalaText(formatDate(date).split(' ')[0])}</div>
                  <div style={{ fontSize: 10, color: '#8C8C8C' }}>{sinhalaText(formatDate(date).split(' ')[1])}</div>
                </div>
                {sinhalaText(isToday && <span style={{ fontSize: 9, fontWeight: 700, background: NAVY, color: '#fff', padding: '2px 7px', borderRadius: 20 }}>අද</span>)}
              </div>

              {/* Queued posts */}
              {sinhalaText(queued.map((p, j) => <PostSlot key={j} post={p} />))}

              {/* AI suggestions */}
              {sinhalaText(planned.map((p, j) => (
                <div key={j} style={{
                  padding: '6px 8px', borderRadius: 8, marginBottom: 4, fontSize: 11,
                  background: '#F5EEE2', border: `1px dashed ${GOLD}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 10 }}>🤖</span>
                    <span style={{ fontWeight: 700, color: '#0B0B0B' }}>{sinhalaText(p.time)}</span>
                  </div>
                  <div style={{ color: '#242424', lineHeight: 1.4, marginBottom: 5 }}>{sinhalaText(p.note)}</div>
                  <button onClick={() => acceptPlanSlot(p)}
                    style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: GOLD, color: '#0B0B0B', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    + එක් කරන්න
                  </button>
                </div>
              )))}

              {/* Add slot button */}
              <button onClick={() => setAddSlotDay(date)}
                style={{ width: '100%', padding: '5px', background: 'transparent', border: '1px dashed #E2E2E2', borderRadius: 8, fontSize: 11, color: '#8C8C8C', cursor: 'pointer', marginTop: 4 }}>
                + වේලාවක් එක් කරන්න
              </button>
            </div>
          )
        }))}
      </div>

      {/* Add Slot Modal */}
      {sinhalaText(addSlotDay && <AddSlotModal date={addSlotDay} onAdd={handleAddSlot} onClose={() => setAddSlotDay(null)} />)}
    </div>
  )
}
