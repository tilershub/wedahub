import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const BIDDER_TYPES = [
  { value: 'Tiler',      icon: '🪚', label: 'Tiler',       desc: 'Tiling specialist' },
  { value: 'Contractor', icon: '🏗️', label: 'Contractor',  desc: 'Full renovation' },
  { value: 'Workshop',   icon: '🔧', label: 'Workshop',    desc: 'Workshop / cutting' },
  { value: 'Supplier',   icon: '📦', label: 'Supplier',    desc: 'Material supplier' },
  { value: 'Other',      icon: '👷', label: 'Other',       desc: 'Other trade' },
]

function inp(extra = {}) {
  return {
    width: '100%', padding: '12px 14px', border: '1.5px solid #E2E2E2', borderRadius: 10,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff',
    boxSizing: 'border-box', color: '#0B0B0B', transition: 'border-color 0.15s',
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
      <p style={{ fontSize: 14, color: '#4A4A4A', lineHeight: 1.75, maxWidth: 380, margin: '0 auto 24px' }}>
        ඔබේ මිල ගණන: <strong>{sinhalaText(projectType)}</strong> in <strong>{sinhalaText(city)}</strong> දැන් {sinhalaText(updated ? 'updated' : 'received')}. නිවාස හිමියා ඔබව තෝරාගතහොත් WhatsApp හරහා සෘජුවම සම්බන්ධ වනු ඇත.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#8A6224', textDecoration: 'none', background: '#F5EEE2', border: '1.5px solid #C2542B22', borderRadius: 10, padding: '11px 20px' }}>
          ← තවත් ව්‍යාපෘති බලන්න
        </a>
        <a href="/providers?type=tiler" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#8A6224', borderRadius: 10, padding: '11px 20px' }}>
          ✅ ඔබේ පැතිකඩ සාදන්න
        </a>
      </div>
    </div>
  )
}

export default function BidForm({ jobId, bidCount = 0, projectType = '', city = '' }) {
  const [form, setForm] = useState({ name: '', whatsapp: '', bidder_type: 'Tiler', message: '', quote_amount: '', timeline: '' })
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
          bidder_type: (bid.bidder_type || 'tiler').replace(/^./, c => c.toUpperCase()),
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

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

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
    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#6E6E6E', fontSize: 13 }}>පූරණය…</div>
  )

  // Quoting requires an account: it is what ties a quote to a provider so it
  // can be edited later and shown under "My Quotes".
  if (!user) return (
    <div style={{ textAlign: 'center', padding: '32px 24px', background: '#F7F7F7', border: '1.5px solid #E2E2E2', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0B0B0B', marginBottom: 8 }}>ඔබේ මිල ගණන යැවීමට පිවිසෙන්න</h3>
      <p style={{ fontSize: 13, color: '#6E6E6E', lineHeight: 1.7, maxWidth: 340, margin: '0 auto 20px' }}>
        පිවිසීමෙන් ඔබේ මිල ගණන ඔබේ ගිණුමට සම්බන්ධ වේ. ඕනෑම වේලාවක එය සංස්කරණය කිරීමටත් මගේ මිල ගණන් යටතේ බැලීමටත් හැකිය.
      </p>
      <button onClick={signIn}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#0B0B0B', border: '1.5px solid #E2E2E2', borderRadius: 12, padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
        Google සමඟ ඉදිරියට යන්න
      </button>
    </div>
  )

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6E6E6E', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }
  const msgLen = form.message.length

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {sinhalaText(existingId && (
        <div style={{ background: '#F5EEE2', border: '1px solid #E8DCC6', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✏️</span>
          <span style={{ fontSize: 12, color: '#242424', fontWeight: 600 }}>
            මෙම වැඩයට ඔබ දැනටමත් මිල ගණනක් දී ඇත. පවතින මිල ගණන සංස්කරණය කරමින් සිටී.
          </span>
        </div>
      ))}

      {/* Competition notice */}
      {sinhalaText(!existingId && bidCount > 0 && (
        <div style={{ background: '#F5EEE2', border: '1px solid #E8DCC6', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 12, color: '#242424', fontWeight: 600 }}>
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
                background: form.bidder_type === t.value ? '#8A6224' : '#F7F7F7',
                borderColor: form.bidder_type === t.value ? '#8A6224' : '#E2E2E2',
              }}
            >
              <span style={{ fontSize: 18 }}>{sinhalaText(t.icon)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: form.bidder_type === t.value ? '#fff' : '#4A4A4A' }}>{sinhalaText(t.label)}</span>
              <span style={{ fontSize: 9, color: form.bidder_type === t.value ? 'rgba(255,255,255,0.6)' : '#8C8C8C', textAlign: 'center', lineHeight: 1.2 }}>{sinhalaText(t.desc)}</span>
            </button>
          )))}
        </div>
      </div>

      {/* Quote + Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ඔබේ මිල ගණන <span style={{ color: '#8C8C8C', fontWeight: 400, textTransform: 'none' }}>(අත්‍යවශ්‍ය නොවේ)</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: '#6E6E6E' }}>රු.</span>
            <input type="number" value={form.quote_amount} onChange={e => set('quote_amount', e.target.value)} placeholder="e.g. 85000" style={inp({ paddingLeft: 38 })} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>කාලසීමාව <span style={{ color: '#8C8C8C', fontWeight: 400, textTransform: 'none' }}>(අත්‍යවශ්‍ය නොවේ)</span></label>
          <input value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="උදා: දින 3–5" style={inp()} />
        </div>
      </div>

      {/* Message */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={labelStyle}>ඔබේ යෝජනාව *</label>
          <span style={{ fontSize: 10, color: msgLen > MAX_MSG * 0.9 ? '#C0392B' : '#8C8C8C' }}>{sinhalaText(msgLen)}/{sinhalaText(MAX_MSG)}</span>
        </div>
        <textarea
          value={form.message}
          onChange={e => set('message', e.target.value.slice(0, MAX_MSG))}
          placeholder="ඔබේ පළපුරුද්ද, කරන වැඩ, ගතවන කාලය සහ පාරිභෝගිකයා ඔබ තෝරාගත යුතු හේතු විස්තර කරන්න…"
          rows={5}
          style={{ ...inp(), resize: 'vertical', lineHeight: 1.7 }}
        />
        <p style={{ fontSize: 11, color: '#8C8C8C', margin: '5px 0 0' }}>උපදෙස: ඔබේ පළපුරුද්ද, මීට සමාන පෙර වැඩ සහ ජලරෝධක කිරීමේ ක්‍රමය සඳහන් කරන්න.</p>
      </div>

      {sinhalaText(error && (
        <div style={{ fontSize: 13, color: '#C0392B', background: '#FBEDEB', border: '1px solid #F2C9C3', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠ {sinhalaText(error)}
        </div>
      ))}

      <button type="submit" disabled={loading}
        style={{ padding: '15px', background: loading ? '#8C8C8C' : 'linear-gradient(135deg,#8A6224,#242424)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(212,161,94,0.3)', transition: 'all 0.2s' }}>
        {sinhalaText(loading ? (existingId ? '⏳ Updating…' : '⏳ Sending…') : (existingId ? '💾 Update My Quote' : '📨 Send My Quote'))}
      </button>

      {/* Trust strip */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {sinhalaText(['✏️ Editable any time', '💬 Homeowner contacts you via WhatsApp', '🚫 No commission'].map(t => (
          <span key={t} style={{ fontSize: 11, color: '#6E6E6E', fontWeight: 500 }}>{sinhalaText(t)}</span>
        )))}
      </div>
    </form>
  )
}
