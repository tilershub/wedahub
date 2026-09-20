import PhoneSignIn from './PhoneSignIn.jsx'
import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

import { PROFESSIONS } from '../lib/professions.js'
const BIDDER_TYPES = PROFESSIONS.map(p => ({ value: p.label, label: p.si, icon: p.icon, desc: p.label }))

function inp(extra = {}) {
  return {
    width: '100%', padding: '12px 14px', border: '1.5px solid #EAE4D7', borderRadius: 10,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff',
    boxSizing: 'border-box', color: '#071827', transition: 'border-color 0.15s',
    ...extra,
  }
}

function BidSuccess({ projectType, city, updated }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E9F1EC', border: '3px solid #C6DDCF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#22513B', marginBottom: 8 }}>
        {sinhalaText(updated ? 'Quote Updated!' : 'Quote Sent!')}
      </h3>
      <p style={{ fontSize: 14, color: '#3A4046', lineHeight: 1.75, maxWidth: 380, margin: '0 auto 24px' }}>
        ඔබේ මිල ගණන: <strong>{sinhalaText(projectType)}</strong> in <strong>{sinhalaText(city)}</strong> දැන් {sinhalaText(updated ? 'updated' : 'received')}. නිවාස හිමියා ඔබව තෝරාගතහොත් WhatsApp හරහා සෘජුවම සම්බන්ධ වනු ඇත.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0B2A4A', textDecoration: 'none', background: '#F7F3E8', border: '1.5px solid #0B2A4A22', borderRadius: 10, padding: '11px 20px' }}>
          ← තවත් ව්‍යාපෘති බලන්න
        </a>
        <a href="/providers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#0B2A4A', borderRadius: 10, padding: '11px 20px' }}>
          ✅ ඔබේ පැතිකඩ සාදන්න
        </a>
      </div>
    </div>
  )
}

export default function BidForm({ jobId, bidCount = 0, projectType = '', city = '' }) {
  const [form, setForm] = useState({ name: '', whatsapp: '', bidder_type: 'Other Service', message: '', quote_amount: '', timeline: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  // The provider's existing quote on this job, if any — one is allowed, and
  // it is revised rather than duplicated.
  const [existingId, setExistingId] = useState(null)
  const MAX_MSG = 600

  useEffect(() => {
    let cancelled = false
    async function load(u) {
      if (cancelled) return
      setUser(u)
      if (!u) { setReady(true); return }
      const [{ data: bid }, { data: provider }] = await Promise.all([
        supabase.from('bids').select('*').eq('job_id', jobId).eq('user_id', u.id).maybeSingle(),
        supabase.from('providers').select('name,whatsapp,phone,provider_type').eq('user_id', u.id).maybeSingle(),
      ])
      if (cancelled) return
      if (bid) {
        setExistingId(bid.id)
        setForm({
          name: bid.bidder_name || '',
          whatsapp: bid.bidder_whatsapp || '',
          bidder_type: (bid.bidder_type || 'Service provider').replace(/^./, c => c.toUpperCase()),
          message: bid.message || '',
          quote_amount: bid.quote_amount != null ? String(bid.quote_amount) : '',
          timeline: bid.timeline || '',
        })
      } else {
        // Prefill from the provider's profile so quoting is near-instant.
        setForm(f => ({
          ...f,
          name: provider?.name || u.user_metadata?.full_name || u.user_metadata?.name || '',
          whatsapp: provider?.whatsapp || provider?.phone || '',
        }))
      }
      setReady(true)
    }
    supabase.auth.getUser().then(({ data }) => load(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) load(session.user)
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [jobId])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }


  async function submit(e) {
    e.preventDefault()
    if (!user) { setError(sinhalaText('Please sign in to send a quote')); return }
    if (!form.name.trim()) { setError(sinhalaText('Please enter your name')); return }
    if (!form.whatsapp.trim()) { setError(sinhalaText('Please enter your WhatsApp number')); return }
    if (form.message.trim().length < 20) { setError(sinhalaText('Please write at least 20 characters describing your offer')); return }
    setLoading(true)
    setError(sinhalaText(''))
    const payload = {
      bidder_name: form.name.trim(),
      // Stored without spaces so it matches the number on the profile
      // regardless of how it was typed.
      bidder_whatsapp: form.whatsapp.replace(/\s/g, ''),
      bidder_type: form.bidder_type.toLowerCase(),
      message: form.message.trim(),
      quote_amount: form.quote_amount ? parseInt(form.quote_amount, 10) : null,
      timeline: form.timeline.trim() || null,
    }
    const { error: err } = existingId
      ? await supabase.from('bids').update(payload).eq('id', existingId)
      : await supabase.from('bids').insert({ ...payload, job_id: jobId, user_id: user.id })
    setLoading(false)
    if (err) {
      // The partial unique index is the backstop if two tabs race.
      setError(sinhalaText(/duplicate key|unique/i.test(err.message || '')
        ? 'You already have a quote on this job — reload the page to edit it.'
        : (err.message || 'Failed to submit. Please try again.')))
      return
    }
    setSubmitted(true)
  }

  if (submitted) return <BidSuccess projectType={projectType} city={city} updated={!!existingId} />

  if (!ready) return (
    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#6B7076', fontSize: 13 }}>පූරණය…</div>
  )

  // Quoting requires an account: it is what ties a quote to a provider so it
  // can be edited later and shown under "My Quotes".
  if (!user) return (
    <div style={{ textAlign: 'center', padding: '32px 24px', background: '#FAF8F2', border: '1.5px solid #EAE4D7', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#071827', marginBottom: 8 }}>ඔබේ මිල ගණන යැවීමට පිවිසෙන්න</h3>
      <p style={{ fontSize: 13, color: '#6B7076', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 20px' }}>
        පිවිසීමෙන් ඔබේ මිල ගණන ඔබේ ගිණුමට සම්බන්ධ වේ. ඕනෑම වේලාවක එය සංස්කරණය කිරීමටත් මගේ මිල ගණන් යටතේ බැලීමටත් හැකිය.
      </p>
      <PhoneSignIn />
    </div>
  )

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7076', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }
  const msgLen = form.message.length

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {sinhalaText(existingId && (
        <div style={{ background: '#F7F3E8', border: '1px solid #EAE4D7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✏️</span>
          <span style={{ fontSize: 12, color: '#0B2A4A', fontWeight: 600 }}>
            මෙම වැඩයට ඔබ දැනටමත් මිල ගණනක් දී ඇත. පවතින මිල ගණන සංස්කරණය කරමින් සිටී.
          </span>
        </div>
      ))}

      {/* Competition notice */}
      {sinhalaText(!existingId && bidCount > 0 && (
        <div style={{ background: '#F7F3E8', border: '1px solid #EAE4D7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 12, color: '#0B2A4A', fontWeight: 600 }}>
            {sinhalaText(bidCount)} සේවා සපයන්නා{sinhalaText(bidCount !== 1 ? 's' : '')} දැනටමත් ඉදිරිපත් කර ඇත {sinhalaText(bidCount !== 1 ? 'bids' : 'a bid')} — පැහැදිලි යෝජනාවකින් ඔබේ විශේෂත්වය පෙන්වන්න!
          </span>
        </div>
      ))}

      {/* Name + WhatsApp */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ඔබේ නම *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="උදා: සමන් පෙරේරා" style={inp()} />
        </div>
        <div>
          <label style={labelStyle}>WhatsApp අංකය *</label>
          <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="07X XXX XXXX" inputMode="tel" style={inp()} />
        </div>
      </div>

      {/* Bidder type */}
      <div>
        <label style={labelStyle}>මගේ වෘත්තිය *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {sinhalaText(BIDDER_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => set('bidder_type', t.value)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.15s',
                background: form.bidder_type === t.value ? '#0B2A4A' : '#FAF8F2',
                borderColor: form.bidder_type === t.value ? '#0B2A4A' : '#EAE4D7',
              }}
            >
              <span style={{ fontSize: 18 }}>{sinhalaText(t.icon)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: form.bidder_type === t.value ? '#fff' : '#3A4046' }}>{sinhalaText(t.label)}</span>
              <span style={{ fontSize: 9, color: form.bidder_type === t.value ? 'rgba(255,255,255,0.6)' : '#8A8F95', textAlign: 'center', lineHeight: 1.2 }}>{sinhalaText(t.desc)}</span>
            </button>
          )))}
        </div>
      </div>

      {/* Quote + Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ඔබේ මිල ගණන <span style={{ color: '#8A8F95', fontWeight: 400, textTransform: 'none' }}>(අත්‍යවශ්‍ය නොවේ)</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: '#6B7076' }}>රු.</span>
            <input type="number" value={form.quote_amount} onChange={e => set('quote_amount', e.target.value)} placeholder="e.g. 85000" style={inp({ paddingLeft: 38 })} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>කාලසීමාව <span style={{ color: '#8A8F95', fontWeight: 400, textTransform: 'none' }}>(අත්‍යවශ්‍ය නොවේ)</span></label>
          <input value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="උදා: දින 3–5" style={inp()} />
        </div>
      </div>

      {/* Message */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>ඔබේ යෝජනාව *</label>
          <span style={{ fontSize: 10, color: msgLen > MAX_MSG * 0.9 ? '#C0392B' : '#8A8F95' }}>{sinhalaText(msgLen)}/{sinhalaText(MAX_MSG)}</span>
        </div>
        <textarea
          value={form.message}
          onChange={e => set('message', e.target.value.slice(0, MAX_MSG))}
          placeholder="ඔබේ පළපුරුද්ද, කරන වැඩ, ගතවන කාලය සහ පාරිභෝගිකයා ඔබ තෝරාගත යුතු හේතු විස්තර කරන්න…"
          rows={5}
          style={{ ...inp(), resize: 'vertical', lineHeight: 1.7 }}
        />
        <p style={{ fontSize: 11, color: '#8A8F95', margin: '5px 0 0' }}>උපදෙස: ඔබේ පළපුරුද්ද, මීට සමාන පෙර වැඩ සහ ජලරෝධක කිරීමේ ක්‍රමය සඳහන් කරන්න.</p>
      </div>

      {sinhalaText(error && (
        <div style={{ fontSize: 13, color: '#C0392B', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠ {sinhalaText(error)}
        </div>
      ))}

      <button type="submit" disabled={loading}
        style={{ padding: '15px', background: loading ? '#8A8F95' : 'linear-gradient(135deg,#0B2A4A,#0B2A4A)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(11,42,74,0.3)', transition: 'all 0.2s' }}>
        {sinhalaText(loading ? (existingId ? '⏳ Updating…' : '⏳ Sending…') : (existingId ? '💾 Update My Quote' : '📨 Send My Quote'))}
      </button>

      {/* Trust strip */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {sinhalaText(['✏️ Editable any time', '💬 Homeowner contacts you via WhatsApp', '🚫 No commission'].map(t => (
          <span key={t} style={{ fontSize: 11, color: '#6B7076', fontWeight: 500 }}>{sinhalaText(t)}</span>
        )))}
      </div>
    </form>
  )
}
