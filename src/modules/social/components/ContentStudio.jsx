import { si as sinhalaText } from '../../../lib/sinhala.js'
import { useState } from 'react'
import { generatePosts, ANGLES } from '../lib/claudeApi.js'
import { saveToLocalQueue, copyRowToClipboard, copyAllToClipboard } from '../lib/contentQueue.js'
import { useSupabaseStats } from '../hooks/useSupabaseStats.js'

const NAVY  = '#071827'
const GOLD  = '#E8B341'
const ORANGE = '#D6BE84'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function lbl(extra = {}) {
  return { display: 'block', fontSize: 11, fontWeight: 700, color: '#3A4046', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7, ...extra }
}
function card(extra = {}) {
  return { background: '#fff', border: '1px solid #E7E2D9', borderRadius: 14, padding: 20, ...extra }
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {sinhalaText(options.map(o => {
        const active = value === o.value
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: active ? NAVY : '#F7F3E8', color: active ? '#fff' : '#3A4046', transition: 'all 0.12s',
          }}>{sinhalaText(o.label)}</button>
        )
      }))}
    </div>
  )
}

function StatPill({ label, value, loading }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 18px', background: '#FAF8F2', borderRadius: 12, border: '1px solid #EAE4D7' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, lineHeight: 1 }}>{sinhalaText(loading ? '…' : value)}</div>
      <div style={{ fontSize: 10, color: '#8A8F95', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sinhalaText(label)}</div>
    </div>
  )
}

// ─── Single generated post card ───────────────────────────────────────────────

function PostCard({ post, index, campaign, onSave, onDiscard, onRegenerate, saved, regenerating }) {
  const [caption, setCaption]   = useState(post.caption || '')
  const [date,    setDate]      = useState(post.date || '')
  const [time,    setTime]      = useState(post.suggested_time || '09:00')
  const [copied,  setCopied]    = useState(false)

  const iUser = campaign === 'user'
  const campColor = iUser ? '#0B2A4A' : ORANGE
  const campLabel = iUser ? '🏠 User' : '🔨 Provider'
  const fmtLabel  = post.format === 'carousel' ? '🎴 Carousel' : post.format === 'reel' ? '🎬 Reel' : '🖼 Single'

  async function handleCopy() {
    await copyRowToClipboard({ ...post, caption, date, suggested_time: time })
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={card({ marginBottom: 16 })}>
      {/* Header badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: campColor + '18', color: campColor }}>{sinhalaText(campLabel)}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#F7F3E8', color: '#6B7076' }}>{sinhalaText(fmtLabel)}</span>
        <span style={{ fontSize: 11, color: '#8A8F95', marginLeft: 'auto' }}>#{sinhalaText(index + 1)}</span>
      </div>

      {/* Hook */}
      {sinhalaText(post.hook && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#071827', background: '#F7F3E8', borderRadius: 8, padding: '8px 12px', marginBottom: 10, borderLeft: `3px solid ${NAVY}` }}>
          🪝 {sinhalaText(post.hook)}
        </div>
      ))}

      {/* Caption — editable */}
      <div style={lbl({ marginBottom: 6 })}>සටහන</div>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={5}
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #EAE4D7', borderRadius: 10, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6, marginBottom: 10 }} />

      {/* CTA */}
      {sinhalaText(post.cta && (
        <div style={{ fontSize: 12, color: '#3A4046', marginBottom: 8 }}>
          <strong>ක්‍රියා බොත්තම:</strong> {sinhalaText(post.cta)}
        </div>
      ))}

      {/* Image brief */}
      {sinhalaText(post.image_description && (
        <div style={{ fontSize: 12, color: '#6B7076', background: '#FAF8F2', borderRadius: 8, padding: '8px 12px', marginBottom: 10, lineHeight: 1.6 }}>
          🖼 <strong>රූප විස්තරය:</strong> {sinhalaText(post.image_description)}
        </div>
      ))}

      {/* Carousel slides */}
      {sinhalaText(post.slides?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={lbl({ marginBottom: 8 })}>ස්ලයිඩ්</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {sinhalaText(post.slides.map((s, i) => (
              <div key={i} style={{ flex: '0 0 150px', border: '1px solid #EAE4D7', borderRadius: 10, padding: '10px 11px', fontSize: 11 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8A8F95', textTransform: 'uppercase', marginBottom: 4 }}>ස්ලයිඩය {sinhalaText(i + 1)}</div>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: 3, lineHeight: 1.3 }}>{sinhalaText(s.headline)}</div>
                <div style={{ color: '#6B7076', lineHeight: 1.4, marginBottom: 4 }}>{sinhalaText(s.body)}</div>
                {sinhalaText(s.design_note && <div style={{ fontSize: 10, color: '#8A8F95', fontStyle: 'italic' }}>{sinhalaText(s.design_note)}</div>)}
              </div>
            )))}
          </div>
        </div>
      ))}

      {/* Reel script */}
      {sinhalaText(post.script && (
        <div style={{ fontSize: 12, color: '#3A4046', background: '#FAF8F2', borderRadius: 8, padding: '10px 12px', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          🎬 <strong>පිටපත:</strong><br />{sinhalaText(post.script)}
        </div>
      ))}

      {/* Date / Time */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={lbl({ marginBottom: 5 })}>දිනය</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #EAE4D7', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={lbl({ marginBottom: 5 })}>වේලාව</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #EAE4D7', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onSave({ ...post, caption, date, suggested_time: time })} disabled={saved}
          style={{ padding: '7px 14px', background: saved ? '#E9F1EC' : NAVY, color: saved ? '#22513B' : '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saved ? 'default' : 'pointer' }}>
          {sinhalaText(saved ? '✓ Saved' : '💾 Save to Queue')}
        </button>
        <button onClick={handleCopy}
          style={{ padding: '7px 14px', background: '#F7F3E8', color: '#3A4046', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {sinhalaText(copied ? '✓ Copied!' : '📋 Copy Row')}
        </button>
        <button onClick={() => onRegenerate(index)} disabled={regenerating}
          style={{ padding: '7px 14px', background: '#F7F3E8', color: '#3A4046', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: regenerating ? 0.6 : 1 }}>
          {sinhalaText(regenerating ? '⏳' : '🔄')} නැවත සාදන්න
        </button>
        <button onClick={() => onDiscard(index)}
          style={{ padding: '7px 14px', background: '#FBEDEB', color: '#8E2A1F', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          🗑 ඉවත් කරන්න
        </button>
      </div>
    </div>
  )
}

// ─── Main ContentStudio ────────────────────────────────────────────────────────

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1umnpXIFhPT8-D31_dbiS_Iz5Ebw9ZfexwrBPD7YPENw/edit'

function todayISO() { return new Date().toISOString().slice(0, 10) }

function scheduleDates(startISO, count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(startISO); d.setDate(d.getDate() + i * 2)
    return d.toISOString().slice(0, 10)
  })
}

export default function ContentStudio() {
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useSupabaseStats()

  const [campaign,      setCampaign]      = useState('user')
  const [format,        setFormat]        = useState('single')
  const [platform,      setPlatform]      = useState('FB+IG')
  const [angle,         setAngle]         = useState('social_proof')
  const [numPosts,      setNumPosts]      = useState(3)
  const [scheduleDate,  setScheduleDate]  = useState(todayISO)

  const [generating,    setGenerating]    = useState(false)
  const [regenIdx,      setRegenIdx]      = useState(null)
  const [error,         setError]         = useState(null)
  const [posts,         setPosts]         = useState([])
  const [savedIds,      setSavedIds]      = useState(new Set())
  const [copyAllMsg,    setCopyAllMsg]    = useState('')

  const missingKey = !import.meta.env.VITE_ANTHROPIC_API_KEY && !import.meta.env.PUBLIC_ANTHROPIC_API_KEY

  async function handleGenerate() {
    setGenerating(true); setError(sinhalaText(null)); setPosts([]); setSavedIds(new Set())
    try {
      const results = await generatePosts({ campaign, format, platform, angle, numPosts, stats })
      const dates = scheduleDates(scheduleDate, results.length)
      setPosts(results.map((p, i) => ({ ...p, id: `gen_${Date.now()}_${i}`, campaign, format, date: dates[i] })))
    } catch (e) {
      setError(sinhalaText(e.message === 'MISSING_KEY' ? null : e.message))
    }
    setGenerating(false)
  }

  async function handleRegenerate(index) {
    setRegenIdx(index); setError(sinhalaText(null))
    try {
      const [result] = await generatePosts({ campaign, format, platform, angle, numPosts: 1, stats })
      setPosts(prev => prev.map((p, i) => i === index ? { ...result, id: p.id, campaign, format, date: p.date } : p))
      setSavedIds(prev => { const s = new Set(prev); s.delete(posts[index].id); return s })
    } catch (e) { setError(sinhalaText(e.message)) }
    setRegenIdx(null)
  }

  function handleSave(post) {
    saveToLocalQueue(post)
    setSavedIds(s => new Set([...s, post.id]))
  }

  function handleDiscard(index) { setPosts(prev => prev.filter((_, i) => i !== index)) }

  async function handleCopyAll() {
    await copyAllToClipboard(posts)
    setCopyAllMsg('Copied!'); setTimeout(() => setCopyAllMsg(''), 1800)
  }

  const currentAngles = ANGLES[campaign]

  return (
    <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>

      {/* Live Stats Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatPill label="Projects Posted" value={stats.projects} loading={statsLoading} />
        <StatPill label="Active Tilers"   value={stats.tilers}   loading={statsLoading} />
        <StatPill label="Bids Placed"     value={stats.bids}     loading={statsLoading} />
        <button onClick={refreshStats} title="සංඛ්‍යා දත්ත නැවුම් කරන්න"
          style={{ padding: '6px 12px', background: '#F7F3E8', border: 'none', borderRadius: 10, fontSize: 12, color: '#6B7076', cursor: 'pointer', alignSelf: 'center' }}>
          ↻ නැවුම් කරන්න
        </button>
        {sinhalaText(statsError && <span style={{ fontSize: 11, color: '#ef4444', alignSelf: 'center' }}>සංඛ්‍යා දත්ත නොමැත</span>)}
      </div>

      {/* API Key Warning */}
      {sinhalaText(missingKey && (
        <div style={{ background: '#F3E7DF', border: '1px solid #E3B9A5', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#0B2A4A', marginBottom: 6 }}>⚠️ Anthropic API යතුර සකසා නැත</div>
          <div style={{ fontSize: 12, color: '#071827', lineHeight: 1.6 }}>
            මෙයට එක් කරන්න: <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>.env</code> ගොනුව:<br />
            <code style={{ background: '#fff', padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginTop: 4 }}>VITE_ANTHROPIC_API_KEY=sk-ant-api03-...</code><br />
            ඉන්පසු සංවර්ධන සේවාදායකය නැවත අරඹා ප්‍රකාශ කරන්න.
          </div>
        </div>
      ))}

      {/* Config Form */}
      <div style={card({ marginBottom: 20 })}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#071827', marginBottom: 18 }}>⚙️ අන්තර්ගත සැකසුම්</div>

        {/* Campaign */}
        <div style={{ marginBottom: 18 }}>
          <div style={lbl()}>ප්‍රචාරණය</div>
          <ToggleGroup
            options={[{ value: 'user', label: '🏠 User — Attract Homeowners' }, { value: 'provider', label: '🔨 Provider — Attract Tilers' }]}
            value={campaign}
            onChange={v => { setCampaign(v); setAngle(ANGLES[v][0].value) }}
          />
          <div style={{ fontSize: 11, color: '#8A8F95', marginTop: 6 }}>
            {sinhalaText(campaign === 'user'
              ? 'Posts aimed at homeowners to post renovation projects at tilershub.lk/post-project'
              : 'Posts aimed at tilers/contractors to join and bid for jobs at tilershub.lk/join-as-tiler')}
          </div>
        </div>

        {/* 3-column row: Format, Platform, Count */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div>
            <div style={lbl()}>ආකෘතිය</div>
            <ToggleGroup
              options={[{ value: 'single', label: '🖼 Single' }, { value: 'carousel', label: '🎴 Carousel' }, { value: 'reel', label: '🎬 Reel' }]}
              value={format} onChange={setFormat}
            />
          </div>
          <div>
            <div style={lbl()}>වේදිකාව</div>
            <ToggleGroup
              options={[{ value: 'FB+IG', label: '📱 FB + IG' }, { value: 'Facebook', label: '📘 FB' }, { value: 'Instagram', label: '📸 IG' }]}
              value={platform} onChange={setPlatform}
            />
          </div>
          <div>
            <div style={lbl()}>පළ කිරීම් ගණන</div>
            <ToggleGroup
              options={[{ value: 1, label: '1' }, { value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' }]}
              value={numPosts} onChange={setNumPosts}
            />
          </div>
        </div>

        {/* Angle + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 20 }}>
          <div>
            <div style={lbl()}>අන්තර්ගත ප්‍රවේශය</div>
            <select value={angle} onChange={e => setAngle(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #EAE4D7', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
              {sinhalaText(currentAngles.map(a => <option key={a.value} value={a.value}>{sinhalaText(a.label)}</option>))}
            </select>
          </div>
          <div>
            <div style={lbl()}>ආරම්භක දිනය</div>
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #EAE4D7', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 10, color: '#8A8F95', marginTop: 4 }}>පළ කිරීම් අතර දින 2ක පරතරයක්</div>
          </div>
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={generating || missingKey}
          style={{
            padding: '12px 28px', background: generating ? '#8A8F95' : ORANGE, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: generating || missingKey ? 'not-allowed' : 'pointer',
            boxShadow: generating ? 'none' : '0 4px 14px rgba(232,88,10,0.3)', transition: 'all 0.15s',
          }}>
          {sinhalaText(generating ? '⏳ Generating…' : `✨ පළ කිරීම් ${numPosts} ක් සාදන්න`)}
        </button>
      </div>

      {/* Error */}
      {sinhalaText(error && (
        <div style={{ background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#8E2A1F' }}>
          ⚠️ {sinhalaText(error)}
        </div>
      ))}

      {/* Generated Posts */}
      {sinhalaText(posts.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#071827' }}>සෑදූ පළ කිරීම් ({sinhalaText(posts.length)})</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={handleCopyAll}
                style={{ padding: '8px 16px', background: GOLD, color: '#071827', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {sinhalaText(copyAllMsg || '📋 Copy All Rows')}
              </button>
              <a href={SHEET_URL} target="_blank" rel="noreferrer"
                style={{ padding: '8px 16px', background: '#F7F3E8', color: '#3A4046', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                📊 පැතුරුම්පත විවෘත කරන්න ↗
              </a>
            </div>
          </div>

          {sinhalaText(posts.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              index={i}
              campaign={campaign}
              onSave={handleSave}
              onDiscard={handleDiscard}
              onRegenerate={handleRegenerate}
              saved={savedIds.has(post.id)}
              regenerating={regenIdx === i}
            />
          )))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleCopyAll}
              style={{ padding: '10px 20px', background: GOLD, color: '#071827', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {sinhalaText(copyAllMsg || '📋 Copy All Rows for Sheet')}
            </button>
            <a href={SHEET_URL} target="_blank" rel="noreferrer"
              style={{ padding: '10px 20px', background: NAVY, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              📊 Google පැතුරුම්පත විවෘත කරන්න ↗
            </a>
          </div>
        </>
      ))}

      {/* Generating skeleton */}
      {sinhalaText(generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sinhalaText(Array.from({ length: numPosts }).map((_, i) => (
            <div key={i} style={{ ...card(), height: 200, background: 'linear-gradient(90deg,#F7F3E8 25%,#EAE4D7 50%,#F7F3E8 75%)', animation: 'pulse 1.5s ease infinite', backgroundSize: '200% 100%' }} />
          )))}
        </div>
      ))}
    </div>
  )
}
