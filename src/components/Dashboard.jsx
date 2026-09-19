import { si as sinhalaText } from '../lib/sinhala.js'
import { useState, useEffect } from 'react'
import { supabase, getUser, signOut, onAuthStateChange, buildWhatsAppLink, phoneVariants } from '../lib/supabase.js'
import ProfileEditor from './ProfileEditor.jsx'
import PortfolioEditor from './PortfolioEditor.jsx'
import BidCard from './BidCard.jsx'
import { useLang } from '../lib/useLang.js'
import { jobPath } from '../lib/jobs.js'

const TYPE_ICON = {
  'Floor Tiling':'🪨','Bathroom Tiling':'🚿','Bathroom Renovation':'🛁',
  'Granite Works':'💎','Tile Cutting':'✂️','Routering':'🔧',
  'Waterproofing':'💧','Tile Shop Inquiry':'🏪',
}

function timeAgo(d) {
  if (!d) return ''
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (m < 60)   return `${m}m`
  if (m < 1440) return `${Math.floor(m/60)}h`
  if (m < 10080)return `${Math.floor(m/1440)}d`
  return new Date(d).toLocaleDateString('en-LK', { day:'numeric', month:'short' })
}

// ─── ROOT COMPONENT ────────────────────────────────────────────────

const MOBILE_STYLES = `
  .db-tab-bar::-webkit-scrollbar { display: none; }
  .db-tab-bar { -ms-overflow-style: none; scrollbar-width: none; }
  @media (max-width: 480px) {
    .db-identity-actions { width: 100%; justify-content: flex-start !important; }
    .db-header-pad { padding: 16px 14px 0 !important; }
    .db-content-pad { padding: 16px 14px 64px !important; }
    .db-avatar { width: 44px !important; height: 44px !important; font-size: 15px !important; }
    .db-profile-name { font-size: 14px !important; }
  }
`

export default function Dashboard({ initialUser, initialProjects, initialProvider, initialBids }) {
  const [user, setUser]               = useState(initialUser ?? null)
  const [loading, setLoading]         = useState(!initialUser)
  const [loadError, setLoadError]     = useState(null)
  const [projects, setProjects]       = useState(initialProjects || [])
  const [claimedProfile, setClaimedProfile] = useState(initialProvider ?? null)
  const [dataLoading, setDataLoading] = useState(false)
  const [submission, setSubmission]   = useState(null)

  // Build bids map from flat array
  const buildBidsMap = (flatBids) => {
    const byJob = {}
    for (const b of flatBids || []) { if (!byJob[b.job_id]) byJob[b.job_id] = []; byJob[b.job_id].push(b) }
    return byJob
  }
  const [bids, setBids] = useState(() => buildBidsMap(initialBids))

  useEffect(() => {
    if (initialUser) {
      // Load submission status (not passed from server yet)
      supabase.from('provider_submissions').select('*').eq('user_id', initialUser.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => setSubmission(data))
      return
    }
    getUser().then(u => { setUser(u); setLoading(false); if (u) loadData(u) })
    onAuthStateChange(u => { setUser(u); if (u) loadData(u); else setLoading(false) })
  }, [])

  async function loadData(u) {
    setDataLoading(true)
    setLoadError(null)
    const [projRes, subRes, providerRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('provider_submissions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('providers').select('*').eq('user_id', u.id).maybeSingle(),
    ])
    if (projRes.error || subRes.error || providerRes.error) {
      const err = projRes.error || subRes.error || providerRes.error
      console.error('dashboard load error:', err)
      setLoadError(err.message)
      setDataLoading(false)
      return
    }
    const userProjects = projRes.data || []
    setProjects(userProjects)
    setSubmission(subRes.data)
    if (providerRes.data) setClaimedProfile(providerRes.data)

    if (userProjects.length > 0) {
      const { data: bidData } = await supabase
        .from('bids').select('*').in('job_id', userProjects.map(p => p.id)).order('created_at', { ascending: false })
      setBids(buildBidsMap(bidData))
    }
    setDataLoading(false)
  }

  if (loading) return <Spinner full />
  if (!user)   return <SignInPrompt />
  if (loadError) return (
    <div style={{ minHeight: 'var(--th-fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#C0392B', marginBottom: 8 }}>ඔබේ පාලන පුවරුව පූරණය කළ නොහැකි විය</h3>
        <p style={{ fontSize: 13, color: '#6B7076', marginBottom: 20 }}>{sinhalaText(loadError)}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#C2542B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          නැවත උත්සාහ කරන්න
        </button>
      </div>
    </div>
  )

  const isProvider = !!claimedProfile ||
    (submission && ['pending_review','approved','listed'].includes(submission?.status))

  const showClaimedBanner =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('claimed') &&
    !!claimedProfile

  const showWelcomeBanner =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('welcome') &&
    !claimedProfile

  return isProvider
    ? <ProviderDashboard user={user} claimedProfile={claimedProfile} submission={submission} showClaimedBanner={showClaimedBanner} showWelcomeBanner={showWelcomeBanner} />
    : <ConsumerDashboard user={user} projects={projects} bids={bids} submission={submission} dataLoading={dataLoading} showClaimedBanner={showClaimedBanner} />
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function ProviderDashboard({ user, claimedProfile, submission, showClaimedBanner, showWelcomeBanner }) {
  const lang = useLang()
  const initialTab = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('tab') || 'explore')
    : 'explore'
  const [tab, setTab]                   = useState(initialTab)
  const [exploreProjects, setExploreProjects] = useState([])
  const [submittedBids, setSubmittedBids]     = useState([])
  const [savedProjects, setSavedProjects]     = useState([])
  const [reviews, setReviews]                 = useState([])
  const [dataLoaded, setDataLoaded]           = useState({ explore:false, quotes:false, saved:false, reviews:false })
  const [dataLoading, setDataLoading]         = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('tab')) {
      setTab(params.get('tab'))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (tab === 'explore'  && !dataLoaded.explore)  loadExploreData()
    if (tab === 'quotes'   && !dataLoaded.quotes)   loadQuotesData()
    if (tab === 'saved'    && !dataLoaded.saved)    loadSavedData()
    if (tab === 'reviews'  && !dataLoaded.reviews)  loadReviewsData()
  }, [tab])

  async function loadExploreData() {
    setDataLoading(true)
    const { data } = await supabase
      .from('projects').select('*').eq('status', 'active')
      .order('created_at', { ascending: false })
    setExploreProjects(data || [])
    setDataLoaded(p => ({ ...p, explore: true }))
    setDataLoading(false)
  }

  async function loadQuotesData() {
    setDataLoading(true)

    // Quotes now carry user_id, so this is exact. Older quotes predate that
    // column, so also match any WhatsApp number we know for this user, in
    // every format it may have been typed, and merge the two.
    const byId = new Map()
    const { data: mine } = await supabase
      .from('bids').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    for (const b of mine || []) byId.set(b.id, b)

    const numbers = [
      claimedProfile?.whatsapp, claimedProfile?.phone,
      submission?.whatsapp,
      user.phone,
    ].filter(Boolean)
    const variants = [...new Set(numbers.flatMap(n => phoneVariants(n)))]
    if (variants.length > 0) {
      const { data: legacy } = await supabase
        .from('bids').select('*').in('bidder_whatsapp', variants).order('created_at', { ascending: false })
      for (const b of legacy || []) byId.set(b.id, b)
    }
    const bids = [...byId.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    if (bids.length > 0) {
      const jobIds = [...new Set(bids.map(b => b.job_id))]
      const { data: jobProjects } = await supabase
        .from('projects').select('id,project_type,city,district,description').in('id', jobIds)
      const projById = {}
      for (const p of jobProjects || []) projById[p.id] = p
      setSubmittedBids(bids.map(b => ({ ...b, project: projById[b.job_id] || null })))
    } else {
      setSubmittedBids([])
    }

    setDataLoaded(p => ({ ...p, quotes: true }))
    setDataLoading(false)
  }

  async function loadSavedData() {
    setDataLoading(true)
    const { data, error } = await supabase
      .from('saved_projects')
      .select('id,project_id,created_at,projects(*)')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setSavedProjects(data || [])
    setDataLoaded(p => ({ ...p, saved: true }))
    setDataLoading(false)
  }

  async function loadReviewsData() {
    if (!claimedProfile?.id) { setDataLoaded(p => ({ ...p, reviews: true })); return }
    setDataLoading(true)
    const { data, error } = await supabase
      .from('reviews').select('*').eq('provider_id', claimedProfile.id).eq('status', 'published')
      .order('created_at', { ascending: false })
    if (!error) setReviews(data || [])
    setDataLoaded(p => ({ ...p, reviews: true }))
    setDataLoading(false)
  }

  const T = { explore:'🔍 Explore', quotes:'💬 My Quotes', saved:'🔖 Saved', profile:'👤 Profile', reviews:'⭐ Reviews', provider:'Provider', signOut:'Sign Out', viewListing:'🔗 View Listing' }

  const TABS = [
    { key:'explore',  label: T.explore  },
    { key:'quotes',   label: T.quotes   },
    { key:'saved',    label: T.saved    },
    { key:'profile',  label: T.profile  },
    { key:'reviews',  label: T.reviews  },
  ]

  const profileName = claimedProfile?.name || (user.email?.split('@')[0] || user.phone || 'Member')
  const initials    = profileName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const profileHref = claimedProfile?.slug ? `/providers/${claimedProfile.slug}` : null

  return (
    <div style={{ minHeight:'var(--th-fill)', background:'#FBFAF8' }}>
      <style>{sinhalaText(MOBILE_STYLES)}</style>

      {/* ── Provider header ── */}
      <div style={{ background:'linear-gradient(135deg,#14171A 0%,#14171A 100%)', paddingBottom:0 }}>
        <div className="db-header-pad" style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px 0' }}>

          {sinhalaText(showClaimedBanner && (
            <div style={{ padding:'10px 14px', background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', borderRadius:10, marginBottom:14 }}>
              <span style={{ fontSize:13, color:'#4ade80', fontWeight:600 }}>✓ පැතිකඩ හිමිකම ලබාගත්තා! පැතිකඩ ටැබයෙන් සංස්කරණය කරන්න.</span>
            </div>
          ))}

          {sinhalaText(showWelcomeBanner && (
            <div style={{ padding:'12px 16px', background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', borderRadius:10, marginBottom:14 }}>
              <div style={{ fontSize:13, color:'#4ade80', fontWeight:700, marginBottom:3 }}>🎉 අයදුම්පත යැව්වා!</div>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.65)' }}>අපගේ කණ්ඩායම වැඩ කරන දින 1–2ක් ඇතුළත සමාලෝචනය කර WhatsApp හරහා ඔබ අමතයි. යන්න: <strong style={{ color:'rgba(255,255,255,0.85)' }}>පැතිකඩ ටැබයට</strong> ඡායාරූප සහ වැඩි විස්තර එක් කිරීමට.</span>
            </div>
          ))}

          {/* Identity row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="db-avatar" style={{ width:52, height:52, borderRadius:14, background:'rgba(96,165,250,0.14)', border:'2px solid rgba(96,165,250,0.3)', color:'#E08A5F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 }}>
                {sinhalaText(initials)}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.38)', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>{sinhalaText(T.provider)}</div>
                <div className="db-profile-name" style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{sinhalaText(profileName)}</div>
                {sinhalaText(claimedProfile && (
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', marginTop:1 }}>
                    {sinhalaText(claimedProfile.city || claimedProfile.district || '')}
                    {sinhalaText(claimedProfile.verification_status === 'th_master' && <span style={{ marginLeft:6, color:'#E08A5F' }}>· 🛡️ TH ප්‍රවීණ</span>)}
                    {sinhalaText(claimedProfile.is_verified && claimedProfile.verification_status !== 'th_master' && <span style={{ marginLeft:6, color:'#4ade80' }}>· ✓ සත්‍යාපිත</span>)}
                  </div>
                ))}
              </div>
            </div>

            <div className="db-identity-actions" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {sinhalaText(profileHref && (
                <a href={profileHref} style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'6px 12px', textDecoration:'none', whiteSpace:'nowrap' }}>
                  {sinhalaText(T.viewListing)}
                </a>
              ))}
              <button
                onClick={async () => { await signOut(); window.location.href = '/' }}
                style={{ fontSize:12, color:'rgba(255,255,255,0.45)', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}
              >{sinhalaText(T.signOut)}</button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="db-tab-bar" style={{ display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch', marginLeft:-14, marginRight:-14, paddingLeft:14 }}>
            {sinhalaText(TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding:'10px 14px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                background:'transparent', flexShrink:0,
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t.key ? '2.5px solid #E08A5F' : '2.5px solid transparent',
                transition:'all 0.15s', whiteSpace:'nowrap',
              }}>{sinhalaText(t.label)}</button>
            )))}
            <div style={{ flexShrink:0, width:14 }} />
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="db-content-pad" style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px' }}>
        {sinhalaText(tab === 'explore' && (dataLoading ? <Spinner /> : <ExploreTab projects={exploreProjects} user={user} lang={lang} />))}
        {sinhalaText(tab === 'quotes'  && (dataLoading ? <Spinner /> : <MyQuotesTab submittedBids={submittedBids} lang={lang} />))}
        {sinhalaText(tab === 'saved'   && (dataLoading ? <Spinner /> : <SavedTab savedProjects={savedProjects} user={user} setSavedProjects={setSavedProjects} lang={lang} />))}
        {sinhalaText(tab === 'profile' && <ProfileTab user={user} claimedProfile={claimedProfile} submission={submission} profileHref={profileHref} lang={lang} />)}
        {sinhalaText(tab === 'reviews' && (dataLoading ? <Spinner /> : <ReviewsTab reviews={reviews} profileHref={profileHref} lang={lang} />))}
      </div>
    </div>
  )
}

// ── Explore Projects Tab ──────────────────────────────────────────────────────
function ExploreTab({ projects, user, lang }) {
  const [typeFilter, setTypeFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [saving, setSaving] = useState(null)

  const T = { empty:'No projects found', allTypes:'All services', allDist:'All districts', contact:'📞 Contact', save:'🔖 Save', saved:'🔖 Saved' }

  useEffect(() => {
    if (!user?.id) return
    supabase.from('saved_projects').select('project_id').eq('provider_id', user.id)
      .then(({ data }) => { if (data) setSavedIds(new Set(data.map(s => s.project_id))) })
  }, [user?.id])

  async function toggleSave(e, projectId) {
    e.preventDefault()
    if (!user?.id) return
    setSaving(projectId)
    if (savedIds.has(projectId)) {
      await supabase.from('saved_projects').delete().eq('provider_id', user.id).eq('project_id', projectId)
      setSavedIds(prev => { const n = new Set(prev); n.delete(projectId); return n })
    } else {
      await supabase.from('saved_projects').insert({ provider_id: user.id, project_id: projectId })
      setSavedIds(prev => new Set([...prev, projectId]))
    }
    setSaving(null)
  }

  const types     = [...new Set(projects.map(p => p.project_type).filter(Boolean))]
  const districts = [...new Set(projects.map(p => p.district).filter(Boolean))]
  const filtered  = projects.filter(p =>
    (!typeFilter || p.project_type === typeFilter) &&
    (!districtFilter || p.district === districtFilter)
  )

  return (
    <div>
      {/* Filters */}
      {sinhalaText(projects.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', fontSize:13, background:'#fff', color:'var(--text)', cursor:'pointer' }}>
            <option value="">{sinhalaText(T.allTypes)}</option>
            {sinhalaText(types.map(t => <option key={t} value={t}>{sinhalaText(t)}</option>))}
          </select>
          <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', fontSize:13, background:'#fff', color:'var(--text)', cursor:'pointer' }}>
            <option value="">{sinhalaText(T.allDist)}</option>
            {sinhalaText(districts.map(d => <option key={d} value={d}>{sinhalaText(d)}</option>))}
          </select>
        </div>
      ))}

      {sinhalaText(filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{sinhalaText(T.empty)}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {sinhalaText(filtered.map(p => {
            const icon  = TYPE_ICON[p.project_type] || '🏠'
            const isSaved = savedIds.has(p.id)
            const phone = p.whatsapp
            const excerpt = p.description?.length > 120 ? p.description.slice(0,120)+'…' : p.description
            return (
              <div key={p.id} style={{ background:'#fff', borderRadius:16, border:'1px solid var(--border)', padding:'16px 18px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:20 }}>{sinhalaText(icon)}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sinhalaText(p.project_type)}</div>
                      {sinhalaText((p.city || p.district) && <div style={{ fontSize:11, color:'var(--text-3)' }}>📍 {sinhalaText(p.city)}{sinhalaText(p.district && p.district !== p.city ? `, ${p.district}` : '')}</div>)}
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-4)', whiteSpace:'nowrap', flexShrink:0 }}>{sinhalaText(timeAgo(p.created_at))}</span>
                </div>
                {sinhalaText(excerpt && <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, margin:'0 0 10px' }}>{sinhalaText(excerpt)}</p>)}
                {sinhalaText(p.budget_range && <div style={{ fontSize:11, color:'#22513B', fontWeight:600, marginBottom:10 }}>💰 {sinhalaText(p.budget_range)}</div>)}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {sinhalaText(phone && (
                    <a href={buildWhatsAppLink(phone, p.customer_name || '')} target="_blank" rel="noopener noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#25D366', color:'#fff', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                      {sinhalaText(T.contact)}
                    </a>
                  ))}
                  <button
                    onClick={e => toggleSave(e, p.id)}
                    disabled={saving === p.id}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, background: isSaved ? '#F7EFE9' : '#FBFAF8', color: isSaved ? '#C2542B' : 'var(--text-3)', border:`1px solid ${isSaved ? '#EDDFD5' : 'var(--border)'}`, borderRadius:8, padding:'7px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {sinhalaText(isSaved ? T.saved : T.save)}
                  </button>
                </div>
              </div>
            )
          }))}
        </div>
      ))}
    </div>
  )
}

// ── My Quotes Tab ─────────────────────────────────────────────────────────────
function MyQuotesTab({ submittedBids, lang }) {
  const T = { title:'Quotes You Submitted', empty:'No quotes yet', emptyDesc:'Browse the Explore tab and submit quotes to active projects.' }

  if (submittedBids.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{sinhalaText(T.empty)}</div>
      <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7 }}>{sinhalaText(T.emptyDesc)}</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{sinhalaText(T.title)} ({sinhalaText(submittedBids.length)})</div>
      {sinhalaText(submittedBids.map(bid => {
        const isNew = bid.status === 'new'
        const statusLabel = bid.status === 'accepted' ? '✓ Accepted' : bid.status === 'rejected' ? '✗ Rejected' : 'New'
        return (
          <div key={bid.id} style={{ padding:'16px 18px', background:'#fff', borderRadius:14, border:`1.5px solid ${isNew ? '#E7D9CE' : 'var(--border)'}`, borderLeft:`4px solid ${isNew ? '#f59e0b' : '#E4E0D9'}`, boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {sinhalaText(TYPE_ICON[bid.project?.project_type] || '🏠')} {sinhalaText(bid.project?.project_type || '—')} · 📍 {sinhalaText(bid.project?.city || bid.project?.district || '—')}
            </div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:6 }}>
              <div>
                {sinhalaText(bid.quote_amount && <span style={{ fontSize:14, fontWeight:700, color:'#22513B' }}>රු. {sinhalaText(Number(bid.quote_amount).toLocaleString())}</span>)}
                {sinhalaText(bid.timeline && <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:10 }}>· {sinhalaText(bid.timeline)}</span>)}
                <span style={{ fontSize:11, color:'var(--text-4)', marginLeft:8 }}>· {sinhalaText(timeAgo(bid.created_at))}</span>
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background: isNew ? '#F3E7DF' : '#EFEBE4', color: isNew ? '#2A2F35' : '#6B7076', whiteSpace:'nowrap', flexShrink:0 }}>{sinhalaText(statusLabel)}</span>
            </div>
            {sinhalaText(bid.message && <p style={{ fontSize:13, color:'#3A4046', lineHeight:1.6, margin:0 }}>{sinhalaText(bid.message.length > 200 ? bid.message.slice(0,200)+'…' : bid.message)}</p>)}
            {sinhalaText(bid.project && (
              <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
                <a href={jobPath({ ...bid.project, id: bid.job_id })}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'var(--terra)', background:'var(--terra-50)', border:'1px solid var(--navy-100)', borderRadius:8, padding:'8px 14px', textDecoration:'none', minHeight:36 }}>
                  ✏️ මගේ මිල ගණන සංස්කරණය කරන්න
                </a>
              </div>
            ))}
          </div>
        )
      }))}
    </div>
  )
}

// ── Saved Projects Tab ────────────────────────────────────────────────────────
function SavedTab({ savedProjects, user, setSavedProjects, lang }) {
  const T = { empty:'No saved projects', emptyDesc:'Tap 🔖 on any project in the Explore tab to save it here.', remove:'Remove', contact:'📞 Contact' }

  async function removeSaved(projectId) {
    await supabase.from('saved_projects').delete().eq('provider_id', user.id).eq('project_id', projectId)
    setSavedProjects(prev => prev.filter(s => s.project_id !== projectId))
  }

  if (savedProjects.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🔖</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{sinhalaText(T.empty)}</div>
      <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7 }}>{sinhalaText(T.emptyDesc)}</p>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {sinhalaText(savedProjects.map(sp => {
        const p = sp.projects || {}
        const icon = TYPE_ICON[p.project_type] || '🏠'
        const phone = p.whatsapp
        const excerpt = p.description?.length > 100 ? p.description.slice(0,100)+'…' : p.description
        return (
          <div key={sp.id} style={{ background:'#fff', borderRadius:16, border:'1px solid var(--border)', padding:'16px 18px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>{sinhalaText(icon)}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sinhalaText(p.project_type || '—')}</div>
                  {sinhalaText((p.city || p.district) && <div style={{ fontSize:11, color:'var(--text-3)' }}>📍 {sinhalaText(p.city)}{sinhalaText(p.district && p.district !== p.city ? `, ${p.district}` : '')}</div>)}
                </div>
              </div>
              <button onClick={() => removeSaved(sp.project_id)} style={{ fontSize:11, color:'#C0392B', background:'#FBEDEB', border:'1px solid #F2C9C3', borderRadius:7, padding:'4px 10px', cursor:'pointer', whiteSpace:'nowrap', fontWeight:600 }}>{sinhalaText(T.remove)}</button>
            </div>
            {sinhalaText(excerpt && <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, margin:'0 0 10px' }}>{sinhalaText(excerpt)}</p>)}
            {sinhalaText(p.budget_range && <div style={{ fontSize:11, color:'#22513B', fontWeight:600, marginBottom:10 }}>💰 {sinhalaText(p.budget_range)}</div>)}
            {sinhalaText(phone && (
              <a href={buildWhatsAppLink(phone, p.customer_name || '')} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#25D366', color:'#fff', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                {sinhalaText(T.contact)}
              </a>
            ))}
          </div>
        )
      }))}
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, claimedProfile, submission, profileHref, lang }) {
  const [showEditor, setShowEditor]     = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)

  const T = { viewProfile:'🔗 View Listing', editProfile:'✏️ Edit Profile', managePhotos:'📸 Photos', noProfile:'Not Listed', noProfileDesc:'Get listed on වැඩHUB to receive project enquiries.', join:'✅ Apply as Provider' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {sinhalaText(claimedProfile ? (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid var(--border)', padding:'20px 18px', boxShadow:'var(--shadow-sm)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{sinhalaText(claimedProfile.name)}</div>
              {sinhalaText((claimedProfile.city || claimedProfile.district) && <div style={{ fontSize:12, color:'var(--text-3)' }}>📍 {sinhalaText(claimedProfile.city || claimedProfile.district)}</div>)}
              {sinhalaText(claimedProfile.avg_rating > 0 && <div style={{ fontSize:12, color:'#f59e0b', marginTop:3 }}>⭐ {sinhalaText(Number(claimedProfile.avg_rating).toFixed(1))}</div>)}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {sinhalaText(profileHref && <a href={profileHref} target="_blank" rel="noopener" style={{ fontSize:12, fontWeight:600, color:'var(--navy)', background:'var(--navy-50)', border:'1px solid var(--navy-100)', borderRadius:8, padding:'7px 12px', textDecoration:'none', whiteSpace:'nowrap' }}>{sinhalaText(T.viewProfile)}</a>)}
              {sinhalaText(claimedProfile && <button onClick={() => setShowEditor(true)} style={{ fontSize:12, fontWeight:600, color:'#fff', background:'var(--navy)', border:'none', borderRadius:8, padding:'7px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>{sinhalaText(T.editProfile)}</button>)}
              {sinhalaText(claimedProfile && <button onClick={() => setShowPortfolio(true)} style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>{sinhalaText(T.managePhotos)}</button>)}
            </div>
          </div>
          {sinhalaText(showEditor && <ProfileEditor profile={claimedProfile} profileType="provider" userId={user.id} />)}
          {sinhalaText(showPortfolio && <PortfolioEditor profile={claimedProfile} profileType="provider" userId={user.id} />)}
        </div>
      ) : (
        <>
          <div style={{ textAlign:'center', padding:'36px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>👷</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{sinhalaText(T.noProfile)}</div>
            <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7, marginBottom:16 }}>{sinhalaText(T.noProfileDesc)}</p>
            <a href="/join-wedahub" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', background:'var(--navy)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>{sinhalaText(T.join)}</a>
          </div>
        </>
      ))}
      <ListingTab submission={submission} />
    </div>
  )
}

// ── Reviews Tab ───────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, profileHref, lang }) {
  const T = { empty:'No reviews yet', emptyDesc:'Share your profile link to receive reviews from customers.', shareProfile:'🔗 Share Profile' }

  if (reviews.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⭐</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{sinhalaText(T.empty)}</div>
      <p style={{ fontSize:13, color:'var(--text-3)', lineHeight:1.7, marginBottom:16 }}>{sinhalaText(T.emptyDesc)}</p>
      {sinhalaText(profileHref && <a href={profileHref} target="_blank" rel="noopener" style={{ fontSize:13, fontWeight:600, color:'var(--navy)', textDecoration:'none' }}>{sinhalaText(T.shareProfile)}</a>)}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {sinhalaText(reviews.map(r => {
        const stars = r.rating || r.stars || 5
        const name = r.reviewer_name || r.customer_name || 'Customer'
        const comment = r.comment || r.review_text || r.message || ''
        return (
          <div key={r.id} style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'16px 18px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ color:'#f59e0b', fontSize:14 }}>{sinhalaText('⭐'.repeat(Math.min(stars, 5)))}</span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{sinhalaText(name)}</span>
              <span style={{ fontSize:11, color:'var(--text-4)', marginLeft:'auto' }}>{sinhalaText(timeAgo(r.created_at))}</span>
            </div>
            {sinhalaText(comment && <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, margin:0 }}>{sinhalaText(comment)}</p>)}
          </div>
        )
      }))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONSUMER DASHBOARD
// ═══════════════════════════════════════════════════════════════════

function SavedProvidersTab({ userId }) {
  const [items, setItems] = useState(null)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    supabase.from('saved_providers')
      .select('id, provider_id, providers(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data || []))
  }, [userId])

  async function remove(savedId) {
    setRemoving(savedId)
    await supabase.from('saved_providers').delete().eq('id', savedId)
    setItems(prev => prev.filter(i => i.id !== savedId))
    setRemoving(null)
  }

  if (items === null) return <Spinner />

  if (items.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>❤️</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>තවම සුරැකි සේවා සපයන්නන් නැත</div>
      <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20, lineHeight:1.7 }}>සේවා සපයන්නන් බලා ❤️ ඔබා මෙහි සුරකින්න.</p>
      <a href="/providers" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'11px 22px', background:'var(--navy)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>
        සේවා සපයන්නන් බලන්න →
      </a>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {sinhalaText(items.map(item => {
        const p = item.providers
        if (!p) return null
        const rating = p.avg_rating
        return (
          <div key={item.id} style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'#C2542B', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' }}>
              {sinhalaText(p.profile_image
                ? <img src={p.profile_image} alt={sinhalaText(p.name)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (p.name || '?')[0].toUpperCase())
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sinhalaText(p.name)}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2, display:'flex', flexWrap:'wrap', gap:'0 8px' }}>
                {sinhalaText(rating > 0
                  ? <span style={{ color:'#C2542B' }}>⭐ {sinhalaText(Number(rating).toFixed(1))} ({sinhalaText(p.review_count || 0)})</span>
                  : <span style={{ color:'#8A8F95' }}>⭐ අලුත් · තවම සමාලෝචන නැත</span>)
                }
                {sinhalaText(p.city && <span>📍 {sinhalaText(p.city)}</span>)}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {sinhalaText(p.slug && (
                <a href={`/providers/${p.slug}`} style={{ fontSize:12, fontWeight:700, color:'var(--navy)', background:'#F7EFE9', borderRadius:8, padding:'6px 12px', textDecoration:'none', whiteSpace:'nowrap' }}>
                  බලන්න →
                </a>
              ))}
              <button
                onClick={() => remove(item.id)}
                disabled={removing === item.id}
                style={{ fontSize:12, fontWeight:700, color:'#C0392B', background:'#FBEDEB', border:'1px solid #F2C9C3', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}
              >
                {sinhalaText(removing === item.id ? '…' : '✕')}
              </button>
            </div>
          </div>
        )
      }))}
    </div>
  )
}

function ConsumerDashboard({ user, projects, bids, submission, dataLoading, showClaimedBanner }) {
  const initials = (user.email || user.phone || '?').split('@')[0].slice(0,2).toUpperCase()
  const [consumerTab, setConsumerTab] = useState('projects')

  const CONSUMER_TABS = [
    { id:'projects', label:'📋 My Projects' },
    { id:'saved',    label:'❤️ Saved Providers' },
  ]

  return (
    <div style={{ minHeight:'var(--th-fill)', background:'#FBFAF8' }}>
      <style>{sinhalaText(MOBILE_STYLES)}</style>

      {/* ── Consumer header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--border)' }}>
        <div className="db-header-pad" style={{ maxWidth:800, margin:'0 auto', padding:'20px 16px 0' }}>

          {sinhalaText(showClaimedBanner && (
            <div style={{ padding:'10px 14px', background:'#E9F1EC', border:'1px solid #C6DDCF', borderRadius:10, marginBottom:14 }}>
              <span style={{ fontSize:13, color:'#285C43', fontWeight:600 }}>✓ පැතිකඩ හිමිකම සාර්ථකව ලබාගත්තා!</span>
            </div>
          ))}

          {/* Identity row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="db-avatar" style={{ width:52, height:52, borderRadius:14, background:'var(--terra-50)', border:'2px solid rgba(194,84,43,0.2)', color:'var(--terra)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 }}>
                {sinhalaText(initials)}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-4)', letterSpacing:2, textTransform:'uppercase', marginBottom:2 }}>මගේ පාලන පුවරුව</div>
                <div className="db-profile-name" style={{ fontSize:16, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>නැවත සාදරයෙන් පිළිගනිමු</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'180px' }}>{sinhalaText(user.email || user.phone || '')}</div>
              </div>
            </div>

            <div className="db-identity-actions" style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <a href="/post-project" style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#fff', background:'var(--terra)', borderRadius:9, padding:'7px 14px', textDecoration:'none', whiteSpace:'nowrap' }}>
                📋 ව්‍යාපෘතියක් පළ කරන්න
              </a>
              <button
                onClick={async () => { await signOut(); window.location.href = '/' }}
                style={{ fontSize:12, color:'var(--text-3)', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}
              >ඉවත් වන්න</button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:4, borderBottom:'none' }}>
            {sinhalaText(CONSUMER_TABS.map(t => (
              <button key={t.id} onClick={() => setConsumerTab(t.id)} style={{ padding:'8px 16px', fontSize:13, fontWeight:700, border:'none', borderBottom: consumerTab === t.id ? '2px solid var(--terra)' : '2px solid transparent', background:'none', color: consumerTab === t.id ? 'var(--terra)' : 'var(--text-3)', cursor:'pointer', borderRadius:0, transition:'color 0.15s' }}>
                {sinhalaText(t.label)}
              </button>
            )))}
          </div>

        </div>
      </div>

      {/* ── Content ── */}
      <div className="db-content-pad" style={{ maxWidth:800, margin:'0 auto', padding:'20px 16px' }}>
        {sinhalaText(consumerTab === 'projects' && (
          <>
            {sinhalaText(dataLoading ? <Spinner /> : <ProjectsTab projects={projects} bids={bids} />)}
            {sinhalaText(!submission && (
              <div style={{ marginTop:28, padding:'20px 22px', background:'var(--navy-50)', border:'1px solid var(--navy-100)', borderRadius:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)', marginBottom:4 }}>ඔබ ටයිල් කාර්මිකයෙක් හෝ කොන්ත්‍රාත්කරුවෙක්ද?</div>
                <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:12, lineHeight:1.65 }}>
                  වැඩHUB හි ඔබේ සේවා ලැයිස්තුගත කරන්න. නිවාස හිමියන් ඔබව සොයා WhatsApp හරහා සෘජුව අමතයි.
                </p>
                <a href="/join-wedahub" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'var(--navy)', color:'#fff', borderRadius:9, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                  ✅ සේවා සපයන්නෙකු ලෙස අයදුම් කරන්න →
                </a>
              </div>
            ))}
          </>
        ))}
        {sinhalaText(consumerTab === 'saved' && <SavedProvidersTab userId={user.id} />)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Spinner({ full }) {
  return (
    <div style={{ ...(full ? { minHeight:'var(--th-fill)' } : { padding:40 }), display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div className="spinner" style={{ margin:'0 auto 10px', borderColor:'rgba(20,23,26,0.15)', borderTopColor:'var(--navy)' }} />
        <p style={{ fontSize:13, color:'var(--text-3)' }}>පූරණය…</p>
      </div>
    </div>
  )
}

function SignInPrompt() {
  return (
    <div style={{ minHeight:'var(--th-fill)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ fontSize:56, marginBottom:14 }}>🔒</div>
        <h2 style={{ fontFamily:"var(--th-display)", fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:10 }}>ඔබේ ගිණුමට පිවිසෙන්න</h2>
        <p style={{ fontSize:14, color:'var(--text-3)', lineHeight:1.7, marginBottom:24 }}>
          සේවා සපයන්නන්: ව්‍යාපෘති සොයා ඔබේ පැතිකඩ කළමනාකරණය කරන්න.<br/>නිවාස හිමියන්: ඔබේ ව්‍යාපෘති සහ මිල ගණන් බලන්න.
        </p>
        <a href="/login" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'12px 28px', background:'var(--navy)', color:'#fff', borderRadius:12, fontSize:14, fontWeight:700, textDecoration:'none' }}>
          පිවිසෙන්න →
        </a>
      </div>
    </div>
  )
}

function BidsPanel({ projectBids }) {
  const [open, setOpen] = useState(false)
  const [providerMap, setProviderMap] = useState({})

  useEffect(() => {
    if (!open) return
    const slugs = [...new Set(projectBids.map(b => b.provider_slug).filter(Boolean))]
    if (slugs.length === 0) return
    supabase.from('providers')
      .select('slug, profile_image, avg_rating, review_count, city, provider_type')
      .in('slug', slugs)
      .then(({ data }) => {
        if (data) {
          const m = {}
          for (const p of data) m[p.slug] = p
          setProviderMap(m)
        }
      })
  }, [open])

  if (!projectBids?.length) return (
    <div style={{ marginTop:12, padding:'12px 14px', background:'#FBFAF8', borderRadius:10, fontSize:12, color:'#8A8F95' }}>
      💬 තවම මිල ගණන් නැත. ඔබේ ව්‍යාපෘතිය පළ කර ඇති අතර සියලු සේවා සපයන්නන්ට පෙනේ.
    </div>
  )

  const newCount = projectBids.filter(b => b.status === 'new').length

  return (
    <div style={{ marginTop:12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, fontWeight:700, color:'#C2542B' }}>
        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background: newCount > 0 ? '#f59e0b' : '#E4E0D9', color: newCount > 0 ? '#fff' : '#6B7076', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
          {sinhalaText(projectBids.length)}
        </span>
        {sinhalaText(projectBids.length)} ලංසුව{sinhalaText(projectBids.length !== 1 ? 's' : '')} ලැබී ඇත
        {sinhalaText(newCount > 0 && <span style={{ fontSize:11, color:'#f59e0b', fontWeight:700 }}>· {sinhalaText(newCount)} අලුත්</span>)}
        <span style={{ fontSize:14, color:'#8A8F95' }}>{sinhalaText(open ? '▲' : '▼')}</span>
      </button>

      {sinhalaText(open && (
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
          {sinhalaText(projectBids.map(bid => (
            <BidCard key={bid.id} bid={bid} provider={bid.provider_slug ? providerMap[bid.provider_slug] : null} />
          )))}
        </div>
      ))}
    </div>
  )
}

function ProjectsTab({ projects, bids, isProvider }) {
  const STATUS_COLOR = {
    pending_review: { bg:'#F3E7DF', color:'#2A2F35', label:'Under Review' },
    active:         { bg:'#E9F1EC', color:'#22513B', label:'Active'        },
    matched:        { bg:'#F7EFE9', color:'#7A3218', label:'Matched'       },
    completed:      { bg:'#F4F1EC', color:'#3A4046', label:'Completed'     },
  }

  if (projects.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>තවම ව්‍යාපෘති නැත</div>
      <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20, lineHeight:1.7 }}>
        {sinhalaText(isProvider
          ? "You haven't posted any projects. Post a tiling project to receive quotes."
          : 'Post a tiling project — providers will submit quotes and you choose who to work with.')}
      </p>
      <a href="/post-project" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'11px 22px', background:'var(--terra)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>
        📋 ව්‍යාපෘතියක් පළ කරන්න
      </a>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {sinhalaText(projects.map(p => {
        const s = STATUS_COLOR[p.status] || STATUS_COLOR.pending_review
        return (
          <div key={p.id} style={{ padding:20, background:'#fff', border:'1px solid var(--border)', borderRadius:16, boxShadow:'var(--shadow-sm)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:3 }}>{sinhalaText(p.project_type)}</div>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>📍 {sinhalaText(p.city)}{sinhalaText(p.district?`, ${p.district}`:'')}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.color, whiteSpace:'nowrap', flexShrink:0 }}>{sinhalaText(s.label)}</span>
            </div>
            <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, margin:0 }}>{sinhalaText(p.description)}</p>
            {sinhalaText(p.budget_range && <div style={{ fontSize:11, color:'var(--text-4)', marginTop:8 }}>💰 අයවැය: {sinhalaText(p.budget_range)}</div>)}
            {sinhalaText(p.created_at   && <div style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>පළ කළ දිනය {sinhalaText(new Date(p.created_at).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'}))}</div>)}
            <BidsPanel projectBids={bids[p.id] || []} />
          </div>
        )
      }))}
      <div style={{ textAlign:'center', paddingTop:8 }}>
        <a href="/post-project" style={{ fontSize:13, color:'var(--navy)', fontWeight:600, textDecoration:'none' }}>+ තවත් ව්‍යාපෘතියක් පළ කරන්න</a>
      </div>
    </div>
  )
}

function ListingTab({ submission }) {
  const STATUS = {
    pending_review: { bg:'#F3E7DF', color:'#2A2F35', label:'Under Review', desc:"Your application is being reviewed. We'll contact you via WhatsApp within 1-2 business days." },
    approved:       { bg:'#E9F1EC', color:'#22513B', label:'Approved',      desc:'Your application has been approved. Your listing is being set up.'                            },
    listed:         { bg:'#F7EFE9', color:'#7A3218', label:'Listed',        desc:"You're live on වැඩHUB! Customers can find and contact you."                               },
    rejected:       { bg:'#FBEDEB', color:'#8E2A1F', label:'Not Approved',  desc:'Your application was not approved. Contact us for details.'                                  },
  }

  if (!submission) return (
    <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:16, border:'1px solid var(--border)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>👷</div>
      <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:8 }}>ලැයිස්තුගත කර නැත</div>
      <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20, lineHeight:1.7 }}>
        වැඩHUB හි ඔබේ සේවා ලැයිස්තුගත කිරීමට අයදුම් කර නොමිලේ විමසුම් ලබාගන්න.
      </p>
      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
        <a href="/join-wedahub" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'11px 22px', background:'var(--navy)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none' }}>✅ සේවා සපයන්නෙකු ලෙස අයදුම් කරන්න</a>
        <a href="/providers"      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'11px 22px', background:'var(--surface-3)', color:'var(--text-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, fontWeight:600, textDecoration:'none' }}>සේවා නාමාවලිය බලන්න</a>
      </div>
    </div>
  )

  const s = STATUS[submission.status] || STATUS.pending_review

  return (
    <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:16, padding:24, boxShadow:'var(--shadow-sm)' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{sinhalaText(submission.name)}</div>
          <div style={{ fontSize:12, color:'var(--text-3)' }}>📍 {sinhalaText(submission.city)}{sinhalaText(submission.district?`, ${submission.district}`:'')}</div>
        </div>
        <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>{sinhalaText(s.label)}</span>
      </div>
      <div style={{ padding:'12px 16px', background:s.bg, borderRadius:10, marginBottom:16 }}>
        <p style={{ fontSize:13, color:s.color, margin:0, lineHeight:1.6 }}>{sinhalaText(s.desc)}</p>
      </div>
      {sinhalaText((submission.services||[]).length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>සේවාවන්</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {sinhalaText(submission.services.map(sv => <span key={sv} className="chip chip-navy" style={{ fontSize:11 }}>{sinhalaText(sv)}</span>))}
          </div>
        </div>
      ))}
      <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid var(--border)' }}>
        <a href={`https://wa.me/94774503744?text=Hi වැඩHUB, I applied as a provider (${submission.name}) and want to check my listing status.`} target="_blank" rel="noopener" style={{ fontSize:12, fontWeight:600, color:'#2F6B4F', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
          💬 WhatsApp හරහා වැඩHUB අමතන්න
        </a>
      </div>
    </div>
  )
}
