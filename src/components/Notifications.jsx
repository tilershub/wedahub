import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, getUser } from '../lib/supabase.js'
import { jobPath } from '../lib/jobs.js'
import { accountRole } from '../lib/account-role.js'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}

const TYPE_ICONS = {
  'Floor Tiling':'🪨','Bathroom Tiling':'🚿','Bathroom Renovation':'🛁',
  'Granite Works':'💎','Tile Cutting':'✂️','Routering':'🔧',
  'Waterproofing':'💧','Tile Shop Inquiry':'🏪',
}

export default function Notifications() {
  const [state,  setState]  = useState('loading') // loading | unauthenticated | ready
  const [items,  setItems]  = useState([])
  const [role,   setRole]   = useState('guest')  // guest | homeowner | provider

  useEffect(() => {
    async function load() {
      const u = await getUser()
      if (!u) { setState('unauthenticated'); return }

      // Determine if provider or homeowner
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from('tilers').select('id,full_name').eq('user_id', u.id).maybeSingle(),
        supabase.from('providers').select('id,name').eq('user_id', u.id).maybeSingle(),
      ])

      if (t || p || await accountRole(supabase, u) === 'provider') {
        // Provider: show recent active projects as job alerts
        setRole('provider')
        const { data: projects } = await supabase
          .from('projects')
          .select('id,project_type,city,district,budget_range,created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(25)

        setItems((projects || []).map(proj => ({
          id: proj.id,
          icon: TYPE_ICONS[proj.project_type] || '🏗️',
          iconBg: '#F7F3E8',
          title: `අලුත් වැඩක්: ${proj.project_type}`,
          subtitle: `${proj.city}${proj.district && proj.district !== proj.city ? `, ${proj.district}` : ''}${proj.budget_range ? ` · ${proj.budget_range}` : ''}`,
          time: proj.created_at,
          href: jobPath(proj),
          cta: 'මිල දෙන්න →',
          ctaBg: '#0B2A4A',
        })))
      } else {
        // Homeowner: show bids received on their projects
        setRole('homeowner')
        const { data: myProjects } = await supabase
          .from('projects')
          .select('id,project_type,city')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (myProjects?.length) {
          const { data: bids } = await supabase
            .from('bids')
            .select('id,job_id,bidder_name,bidder_type,quote_amount,created_at')
            .in('job_id', myProjects.map(p => p.id))
            .order('created_at', { ascending: false })
            .limit(30)

          const projMap = Object.fromEntries(myProjects.map(p => [p.id, p]))
          setItems((bids || []).map(b => {
            const proj = projMap[b.job_id] || {}
            const quote = b.quote_amount ? ` · Rs ${b.quote_amount}` : ''
            return {
              id: b.id,
              icon: '💬',
              iconBg: '#E9F1EC',
              title: `ඔබේ ${proj.project_type || 'වැඩය'} සඳහා අලුත් මිල ගණනක්`,
              subtitle: `${b.bidder_name}${b.bidder_type ? ` (${b.bidder_type})` : ''}${quote}`,
              time: b.created_at,
              href: '/account',
              cta: 'බලන්න',
              ctaBg: '#0B2A4A',
            }
          }))
        }
      }

      try {
        const response = await fetch('/api/jobs')
        if (response.ok) {
          const { jobs } = await response.json()
          const updates = jobs.filter(j => j.data.events?.at(-1)?.role !== (j.customer_id === u.id ? 'customer' : 'provider')).slice(0, 20).map(j => ({
            id: `job-${j.id}`, icon: '🤝', iconBg: '#E9F1EC', title: `වැඩයේ යාවත්කාලීනයක්: ${j.data.title}`,
            subtitle: j.data.status.replaceAll('_', ' '), time: j.updated_at, href: '/my-jobs', cta: 'වැඩය බලන්න', ctaBg: '#0B2A4A',
          }))
          setItems(previous => [...updates, ...previous].sort((a, b) => new Date(b.time) - new Date(a.time)))
        }
      } catch { /* Existing notifications remain available when job management is offline. */ }
      setState('ready')
    }
    load()
  }, [])

  // ── Sign-in prompt ────────────────────────────────────────────

  if (state === 'unauthenticated') {
    return (
      <div style={{ maxWidth:480, margin:'48px auto', padding:'0 20px', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔔</div>
        <h2 style={{ fontFamily:"var(--th-display)", fontSize:22, fontWeight:700, color:'#071827', marginBottom:8 }}>දැනුම්දීම්</h2>
        <p style={{ fontSize:14, color:'#6B7076', marginBottom:24, lineHeight:1.7 }}>
          මිල ගණන්, ව්‍යාපෘති යාවත්කාලීන සහ අනෙකුත් දැනුම්දීම් බැලීමට පිවිසෙන්න.
        </p>
        <a href="/login" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#0B2A4A', color:'#fff', borderRadius:12, padding:'12px 28px', fontSize:14, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 16px rgba(11,42,74,0.35)' }}>
          පිවිසෙන්න →
        </a>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div style={{ maxWidth:560, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ height:24, background:'#F7F3E8', borderRadius:8, width:'40%', marginBottom:20 }} />
        {sinhalaText(Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'14px 0', borderBottom:'1px solid #F7F3E8' }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#F7F3E8', flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ height:12, background:'#F7F3E8', borderRadius:6, width:'60%', marginBottom:6 }} />
              <div style={{ height:10, background:'#F7F3E8', borderRadius:6, width:'80%' }} />
            </div>
          </div>
        )))}
      </div>
    )
  }

  // ── Notifications list ────────────────────────────────────────

  const emptyMsg = role === 'provider'
    ? 'දැනට විවෘත වැඩ නැත. අලුත් අවස්ථා සඳහා පසුව නැවත බලන්න.'
    : 'ඔබ තවම වැඩයක් පළ කර නැත.'
  const emptyCta = role === 'provider'
    ? { label:'සියලු වැඩ බලන්න', href:'/jobs' }
    : { label:'වැඩක් පළ කරන්න', href:'/post-project' }

  return (
    <div style={{ maxWidth:560, margin:'0 auto', padding:'24px 16px 80px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"var(--th-display)", fontSize:22, fontWeight:700, color:'#071827', margin:'0 0 2px' }}>දැනුම්දීම්</h1>
          <p style={{ fontSize:12, color:'#8A8F95', margin:0 }}>
            {role === 'provider' ? 'ඔබට මිල ගණන් ඉදිරිපත් කළ හැකි වැඩ' : 'ඔබේ වැඩවලට ලැබුණු මිල ගණන්'}
          </p>
        </div>
        {sinhalaText(items.length > 0 && (
          <span style={{ fontSize:11, fontWeight:700, color:'#0B2A4A', background:'#F7F3E8', border:'1px solid #EAE4D7', borderRadius:20, padding:'3px 10px' }}>
            {sinhalaText(items.length)} අලුත්
          </span>
        ))}
      </div>

      {/* Empty state */}
      {sinhalaText(items.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔔</div>
          <p style={{ fontSize:14, color:'#8A8F95', marginBottom:20 }}>{sinhalaText(emptyMsg)}</p>
          <a href={emptyCta.href} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#0B2A4A', color:'#fff', borderRadius:10, padding:'10px 22px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
            {sinhalaText(emptyCta.label)} →
          </a>
        </div>
      ))}

      {/* Items */}
      {sinhalaText(items.map(item => (
        <a key={item.id} href={item.href}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 0', borderBottom:'1px solid #F7F3E8', textDecoration:'none', color:'inherit', transition:'opacity 0.15s' }}
          onMouseOver={e => e.currentTarget.style.opacity='0.75'}
          onMouseOut={e  => e.currentTarget.style.opacity='1'}
        >
          {/* icon */}
          <div style={{ width:42, height:42, borderRadius:12, background:item.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
            {sinhalaText(item.icon)}
          </div>

          {/* text */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#071827', marginBottom:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{sinhalaText(item.title)}</div>
            <div style={{ fontSize:11, color:'#6B7076', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{sinhalaText(item.subtitle)}</div>
          </div>

          {/* time + cta */}
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
            <span style={{ fontSize:10, color:'#8A8F95' }}>{sinhalaText(timeAgo(item.time))}</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#fff', background:item.ctaBg, borderRadius:6, padding:'3px 8px' }}>{sinhalaText(item.cta)}</span>
          </div>
        </a>
      )))}
    </div>
  )
}
